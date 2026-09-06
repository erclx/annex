"""The vector index, as one SQLite file beside the corpus cache.

`sqlite-vec` rather than `pgvector`, settled by measurement rather than by
preference and recorded in `.claude/ARCHITECTURE.md`. It was exercised on this
interpreter rather than assumed, which is the check `networkx` failed:
`sqlite_vec` 0.1.9 loads on Python 3.14.1, `vec_version()` returns `v0.1.9`,
and a `vec0` virtual table over `float[768]` is created against SQLite 3.50.4.

Roughly 1300 chunks across both versions at 768 dimensions is a few megabytes
in one file. A service and a connection string buy operational realism nobody
is going to exercise inside this project's window.

One table per version, because the two documents are different corpora rather
than two revisions of one. The original carries 180 recitals and the
consolidated carries none, so a version-agnostic search returns results that
cannot exist on the other side.
"""

import sqlite3
import struct
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import sqlite_vec

from annex.corpus import CorpusVersion
from annex.retrieval.chunks import Chunk

DIMENSIONS = 768
INDEX_PATH = Path(__file__).resolve().parents[3] / 'data' / 'index' / 'annex.db'


@dataclass(frozen=True)
class Hit:
    """One chunk the index returned, and how far it sat from the question."""

    chunk_id: str
    provision_id: str
    citation: str
    text: str
    distance: float


def _table(version: CorpusVersion) -> str:
    return f'chunks_{version.value}'


def _pack(vector: list[float]) -> bytes:
    return struct.pack(f'{len(vector)}f', *vector)


@contextmanager
def connect(
    path: Path = INDEX_PATH, *, read_only: bool = True
) -> Iterator[sqlite3.Connection]:
    """Open the index with the vector extension loaded.

    Read-only by default. Search runs far more often than ingest, and the one
    writer is `annex embed`, so the default that costs nothing to get wrong is
    the one that cannot write.
    """
    if read_only:
        if not path.exists():
            raise FileNotFoundError(
                f'no index at {path}. Run: uv run python -m annex embed'
            )
        connection = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)

    connection.enable_load_extension(True)
    sqlite_vec.load(connection)
    connection.enable_load_extension(False)
    try:
        yield connection
    finally:
        connection.close()


def _require_table(
    connection: sqlite3.Connection,
    table: str,
    version: CorpusVersion,
    path: Path,
) -> None:
    """Refuse a version the index does not hold, by name.

    `write` commits one version at a time, so an ingest interrupted between the
    two leaves a file that opens, reads one version, and answers the other with
    a bare `no such table`.
    """
    found = connection.execute(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?",
        (table,),
    ).fetchone()
    if found is None:
        raise FileNotFoundError(
            f'the index at {path} holds no {version} table. '
            'Run: uv run python -m annex embed'
        )


def write(
    version: CorpusVersion,
    embedded: list[tuple[Chunk, list[float]]],
    *,
    path: Path = INDEX_PATH,
) -> int:
    """Replace one version's table with the chunks given. Returns the count.

    Replaced rather than appended. The index is derived, rebuilding it is
    cheap, and a half-updated table is the state nothing downstream can detect.
    """
    with connect(path, read_only=False) as connection:
        table = _table(version)
        connection.execute(f'DROP TABLE IF EXISTS {table}')
        connection.execute(f'DROP TABLE IF EXISTS {table}_meta')
        connection.execute(
            f'CREATE VIRTUAL TABLE {table} USING vec0(embedding float[{DIMENSIONS}])'
        )
        connection.execute(
            f'CREATE TABLE {table}_meta ('
            'rowid INTEGER PRIMARY KEY, chunk_id TEXT NOT NULL, '
            'provision_id TEXT NOT NULL, citation TEXT NOT NULL, text TEXT NOT NULL)'
        )
        for rowid, (chunk, vector) in enumerate(embedded, start=1):
            connection.execute(
                f'INSERT INTO {table}(rowid, embedding) VALUES (?, ?)',
                (rowid, _pack(vector)),
            )
            connection.execute(
                f'INSERT INTO {table}_meta VALUES (?, ?, ?, ?, ?)',
                (
                    rowid,
                    chunk.chunk_id,
                    chunk.provision_id,
                    chunk.citation,
                    chunk.text,
                ),
            )
        connection.commit()
    return len(embedded)


def nearest(
    version: CorpusVersion,
    vector: list[float],
    k: int,
    *,
    path: Path = INDEX_PATH,
) -> tuple[Hit, ...]:
    """The k chunks closest to one vector, nearest first."""
    table = _table(version)
    with connect(path) as connection:
        _require_table(connection, table, version, path)
        rows = connection.execute(
            f'SELECT m.chunk_id, m.provision_id, m.citation, m.text, v.distance '
            f'FROM {table} v JOIN {table}_meta m ON m.rowid = v.rowid '
            f'WHERE v.embedding MATCH ? AND k = ? ORDER BY v.distance',
            (_pack(vector), k),
        ).fetchall()
    return tuple(
        Hit(
            chunk_id=row[0],
            provision_id=row[1],
            citation=row[2],
            text=row[3],
            distance=row[4],
        )
        for row in rows
    )
