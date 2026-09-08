"""Command line entry for the corpus side.

`uv run python -m annex ingest` fetches and parses both versions and checks the
structure. `uv run python -m annex graph` reports the reference predicate and
what it yields, rather than asserting a figure nobody can reproduce.
`uv run python -m annex schema` writes the answer contract the web half
generates its types from, so neither side hand-copies the other's shape.
`uv run python -m annex evaluate` answers the gold question set with all three
arms and reports accuracy and cost for each, which is the number this project
exists to produce. It is a multi-hour run at full size: see `--limit`, `--arm`
and `--version`, and `docs/evaluation.md` for what a run costs.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

from annex.answer import Answer
from annex.corpus import (
    PREDICATE,
    Corpus,
    CorpusCheckError,
    CorpusVersion,
    ProvisionKind,
    build,
    disagreements,
    extract,
    load,
    verify,
)
from annex.llm import ModelContextError, OllamaClient
from annex.retrieval import (
    INDEX_PATH,
    EmbeddingTruncatedError,
    chunk,
    embed,
    search,
    source_provisions,
    write,
)
from annex.settings import Settings

logger = logging.getLogger('annex')


def _ingest(refresh: bool) -> int:
    failures: list[str] = []
    for version in CorpusVersion:
        corpus = load(version, refresh=refresh)
        counts = ' '.join(
            f'{label}={len(corpus.of_kind(kind))}'
            for kind, label in (
                (ProvisionKind.ARTICLE, 'articles'),
                (ProvisionKind.ANNEX, 'annexes'),
                (ProvisionKind.RECITAL, 'recitals'),
                (ProvisionKind.PARAGRAPH, 'paragraphs'),
            )
        )
        found = disagreements(corpus)
        status = 'ok' if not found else 'MISMATCH'
        print(f'{version:13} {counts}  [{status}]')
        failures.extend(found)

    if failures:
        for line in failures:
            print(f'  {line}', file=sys.stderr)
        return 1
    return 0


def _graph(refresh: bool) -> int:
    print(f'Predicate: {PREDICATE}\n')
    for version in CorpusVersion:
        corpus = load(version, refresh=refresh)
        verify(corpus)
        references = extract(corpus)
        graph = build(corpus, references)
        print(
            f'{version:13} nodes={graph.node_count():4} '
            f'edges={graph.edge_count():4} references={len(references):4}'
        )
    return 0


def _schema() -> int:
    print(json.dumps(Answer.model_json_schema(), indent=2, sort_keys=True))
    return 0


def _context() -> int:
    settings = Settings()
    client = OllamaClient(settings)
    generation = client.verify_context()
    embedding = client.verify_embedding_context()
    print(f'{settings.generation_model} num_ctx={generation}')
    print(f'{settings.embedding_model} context={embedding}')
    print('both read back from the models rather than from settings')
    return 0


def _embed(refresh: bool) -> int:
    settings = Settings()
    client = OllamaClient(settings)
    client.verify_embedding_context()
    for version in CorpusVersion:
        corpus = load(version, refresh=refresh)
        chunks = chunk(corpus)
        embedded = embed(chunks, client=client, settings=settings)
        written = write(version, embedded)
        print(
            f'{version:13} chunks={written:4} '
            f'provisions={len(source_provisions(chunks)):4}'
        )
    print(f'index at {INDEX_PATH}')
    return 0


def _search(question: str, version: CorpusVersion, k: int) -> int:
    for hit in search(question, version, k):
        print(f'{hit.distance:7.4f}  {hit.chunk_id:14} {hit.citation}')
    return 0


def _ask(question: str, version: CorpusVersion, traversal: bool) -> int:
    from annex.agent import Pipeline

    answer = Pipeline().ask(question, version=version, traversal=traversal)
    print(answer.model_dump_json(indent=2))
    return 0


def _serve() -> int:
    """Serve the answer endpoint the web half calls.

    Imported here rather than at module scope for the reason `_arms` gives:
    reaching the service pulls in FastAPI and compiles a LangGraph, and
    `annex ingest` should not pay for either.

    The pipeline is built inside the app's lifespan rather than here, so a
    model that is not up leaves the service serving the `unavailable` state
    instead of refusing to boot.
    """
    import uvicorn

    from annex.service import create_app

    settings = Settings()
    logger.info('serving on http://%s:%d', settings.service_host, settings.service_port)
    uvicorn.run(
        create_app(settings=settings),
        host=settings.service_host,
        port=settings.service_port,
        log_level='warning',
    )
    return 0


ARM_NAMES = ('full-context', 'search-only', 'search-traversal')
"""The three arms, in the order the report reads best.

The baseline first because it is what the other two have to earn their place
against, and search alone before search plus traversal because the second is
the first with one switch thrown.
"""


def _arms(
    names: list[str],
    corpora: dict[CorpusVersion, Corpus],
    settings: Settings,
) -> list[object]:
    """Build the named arms, sharing one pipeline between the retrieval two.

    Imported here rather than at module scope because two of the three compile
    a LangGraph, and `annex ingest` should not pay for that.
    """
    from annex.agent import Pipeline
    from annex.eval.arms import full_context, search_only, search_traversal

    built: list[object] = []
    pipeline: Pipeline | None = None
    for name in names:
        if name == 'full-context':
            built.append(full_context.FullContextArm(corpora, settings=settings))
            continue
        if pipeline is None:
            pipeline = Pipeline(settings=settings, corpora=corpora)
        module = search_only if name == search_only.NAME else search_traversal
        built.append(module.build(pipeline))
    return built


def _evaluate(
    names: list[str],
    versions: list[CorpusVersion],
    limit: int | None,
    report_only: bool,
    questions_only: bool,
    results_path: Path | None = None,
    label: str | None = None,
) -> int:
    """Run the arms over the question set, or re-read a run that already ran."""
    from annex.eval import (
        QUESTIONS,
        RESULTS_PATH,
        depth_rows,
        read_results,
        render,
        run,
        run_path,
        write_questions,
    )
    from annex.eval.runner import Result

    emitted = write_questions()
    print(f'question set at {emitted}', file=sys.stderr)
    if questions_only:
        return 0

    written = results_path or RESULTS_PATH
    kept: Path | None = None
    if label is not None:
        try:
            kept = run_path(label, written)
        except ValueError as error:
            print(f'{error}', file=sys.stderr)
            return 1

    corpora = {version: load(version) for version in CorpusVersion}
    results: tuple[Result, ...]
    if report_only:
        if kept is not None:
            print(
                f'--label {label} ignored: rendering a report is not a run, so '
                'there is nothing new to keep',
                file=sys.stderr,
            )
        results = read_results(written)
    else:
        questions = QUESTIONS[:limit] if limit else QUESTIONS
        results = run(
            _arms(names, corpora, Settings()),  # type: ignore[arg-type]
            corpora,
            questions=questions,
            versions=versions,
            results_path=written,
            label=label,
        )
        print(f'results at {written}', file=sys.stderr)
        if kept is not None:
            print(f'kept as {kept}', file=sys.stderr)

    print(render(results, depth_rows(results, corpora)))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog='annex')
    parser.add_argument(
        '--refresh',
        action='store_true',
        help='re-fetch each document rather than reading the cache',
    )
    subcommands = parser.add_subparsers(dest='command', required=True)
    subcommands.add_parser('ingest', help='fetch, parse and check both versions')
    subcommands.add_parser('graph', help='report the reference predicate and its yield')
    subcommands.add_parser('schema', help='write the answer JSON Schema to stdout')
    subcommands.add_parser('context', help='report the context the models carry')
    subcommands.add_parser('embed', help='chunk both versions and build the index')
    subcommands.add_parser('serve', help='serve the answer endpoint over HTTP')

    searching = subcommands.add_parser('search', help='search one version by meaning')
    searching.add_argument('question')
    searching.add_argument(
        '--version', type=CorpusVersion, default=CorpusVersion.CONSOLIDATED
    )
    searching.add_argument('--k', type=int, default=Settings().search_k)

    asking = subcommands.add_parser('ask', help='answer a described system')
    asking.add_argument('description')
    asking.add_argument(
        '--version', type=CorpusVersion, default=CorpusVersion.CONSOLIDATED
    )
    asking.add_argument(
        '--no-traversal',
        action='store_true',
        help='search without following the citations outward',
    )

    evaluating = subcommands.add_parser(
        'evaluate', help='run the three arms over the gold question set'
    )
    evaluating.add_argument(
        '--arm',
        dest='arms',
        action='append',
        choices=ARM_NAMES,
        help='run one arm, repeatable. Every arm by default',
    )
    evaluating.add_argument(
        '--version',
        dest='versions',
        action='append',
        type=CorpusVersion,
        help='run one version, repeatable. Both by default',
    )
    evaluating.add_argument(
        '--limit', type=int, help='answer only the first N questions of the set'
    )
    evaluating.add_argument(
        '--report-only',
        action='store_true',
        help='render the report from the last run rather than running again',
    )
    evaluating.add_argument(
        '--questions-only',
        action='store_true',
        help='write the question set as data and stop',
    )
    evaluating.add_argument(
        '--results',
        type=Path,
        help=(
            'write to this file rather than the tracked one, so a narrowed '
            'sweep or a timing probe does not overwrite a full run'
        ),
    )
    evaluating.add_argument(
        '--label',
        help=(
            'also keep this run under data/eval/runs/<label>.json, so the run '
            'before it survives. Letters, digits, dots, dashes, underscores'
        ),
    )

    arguments = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING, format='%(levelname)s %(message)s')
    logger.setLevel(logging.INFO)

    try:
        if arguments.command == 'ingest':
            return _ingest(arguments.refresh)
        if arguments.command == 'schema':
            return _schema()
        if arguments.command == 'context':
            return _context()
        if arguments.command == 'embed':
            return _embed(arguments.refresh)
        if arguments.command == 'serve':
            return _serve()
        if arguments.command == 'search':
            return _search(arguments.question, arguments.version, arguments.k)
        if arguments.command == 'ask':
            return _ask(
                arguments.description, arguments.version, not arguments.no_traversal
            )
        if arguments.command == 'evaluate':
            return _evaluate(
                list(arguments.arms or ARM_NAMES),
                list(arguments.versions or CorpusVersion),
                arguments.limit,
                arguments.report_only,
                arguments.questions_only,
                arguments.results,
                arguments.label,
            )
        return _graph(arguments.refresh)
    except CorpusCheckError as error:
        print(f'corpus check failed: {error}', file=sys.stderr)
        return 1
    except (ModelContextError, EmbeddingTruncatedError) as error:
        print(f'{error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
