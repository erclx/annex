"""Fetch each source document once and read it from disk thereafter.

The cached documents are committed, so an ordinary run never reaches the
network and the parse tests are identical everywhere.
"""

import logging
from pathlib import Path

import httpx

from annex.corpus.sources import SOURCES, CorpusVersion, Source

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parents[3] / 'data' / 'corpus'

REQUEST_TIMEOUT_SECONDS = 60.0


class SourceUnavailableError(RuntimeError):
    """A document was neither cached nor retrievable."""


def cache_path(source: Source) -> Path:
    return CACHE_DIR / source.cache_name


def read_cached(source: Source) -> bytes | None:
    """Return the cached document, or None where it has not been fetched."""
    path = cache_path(source)
    return path.read_bytes() if path.is_file() else None


def fetch(source: Source, *, refresh: bool = False) -> bytes:
    """Return the document as bytes, fetching it only when the cache misses.

    Bytes rather than text on purpose. The documents carry an XML encoding
    declaration and `lxml` refuses a decoded string that does.
    """
    if not refresh:
        cached = read_cached(source)
        if cached is not None:
            logger.info('corpus.cache.hit version=%s', source.version)
            return cached

    logger.info('corpus.fetch.start version=%s url=%s', source.version, source.url)
    try:
        response = httpx.get(
            source.url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            follow_redirects=True,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        logger.error('corpus.fetch.failed version=%s', source.version)
        raise SourceUnavailableError(
            f'Could not fetch the {source.version} text from {source.url}'
        ) from error

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path(source).write_bytes(response.content)
    logger.info(
        'corpus.fetch.done version=%s bytes=%d',
        source.version,
        len(response.content),
    )
    return response.content


def fetch_all(*, refresh: bool = False) -> dict[CorpusVersion, bytes]:
    return {
        version: fetch(source, refresh=refresh) for version, source in SOURCES.items()
    }
