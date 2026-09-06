"""The pipeline, as a compiled LangGraph over an explicit state object.

Four nodes and one conditional edge. Route restates the system description in
the Act's vocabulary, retrieve searches one version, traverse follows the
citations outward, and synthesize drafts statements against what was gathered.
The conditional edge runs after synthesis: an answer whose claims do not
survive grounding leaves through refusal rather than through the answer path.

`.claude/REQUIREMENTS.md` names LangGraph under Tech stack rather than among
the open risks `.claude/ARCHITECTURE.md` tracks, so it is a commitment rather
than an unfilled slot. What it buys at this size is small and worth naming: the
state object is explicit rather than a set of arguments threaded through calls,
which is where `RetrievalTrace` is filled without every stage passing it along
by hand, and the one branch that carries the product's argument is declared in
the graph rather than buried in a return statement.

What it costs is 38 packages, one of which is `langsmith`, a hosted telemetry
client, on a project whose stated constraint is that nothing leaves the
machine. `annex.settings` writes the tracing switches off rather than trusting
a default, `apply_tracing_settings` puts them in the environment before the
graph is built, and `tests/agent/test_telemetry_off.py` asserts it.
"""

import logging
import os
import re
import time
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from annex.agent import prompts
from annex.agent.verify import verify
from annex.answer import Answer, Citation, Claim, Refusal, RetrievalTrace
from annex.corpus import Corpus, CorpusVersion, Provision, build, load
from annex.corpus.graph import ReferenceGraph
from annex.llm import OllamaClient
from annex.retrieval import INDEX_PATH, Hit, search, traverse
from annex.settings import Settings, tracing_environment

logger = logging.getLogger('annex.agent.pipeline')

CITATION_MARKER = re.compile(r'\[(\d+)\]')
REFUSAL_MARKER = 'REFUSE'


class State(TypedDict, total=False):
    """What flows between the nodes, and what the trace is filled from."""

    question: str
    version: CorpusVersion
    started: float
    query: str
    hits: tuple[Hit, ...]
    provision_ids: tuple[str, ...]
    traversed_ids: tuple[str, ...]
    traversal_enabled: bool
    prompt_tokens: int
    completion_tokens: int
    answer: Answer


def apply_tracing_settings(settings: Settings) -> None:
    """Write the LangSmith switches into the environment, off by default.

    LangGraph reads these at import and at run time, so setting them here
    rather than relying on their absence is what makes "nothing leaves the
    machine" a property of this code rather than of somebody's shell.
    """
    os.environ.update(tracing_environment(settings))


class Pipeline:
    """One compiled graph, its corpus, its reference graph and its client.

    Constructed once and asked many questions. Parsing both documents and
    building their reference graphs costs a second or so, which is not a price
    to pay per question.
    """

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        client: OllamaClient | None = None,
        corpora: dict[CorpusVersion, Corpus] | None = None,
        index_path: Path = INDEX_PATH,
    ) -> None:
        self.settings = settings or Settings()
        apply_tracing_settings(self.settings)
        self.client = client or OllamaClient(self.settings)
        self.corpora = corpora or {version: load(version) for version in CorpusVersion}
        self.graphs: dict[CorpusVersion, ReferenceGraph] = {
            version: build(corpus) for version, corpus in self.corpora.items()
        }
        self.index_path = index_path
        self.compiled = self._compile()

    def _compile(self) -> CompiledStateGraph[State]:
        graph = StateGraph(State)
        graph.add_node('route', self._route)
        graph.add_node('retrieve', self._retrieve)
        graph.add_node('traverse', self._traverse)
        graph.add_node('synthesize', self._synthesize)
        graph.add_node('refuse', self._refuse)

        graph.add_edge(START, 'route')
        graph.add_edge('route', 'retrieve')
        graph.add_edge('retrieve', 'traverse')
        graph.add_edge('traverse', 'synthesize')
        graph.add_conditional_edges(
            'synthesize',
            self._settled,
            {'answered': END, 'unsettled': 'refuse'},
        )
        graph.add_edge('refuse', END)
        return graph.compile()

    def _route(self, state: State) -> State:
        """Restate the description in the vocabulary the Act actually uses."""
        started = time.monotonic()
        completion = self.client.complete(
            prompts.ROUTE.format(question=state['question']), max_tokens=2048
        )
        query = completion.text.strip() or state['question']
        logger.info('routed to: %s', query)
        return {
            'started': started,
            'query': query,
            'prompt_tokens': completion.prompt_tokens,
            'completion_tokens': completion.completion_tokens,
        }

    def _retrieve(self, state: State) -> State:
        hits = search(
            state['query'],
            state['version'],
            self.settings.search_k,
            client=self.client,
            settings=self.settings,
            path=self.index_path,
        )
        return {'hits': hits}

    def _traverse(self, state: State) -> State:
        expansion = traverse(
            state['hits'],
            self.graphs[state['version']],
            depth=self.settings.traversal_depth,
            cap=self.settings.traversal_cap,
            enabled=state.get('traversal_enabled', True),
        )
        return {
            'provision_ids': expansion.provision_ids,
            'traversed_ids': expansion.traversed_ids,
        }

    def _synthesize(self, state: State) -> State:
        citations = self._citations(state)
        numbered = '\n\n'.join(
            f'[{index}] {citation.citation}\n{citation.text}'
            for index, citation in enumerate(citations, start=1)
        )
        completion = self.client.complete(
            prompts.SYNTHESIZE.format(provisions=numbered, question=state['question']),
            max_tokens=4096,
        )
        trace = RetrievalTrace(
            searched_ids=tuple(hit.provision_id for hit in state['hits']),
            traversed_ids=state.get('traversed_ids', ()),
            traversal_enabled=state.get('traversal_enabled', True),
            prompt_tokens=state.get('prompt_tokens', 0) + completion.prompt_tokens,
            completion_tokens=(
                state.get('completion_tokens', 0) + completion.completion_tokens
            ),
            duration_ms=int((time.monotonic() - state['started']) * 1000),
            model=completion.model,
        )
        drafted = _parse(completion.text, citations)
        answer = Answer(
            question=state['question'],
            version=state['version'],
            claims=drafted[0],
            refusal=drafted[1],
            retrieval=trace,
        )
        return {'answer': verify(answer)}

    def _refuse(self, state: State) -> State:
        """The declared exit for a question the retrieved text did not settle.

        `verify` has already produced the refusal by the time this runs. The
        node exists so the branch is visible in the compiled graph rather than
        implied by a return value, which is most of what LangGraph buys here.
        """
        return {'answer': state['answer']}

    @staticmethod
    def _settled(state: State) -> str:
        return 'unsettled' if state['answer'].is_refusal else 'answered'

    def _citations(self, state: State) -> tuple[Citation, ...]:
        corpus = self.corpora[state['version']]
        other = self.corpora[
            CorpusVersion.ORIGINAL
            if state['version'] is CorpusVersion.CONSOLIDATED
            else CorpusVersion.CONSOLIDATED
        ]
        citations: list[Citation] = []
        for provision_id in state['provision_ids']:
            provision = corpus.get(provision_id)
            if provision is None:
                continue
            note = _amendment(provision, other)
            citations.append(
                Citation(
                    provision_id=provision.id,
                    citation=provision.citation,
                    kind=provision.kind,
                    version=provision.version,
                    text=provision.text,
                    changed=note is not None,
                    change_note=note,
                )
            )
        return tuple(citations)

    def ask(
        self,
        question: str,
        *,
        version: CorpusVersion = CorpusVersion.CONSOLIDATED,
        traversal: bool = True,
    ) -> Answer:
        """Answer one question, or refuse it."""
        final = self.compiled.invoke(
            State(
                question=question,
                version=version,
                traversal_enabled=traversal,
            )
        )
        answer: Answer = final['answer']
        return answer


def _amendment(provision: Provision, other: Corpus) -> str | None:
    """What the amendment did to this provision, or nothing if it did nothing.

    Computed from the two parses rather than from a diff service. A provision
    absent from the other version was inserted or removed outright, and one
    whose text differs was rewritten. Both are things a reader relying on the
    citation needs told.
    """
    counterpart = other.get(provision.id)
    if counterpart is None:
        return (
            f'{provision.citation} appears in the {provision.version} text '
            f'and not in the {other.version} text.'
        )
    if counterpart.text != provision.text:
        return (
            f'The wording of {provision.citation} differs between the original '
            'and the consolidated text.'
        )
    return None


def _parse(
    drafted: str, citations: tuple[Citation, ...]
) -> tuple[tuple[Claim, ...], Refusal | None]:
    """Read the model's lines as claims, or as a refusal it declared itself.

    A line whose bracketed numbers name no provision that was retrieved is
    dropped here rather than carried to verification, since a citation the
    pipeline never fetched is fabricated whatever the statement says.
    """
    lines = [line.strip() for line in drafted.splitlines() if line.strip()]
    if any(line.upper().startswith(REFUSAL_MARKER) for line in lines):
        marker = next(
            index
            for index, line in enumerate(lines)
            if line.upper().startswith(REFUSAL_MARKER)
        )
        missing = tuple(line.lstrip('- ') for line in lines[marker + 1 :])
        return (), Refusal(
            reason='The retrieved provisions do not settle the question.',
            missing=missing or ('what the text leaves open',),
            consulted=citations,
        )

    claims: list[Claim] = []
    for line in lines:
        markers = CITATION_MARKER.findall(line)
        cited = tuple(
            citations[int(marker) - 1]
            for marker in markers
            if 0 < int(marker) <= len(citations)
        )
        statement = CITATION_MARKER.sub('', line).strip(' .-')
        if cited and statement:
            claims.append(Claim(statement=statement, citations=cited))

    if claims:
        return tuple(claims), None
    return (), Refusal(
        reason='The model produced no statement resting on a retrieved provision.',
        missing=('a provision of the Act that addresses the description',),
        consulted=citations,
    )
