"""Capturing what the pipeline actually said, as the fixtures a deployed build replays.

The evaluation runner scores an answer and keeps none of it. `Result` holds the
trace, the scores and the three id tuples, so `python/data/eval/results.json`
is 72 rows carrying no claim, no citation text and no refusal reason. A demo
that replays a recording needs the answer object itself, which is the same
object the service returns and the same one `web/src/lib/answer.ts` is
generated from, so it is captured here rather than reconstructed from a score.

## What a fixture is allowed to be

Whatever the pipeline said. A weak answer on a demo question belongs to the
stage that produced it, and hand-editing one turns a recording into an
invention, which is the failure `web/e2e/capture-states.ts` shipped and this
module exists to retire.

## Why the manifest carries a commit and a date

A stale fixture fails loudly on the schema and quietly on the content. A field
added to the Pydantic models makes every committed fixture fail to parse, which
a test catches. A fixture that still parses and no longer matches what the
pipeline says looks exactly like a fresh one, and nothing but the stamp says
when it was taken and against which tree.
"""

import json
import logging
import subprocess
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from annex.answer import Answer
from annex.corpus import CorpusVersion
from annex.eval.questions import QUESTIONS, Flow, Question
from annex.llm import ModelContextError

logger = logging.getLogger('annex.eval.capture')

FIXTURES_PATH = Path(__file__).resolve().parents[4] / 'web' / 'src' / 'fixtures'
"""Where the web half reads its recording from.

Inside the bundle rather than beside it, because a static export fetches
nothing at runtime. A generated file crossing the two halves already has its
precedent in `web/src/lib/answer.ts`.
"""

MANIFEST_NAME = 'manifest.json'
INDEX_NAME = 'index.ts'

EXPECTED_FAILURES = (ModelContextError, OSError, ValueError)
"""What one question is allowed to fail with without ending the capture.

The runner's own list minus `ContextOverflowError`, which belongs to the
baseline arm and nothing here stuffs a corpus. A model nobody built, an index
that is not there, and a response the answer schema rejects. Anything else is a
programmer error and propagates.
"""

Asker = Callable[[str, CorpusVersion], Answer]
"""A description and a version in, an answer out.

The pipeline satisfies this and so does a stub, which is what lets the writer
be covered over every question and both versions without a model call.
"""


class Entry(BaseModel):
    """One captured answer, and enough about it to find and read it."""

    model_config = ConfigDict(frozen=True)

    question_id: str
    description: str
    flow: Flow
    version: CorpusVersion
    file: str
    refused: bool


class Manifest(BaseModel):
    """The recording, and the conditions it was taken under.

    `commit` and `captured_at` are the part a reader cannot derive from the
    fixtures. Everything in the answer object describes what the pipeline said,
    and nothing in it says which tree said it.
    """

    model_config = ConfigDict(frozen=True)

    commit: str
    captured_at: str
    entries: tuple[Entry, ...]


def fixture_filename(question_id: str, version: CorpusVersion) -> str:
    """One file per question and version, named so a diff reads as a list.

    A re-capture rewrites the pairs whose answer moved and leaves the rest
    byte-identical, which a single bundled file would hide inside one blob.
    """
    return f'{question_id}.{version}.json'


def head_commit() -> str:
    """The tree the capture ran against, or a name saying it could not be read.

    Read rather than passed, since a caller supplying it can supply the wrong
    one and the whole value of the stamp is that nobody typed it. Public
    because `annex.eval.report.write_summary` stamps the same commit rather
    than carrying a second implementation of this subprocess call.
    """
    try:
        completed = subprocess.run(
            ('git', 'rev-parse', 'HEAD'),
            capture_output=True,
            text=True,
            check=True,
        )
    except OSError, subprocess.CalledProcessError:
        return 'unknown'
    return completed.stdout.strip() or 'unknown'


def _identifier(question_id: str, version: CorpusVersion) -> str:
    """A JavaScript binding name for one fixture, from its own filename."""
    parts = f'{question_id}-{version}'.replace('.', '-').split('-')
    return parts[0] + ''.join(part.capitalize() for part in parts[1:])


def render_index(entries: Sequence[Entry]) -> str:
    """The module `replay.ts` imports, written out rather than globbed.

    Next resolves a static import at build time, and the glob import that would
    replace this list is an idiom its bundler does not offer, so the imports are
    generated beside the files they name. Emitted in the repository's prettier
    style, since `bun run check:format` reads this file like any other, and a
    re-capture is followed by `bun run format` for the lines it cannot predict.
    """
    ordered = sorted(entries, key=lambda entry: entry.file)
    imports = '\n'.join(
        f"import {_identifier(entry.question_id, entry.version)} from './{entry.file}'"
        for entry in ordered
    )
    members = '\n'.join(
        f"  '{entry.question_id}.{entry.version}': "
        f'{_identifier(entry.question_id, entry.version)},'
        for entry in ordered
    )
    return f"""// Generated by `uv run python -m annex capture`. Do not edit.
//
// One captured answer per question and version, keyed the way
// `annex.eval.capture.fixture_filename` names the files. `src/lib/replay.ts`
// is the only module that reads this one.
import manifest from './{MANIFEST_NAME}'
{imports}

export {{ manifest }}

export const captures: Record<string, unknown> = {{
{members}
}}
"""


def capture(
    ask: Asker,
    *,
    questions: Sequence[Question] = QUESTIONS,
    versions: Sequence[CorpusVersion] = tuple(CorpusVersion),
    out: Path = FIXTURES_PATH,
) -> Manifest:
    """Answer every question on every version and write what came back.

    Each answer is written as it lands, the way the evaluation runner writes
    its results, because the run is twenty-four pipeline calls at twenty-odd
    seconds apiece and a dropped connection at the twentieth should not cost
    the nineteen before it.

    One question failing does not end the run, for the same reason. The pair is
    left out of the recording and the manifest names what was captured, so the
    deployed build holds one fewer question rather than none at all. The
    absence is visible: a question in the set with no entry beside it did not
    come back.
    """
    out.mkdir(parents=True, exist_ok=True)
    entries: list[Entry] = []
    for version in versions:
        for question in questions:
            logger.info('capturing %s on %s', question.id, version)
            try:
                answer = ask(question.description, version)
            except EXPECTED_FAILURES as error:
                logger.error(
                    'capturing %s on %s failed: %s', question.id, version, error
                )
                continue
            name = fixture_filename(question.id, version)
            (out / name).write_text(answer.model_dump_json(indent=2) + '\n')
            entries.append(
                Entry(
                    question_id=question.id,
                    description=question.description,
                    flow=question.flow,
                    version=version,
                    file=name,
                    refused=answer.is_refusal,
                )
            )

    manifest = Manifest(
        commit=head_commit(),
        captured_at=datetime.now(UTC).date().isoformat(),
        entries=tuple(entries),
    )
    (out / MANIFEST_NAME).write_text(
        json.dumps(manifest.model_dump(mode='json'), indent=2) + '\n'
    )
    (out / INDEX_NAME).write_text(render_index(entries))
    return manifest
