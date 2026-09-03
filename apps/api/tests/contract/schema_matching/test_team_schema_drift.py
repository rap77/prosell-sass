"""Layer 3 schema-matching test for the `team` domain (DTO <-> TypeScript drift).

Per `.skills/contract-testing/SKILL.md` ("Layer 3: Schema Matching"): detects
when Pydantic DTO field names diverge from the TypeScript/Zod types the
frontend uses on the wire. `test_team_dto_schemas.py` in this same directory
is a contract test in name only for this purpose — it instantiates the
Pydantic models in isolation and never reads the TypeScript side, so it could
not have caught (and did not catch) the `organization_id`/`org_id` mismatch
this test targets.

ponytail: field names are extracted with a small brace-balanced regex scan,
not a real TypeScript parser — sufficient for these two flat
interface/z.object() literals. If either type grows a nested object literal,
this scan would need to become genuinely recursive.
"""

import re
from pathlib import Path
from typing import ClassVar

from prosell.application.dto.team.create import CreateTeamRequest
from prosell.application.dto.team.response import TeamResponse

REPO_ROOT = Path(__file__).resolve().parents[5]
TEAM_API_TS = REPO_ROOT / "apps/web/src/lib/api/teamApi.ts"
TEAM_SCHEMAS_TS = REPO_ROOT / "apps/web/src/lib/api/schemas/teamApi.ts"

_FIELD_LINE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)\??:")


def _extract_object_fields(content: str, marker: str) -> set[str]:
    """Extract top-level field names from a TS interface or z.object({...}) literal."""
    start = content.index(marker)
    brace_start = content.index("{", start)
    depth = 0
    end = brace_start
    for i in range(brace_start, len(content)):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    fields: set[str] = set()
    for line in content[brace_start + 1 : end].splitlines():
        stripped = line.strip()
        match = _FIELD_LINE.match(stripped)
        if match:
            fields.add(match.group(1))
    return fields


def _frontend_create_team_request_fields() -> set[str]:
    content = TEAM_API_TS.read_text()
    return _extract_object_fields(content, "export interface CreateTeamRequest")


def _frontend_team_schema_fields() -> set[str]:
    content = TEAM_SCHEMAS_TS.read_text()
    return _extract_object_fields(content, "export const TeamSchema = z")


class TestCreateTeamRequestSchemaDrift:
    """CreateTeamRequest (Pydantic) vs. teamApi.ts's CreateTeamRequest (TS)."""

    def test_org_id_present_on_both_sides(self):
        backend_fields = set(CreateTeamRequest.model_fields.keys())
        frontend_fields = _frontend_create_team_request_fields()

        assert "org_id" in backend_fields, "backend CreateTeamRequest must declare org_id"
        assert "org_id" in frontend_fields, (
            "frontend teamApi.ts CreateTeamRequest must send org_id (not organization_id) "
            "to match the backend DTO"
        )

    def test_stale_organization_id_field_absent(self):
        """Regression guard: the pre-fix field name must not reappear."""
        assert "organization_id" not in _frontend_create_team_request_fields()

    def test_frontend_fields_are_a_subset_of_backend_fields(self):
        """Every field the frontend sends must be a field the backend understands."""
        backend_fields = set(CreateTeamRequest.model_fields.keys())
        frontend_fields = _frontend_create_team_request_fields()

        assert frontend_fields <= backend_fields, (
            f"frontend sends fields unknown to the backend DTO: {frontend_fields - backend_fields}"
        )


class TestTeamResponseSchemaDrift:
    """TeamResponse (Pydantic) vs. schemas/teamApi.ts's TeamSchema (Zod)."""

    CORE_FIELDS_BOTH_SIDES_MUST_SHARE: ClassVar[set[str]] = {
        "id",
        "name",
        "tenant_id",
        "org_id",
        "created_at",
        "updated_at",
    }

    def test_org_id_present_on_both_sides(self):
        backend_fields = set(TeamResponse.model_fields.keys())
        frontend_fields = _frontend_team_schema_fields()

        assert "org_id" in backend_fields, "backend TeamResponse must declare org_id"
        assert "org_id" in frontend_fields, (
            "frontend TeamSchema must expect org_id (not organization_id) "
            "to match the backend response"
        )

    def test_stale_organization_id_field_absent(self):
        """Regression guard: the pre-fix field name must not reappear."""
        assert "organization_id" not in _frontend_team_schema_fields()

    def test_core_fields_match_by_name(self):
        """Core identity/audit fields must use the exact same name on both sides."""
        backend_fields = set(TeamResponse.model_fields.keys())
        frontend_fields = _frontend_team_schema_fields()

        assert backend_fields >= self.CORE_FIELDS_BOTH_SIDES_MUST_SHARE
        missing_on_frontend = self.CORE_FIELDS_BOTH_SIDES_MUST_SHARE - frontend_fields
        assert not missing_on_frontend, (
            f"TeamResponse fields not mirrored on frontend TeamSchema: {missing_on_frontend}"
        )
