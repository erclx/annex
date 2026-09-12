"""Writing the parsed corpus out as the JSON the reading panel reads.

`annex.eval.capture` established the pattern this follows: a generated file
crossing the two halves carries a manifest naming the commit and the date it
was written at, so a fixture that no longer matches the parser it was written
from fails on inspection rather than silently.
"""

import json
import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from annex.corpus.models import Corpus
from annex.corpus.sources import CorpusVersion

logger = logging.getLogger('annex.corpus.export')

FIXTURES_PATH = (
    Path(__file__).resolve().parents[4] / 'web' / 'src' / 'fixtures' / 'corpus'
)
"""Where the reading panel reads the corpus from.

Inside the bundle rather than beside it, for the reason `annex.eval.capture`
gives for the answer fixtures: a static export fetches nothing at runtime.
"""

MANIFEST_NAME = 'manifest.json'


class Manifest(BaseModel):
    """The export, and the tree it was taken against."""

    model_config = ConfigDict(frozen=True)

    commit: str
    exported_at: str


def _head_commit() -> str:
    """The tree the export ran against, or a name saying it could not be read."""
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


def fixture_filename(version: CorpusVersion) -> str:
    """One file per version, named the way `annex.eval.capture` names its own."""
    return f'{version}.json'


def export(
    corpora: dict[CorpusVersion, Corpus], *, out: Path = FIXTURES_PATH
) -> Manifest:
    """Write every version's provisions to its own JSON file, and stamp the pair."""
    out.mkdir(parents=True, exist_ok=True)
    for version, corpus in corpora.items():
        provisions = [
            provision.model_dump(mode='json') for provision in corpus.provisions
        ]
        (out / fixture_filename(version)).write_text(
            json.dumps(provisions, indent=2) + '\n'
        )

    manifest = Manifest(
        commit=_head_commit(),
        exported_at=datetime.now(UTC).date().isoformat(),
    )
    (out / MANIFEST_NAME).write_text(
        json.dumps(manifest.model_dump(mode='json'), indent=2) + '\n'
    )
    return manifest
