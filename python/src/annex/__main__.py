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

    arguments = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING, format='%(levelname)s %(message)s')

    try:
        if arguments.command == 'ingest':
            return _ingest(arguments.refresh)
        if arguments.command == 'schema':
            return _schema()
        return _graph(arguments.refresh)
    except CorpusCheckError as error:
        print(f'corpus check failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
