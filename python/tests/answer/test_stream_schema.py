"""The stream's frame contract, committed the way the answer contract is.

`web/src/lib/stream-node.ts` and `web/src/lib/stream-error.ts` are generated
from these files rather than from the models, so a frame field added here and not regenerated is a server and a
client that disagree with nothing at runtime to notice. Regenerate them with
`uv run python -m annex schema --model stream-node > schema/stream-node.schema.json`
and the same for `stream-error`.
"""

import json
from pathlib import Path

from annex.service.models import StreamError, StreamNode

SCHEMA_DIRECTORY = Path(__file__).resolve().parents[2] / 'schema'


class TestTheCommittedStreamSchemas:
    def test_the_committed_node_frame_schema_matches_the_model(self) -> None:
        committed = json.loads(
            (SCHEMA_DIRECTORY / 'stream-node.schema.json').read_text()
        )

        assert committed == StreamNode.model_json_schema()

    def test_the_committed_error_frame_schema_matches_what_the_stream_sends(
        self,
    ) -> None:
        committed = json.loads(
            (SCHEMA_DIRECTORY / 'stream-error.schema.json').read_text()
        )

        assert committed == StreamError.model_json_schema(
            by_alias=True, mode='serialization'
        )
