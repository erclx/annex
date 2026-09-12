"""Every provision the reference graph knows has to resolve in the export.

A parser change that drops a node from the graph would otherwise fail
silently in the reading view: a citation would point at an id the panel
cannot find, discovered only by clicking it.
"""

import json
from pathlib import Path

from annex.corpus.export import export, fixture_filename
from annex.corpus.graph import build
from annex.corpus.models import Corpus
from annex.corpus.sources import CorpusVersion


def _exported_ids(out: Path, version: CorpusVersion) -> set[str]:
    data = json.loads((out / fixture_filename(version)).read_text())
    return {entry['id'] for entry in data}


class TestExport:
    def test_writes_one_file_per_version(
        self, original: Corpus, consolidated: Corpus, tmp_path: Path
    ) -> None:
        export(
            {
                CorpusVersion.ORIGINAL: original,
                CorpusVersion.CONSOLIDATED: consolidated,
            },
            out=tmp_path,
        )

        assert (tmp_path / fixture_filename(CorpusVersion.ORIGINAL)).exists()
        assert (tmp_path / fixture_filename(CorpusVersion.CONSOLIDATED)).exists()

    def test_writes_a_manifest_naming_the_commit(
        self, original: Corpus, tmp_path: Path
    ) -> None:
        manifest = export({CorpusVersion.ORIGINAL: original}, out=tmp_path)

        assert manifest.commit
        assert manifest.exported_at

    def test_carries_the_reader_facing_citation_label(
        self, original: Corpus, tmp_path: Path
    ) -> None:
        export({CorpusVersion.ORIGINAL: original}, out=tmp_path)

        data = json.loads(
            (tmp_path / fixture_filename(CorpusVersion.ORIGINAL)).read_text()
        )
        entry = next(item for item in data if item['id'] == 'art_6')

        assert entry['citation'] == 'Article 6'

    def test_every_node_the_graph_knows_resolves_in_the_export(
        self, original: Corpus, tmp_path: Path
    ) -> None:
        graph = build(original)
        export({CorpusVersion.ORIGINAL: original}, out=tmp_path)

        exported = _exported_ids(tmp_path, CorpusVersion.ORIGINAL)

        assert set(graph.nodes) <= exported

    def test_every_node_the_graph_knows_resolves_in_the_amended_export(
        self, consolidated: Corpus, tmp_path: Path
    ) -> None:
        graph = build(consolidated)
        export({CorpusVersion.CONSOLIDATED: consolidated}, out=tmp_path)

        exported = _exported_ids(tmp_path, CorpusVersion.CONSOLIDATED)

        assert set(graph.nodes) <= exported
