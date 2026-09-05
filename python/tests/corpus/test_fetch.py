"""The cached documents are read from disk and the network is left alone."""

from pathlib import Path

import httpx
import pytest

from annex.corpus import fetch as fetch_module
from annex.corpus.fetch import SourceUnavailableError, cache_path, fetch, read_cached
from annex.corpus.sources import CONSOLIDATED, ORIGINAL, Source


def refuse_network(*args: object, **kwargs: object) -> httpx.Response:
    raise AssertionError('the cache should have answered without a request')


def make_absent_source() -> Source:
    return Source(
        version=ORIGINAL.version,
        url='https://example.invalid/none',
        cache_name='absent.html',
        articles=0,
        annexes=0,
        recitals=0,
        paragraphs=0,
    )


class TestCache:
    def test_both_documents_are_committed(self) -> None:
        assert cache_path(ORIGINAL).is_file()
        assert cache_path(CONSOLIDATED).is_file()

    def test_a_cached_document_is_read_without_a_request(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(httpx, 'get', refuse_network)

        document = fetch(ORIGINAL)

        assert document.startswith(b'<')

    def test_the_document_is_returned_as_bytes(self) -> None:
        document = read_cached(CONSOLIDATED)

        assert isinstance(document, bytes)

    def test_an_unfetched_source_reads_as_missing(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.setattr(fetch_module, 'CACHE_DIR', tmp_path)

        assert read_cached(make_absent_source()) is None


class TestRefresh:
    def test_a_failed_refresh_leaves_the_committed_document_intact(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def refuse(*args: object, **kwargs: object) -> httpx.Response:
            raise httpx.ConnectError('no route')

        before = cache_path(ORIGINAL).read_bytes()
        monkeypatch.setattr(httpx, 'get', refuse)

        with pytest.raises(SourceUnavailableError):
            fetch(ORIGINAL, refresh=True)

        assert cache_path(ORIGINAL).read_bytes() == before


class TestFailure:
    def test_an_unreachable_source_raises_with_its_url(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        def refuse(*args: object, **kwargs: object) -> httpx.Response:
            raise httpx.ConnectError('no route')

        monkeypatch.setattr(fetch_module, 'CACHE_DIR', tmp_path)
        monkeypatch.setattr(httpx, 'get', refuse)

        with pytest.raises(SourceUnavailableError, match='example.invalid'):
            fetch(make_absent_source())
