"""Command line entry for the corpus side.

`uv run python -m annex ingest` fetches and parses both versions and checks the
structure. `uv run python -m annex graph` reports the reference predicate and
what it yields, rather than asserting a figure nobody can reproduce.
`uv run python -m annex schema` writes the answer contract the web half
generates its types from, so neither side hand-copies the other's shape.
"""

import argparse
import json
import logging
import sys

from annex.answer import Answer
from annex.corpus import (
    PREDICATE,
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
    loaded = OllamaClient(settings).verify_context()
    print(f'{settings.generation_model} num_ctx={loaded}')
    print(f'{settings.embedding_model} context={settings.embedding_context}')
    return 0


def _embed(refresh: bool) -> int:
    settings = Settings()
    client = OllamaClient(settings)
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

    searching = subcommands.add_parser('search', help='search one version by meaning')
    searching.add_argument('question')
    searching.add_argument(
        '--version', type=CorpusVersion, default=CorpusVersion.CONSOLIDATED
    )
    searching.add_argument('--k', type=int, default=Settings().search_k)

    arguments = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')

    try:
        if arguments.command == 'ingest':
            return _ingest(arguments.refresh)
        if arguments.command == 'schema':
            return _schema()
        if arguments.command == 'context':
            return _context()
        if arguments.command == 'embed':
            return _embed(arguments.refresh)
        if arguments.command == 'search':
            return _search(arguments.question, arguments.version, arguments.k)
        return _graph(arguments.refresh)
    except CorpusCheckError as error:
        print(f'corpus check failed: {error}', file=sys.stderr)
        return 1
    except (ModelContextError, EmbeddingTruncatedError) as error:
        print(f'{error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
