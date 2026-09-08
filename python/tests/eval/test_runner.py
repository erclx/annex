"""What a run leaves on disk, and what a label is allowed to be.

The sweep is a multi-hour unattended run whose output is the deliverable, so
the two things asserted here are that a new run does not destroy the one before
it and that a `Result` recorded before the query field reads back. Neither
needs a model: a `Result` is built directly, since what is under test is the
writing rather than the answering.
"""

import json
from pathlib import Path

import pytest

from annex.corpus import CorpusVersion
from annex.eval.questions import by_id
from annex.eval.runner import Result, read_results, run_path, write_results

CHATBOT = by_id('q01-support-chatbot')


def make_result(arm: str = 'search-only', query: str = 'transparency duties') -> Result:
    return Result(
        question_id=CHATBOT.id,
        flow=CHATBOT.flow,
        arm=arm,
        version=CorpusVersion.CONSOLIDATED,
        call_index=0,
        query=query,
        searched_ids=('art_50',),
        recall=1.0,
    )


class TestTheRunHistory:
    def test_a_labelled_run_is_kept_under_its_own_name(self, tmp_path: Path) -> None:
        current = tmp_path / 'results.json'

        write_results([make_result()], current, label='v0.9-arctic')

        assert read_results(tmp_path / 'runs' / 'v0.9-arctic.json')

    def test_the_previous_run_survives_the_next_one(self, tmp_path: Path) -> None:
        """The whole point of the label: a sweep adds a file, it does not move one."""
        current = tmp_path / 'results.json'
        write_results([make_result(query='the first run')], current, label='v0.6-nomic')

        write_results(
            [make_result(query='the second run')], current, label='v0.9-arctic'
        )

        kept = read_results(tmp_path / 'runs' / 'v0.6-nomic.json')
        assert kept[0].query == 'the first run'

    def test_the_history_follows_the_run_it_belongs_to(self, tmp_path: Path) -> None:
        """A sweep redirected by --results keeps its history beside itself."""
        elsewhere = tmp_path / 'probe' / 'results.json'

        write_results([make_result()], elsewhere, label='timing-probe')

        assert (tmp_path / 'probe' / 'runs' / 'timing-probe.json').exists()

    def test_the_current_run_is_refreshed_beside_the_labelled_copy(
        self, tmp_path: Path
    ) -> None:
        """One stable path is what the report and the write-up keep pointing at."""
        current = tmp_path / 'results.json'

        returned = write_results([make_result()], current, label='v0.9-arctic')

        assert returned == current
        assert read_results(current)[0].query == 'transparency duties'

    def test_an_unlabelled_run_writes_only_the_current_file(
        self, tmp_path: Path
    ) -> None:
        current = tmp_path / 'results.json'

        write_results([make_result()], current)

        assert not (tmp_path / 'runs').exists()


class TestALabelIsAFilename:
    def test_a_label_carrying_a_path_separator_is_refused(self) -> None:
        with pytest.raises(ValueError, match='not a run label'):
            run_path('../../etc/passwd')

    def test_a_label_that_climbs_out_of_the_directory_is_refused(self) -> None:
        with pytest.raises(ValueError, match='not a run label'):
            run_path('..')

    def test_an_empty_label_is_refused(self) -> None:
        with pytest.raises(ValueError, match='not a run label'):
            run_path('')

    def test_the_label_a_run_actually_wants_is_accepted(self, tmp_path: Path) -> None:
        kept = run_path('v0.6-nomic-embed-text', tmp_path / 'results.json')

        assert kept == tmp_path / 'runs' / 'v0.6-nomic-embed-text.json'


class TestTheQueryField:
    def test_a_result_written_without_a_query_reads_back(self, tmp_path: Path) -> None:
        """A run recorded before the field existed is still a readable run."""
        current = tmp_path / 'results.json'
        recorded = make_result().model_dump(mode='json')
        del recorded['query']
        current.write_text(json.dumps([recorded]))

        assert read_results(current)[0].query == ''

    def test_the_query_survives_a_write_and_a_read(self, tmp_path: Path) -> None:
        current = tmp_path / 'results.json'

        write_results([make_result(query='high-risk classification')], current)

        assert read_results(current)[0].query == 'high-risk classification'

    def test_the_baseline_records_no_query(self, tmp_path: Path) -> None:
        current = tmp_path / 'results.json'

        write_results([make_result(arm='full-context', query='')], current)

        assert read_results(current)[0].query == ''
