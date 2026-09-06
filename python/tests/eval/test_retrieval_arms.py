"""Traversal reaches more of the high-risk chain, and the report says what that cost."""

from annex.corpus import CorpusVersion
from annex.corpus.models import Corpus
from annex.eval.arms import search_only, search_traversal
from annex.eval.questions import by_id
from annex.eval.runner import Result
from annex.eval.scoring import score_retrieval, supplied_ids
from annex.eval.sensitivity import depth_rows
from tests.eval.conftest import GROUNDED, BuildPipeline

CV_SCREENING = by_id('q04-cv-screening')
CONSOLIDATED = CorpusVersion.CONSOLIDATED
REPLIES = ['high-risk classification and the obligations that follow', GROUNDED]


class TestTheTwoArmsDifferByOneSwitch:
    def test_the_arms_are_named_apart(self, build_pipeline: BuildPipeline) -> None:
        pipeline, _ = build_pipeline(REPLIES)

        assert search_only.build(pipeline).name != search_traversal.build(pipeline).name

    def test_the_search_arm_declares_traversal_off(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(REPLIES)

        answer = search_only.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        assert not answer.retrieval.traversal_enabled
        assert answer.retrieval.traversed_ids == ()

    def test_the_traversal_arm_declares_traversal_on(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(REPLIES)

        answer = search_traversal.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        assert answer.retrieval.traversal_enabled
        assert answer.retrieval.traversed_ids


class TestWhatTraversalAdds:
    def test_the_traversal_arm_reaches_strictly_more(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(REPLIES)
        searched = search_only.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)
        pipeline, _ = build_pipeline(REPLIES)
        walked = search_traversal.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        assert set(supplied_ids(searched.retrieval)) < set(
            supplied_ids(walked.retrieval)
        )

    def test_traversal_recovers_the_obligations_search_alone_misses(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """Article 6 cites the duties rather than restating them, so search cannot."""
        pipeline, _ = build_pipeline(REPLIES)
        searched = search_only.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)
        pipeline, _ = build_pipeline(REPLIES)
        walked = search_traversal.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        alone = score_retrieval(CV_SCREENING, CONSOLIDATED, searched.retrieval)
        expanded = score_retrieval(CV_SCREENING, CONSOLIDATED, walked.retrieval)

        assert expanded.recall > alone.recall


class TestDepthIsForcedRatherThanChosen:
    """Re-walking the recorded seeds is what shows depth 2 is the only setting."""

    def seed(self) -> Result:
        return Result(
            question_id=CV_SCREENING.id,
            flow=CV_SCREENING.flow,
            arm='search-only',
            version=CONSOLIDATED,
            call_index=0,
            searched_ids=('art_6.1',),
        )

    def test_depth_one_reaches_less_of_the_chain_than_depth_two(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        rows = {row.depth: row for row in depth_rows([self.seed()], corpora, cap=200)}

        assert rows[1].recall < rows[2].recall

    def test_depth_three_buys_no_recall_on_the_article_6_chain(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """Scoped to this chain, because the measured run disagrees in general.

        Depth 2 from Article 6 already reaches every obligation, so a third hop
        adds nodes and no recall here. Over the twelve real questions on the
        original text it does add recall, 0.60 to 0.66, because most of them
        never seed Article 6 in the first place. The general claim belongs to
        the sensitivity table rather than to an assertion.
        """
        rows = {row.depth: row for row in depth_rows([self.seed()], corpora, cap=200)}

        assert rows[3].recall == rows[2].recall

    def test_depth_three_sends_materially_more(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        rows = {row.depth: row for row in depth_rows([self.seed()], corpora, cap=200)}

        assert rows[3].nodes_supplied > rows[2].nodes_supplied

    def test_a_run_with_no_search_arm_reports_no_depths(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """The baseline traverses nothing, so there are no seeds to re-walk."""
        baseline = self.seed().model_copy(update={'arm': 'full-context'})

        assert depth_rows([baseline], corpora) == ()


class TestPrecisionIsReportedBesideRecall:
    def test_the_traversal_arm_reports_what_its_recall_cost(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """Recall alone scores this arm as a win while it sends far more text."""
        pipeline, _ = build_pipeline(REPLIES)
        walked = search_traversal.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        score = score_retrieval(CV_SCREENING, CONSOLIDATED, walked.retrieval)

        assert score.precision_over_nodes < score.recall

    def test_both_denominators_are_reported(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(REPLIES)
        walked = search_traversal.build(pipeline).answer(CV_SCREENING, CONSOLIDATED)

        score = score_retrieval(CV_SCREENING, CONSOLIDATED, walked.retrieval)

        assert score.nodes_supplied >= score.articles_supplied
