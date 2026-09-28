"""seed vehicle_code into vehicle-category attribute_schema and identification group

Revision ID: a5fb511de9e5
Revises: 20260927_0001
Create Date: 2026-09-28

Why
---
After migration `20260927_0001_move_vehicle_code_to_attributes_jsonb`,
`vehicle_code` lives inside `Product.attributes["vehicle_code"]` (JSONB
text representation of the durable, globally-unique legacy product id).
Vehicle categories' `attribute_schema` and `attribute_groups` need to
declare the field so the dynamic `SchemaFormSection` in the frontend
renders the input inside the "identificacion" group, alongside VIN,
make, and model — instead of the previous dedicated fixed section.

This migration seeds the schema/group declarations on every category
that already declares a `vin` field (the canonical marker for vehicle
categories in this codebase). Categories that already declare
`vehicle_code` (the migration is idempotent) are skipped.

Operational note
----------------
The migration only updates existing rows; new vehicle categories
created post-migration need to declare the field manually through
the admin schema editor (`/categories/{id}/schema`), the same way
every other category-managed field is added. There is no auto-magic
on category-create that injects `vehicle_code` — it has to be
intentional, mirroring how `vin` itself is configured per category.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a5fb511de9e5"
down_revision: str | Sequence[str] | None = "20260927_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add vehicle_code to vehicle categories' attribute_schema + groups.

    Steps:
      1. Insert the schema entry under `vehicle_code` in the JSONB
         `attribute_schema` (no-op when the key already exists).
      2. Prepend `vehicle_code` to the `identification` group's
         `fields` array — the unique legacy id becomes the first
         rendered field within the group, before `vin`/`stock_number`.

    Both queries target every category whose `attribute_schema`
    declares `vin` (the canonical "this is a vehicle category"
    marker in the codebase). Categories without `vin` are not
    vehicle categories and are left untouched — the design says
    `vehicle_code` is a vehicle-only field.
    """
    # 1. attribute_schema merge (idempotent — `||` only adds the key
    #    when it isn't already there; existing `vehicle_code` entries
    #    are preserved with their custom shape). The JSONB literal is
    #    a static string — no interpolation, no concatenation.
    op.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = attribute_schema || jsonb_build_object(
                'vehicle_code',
                jsonb_build_object(
                    'type', 'number',
                    'group', 'identification',
                    'required', false,
                    'min', 1,
                    'help_text',
                    'Identificador unico del catalogo (auto-asignado)'
                )
            )
            WHERE attribute_schema ? 'vin'
              AND NOT (attribute_schema ? 'vehicle_code')
            """
        )
    )

    # 2. identification group — prepend `vehicle_code` if not already
    #    listed. `jsonb_set` rewrites the entire `fields` array, so we
    #    build it from the existing elements (in order) plus
    #    `vehicle_code` at position 0.
    op.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_groups = (
                SELECT jsonb_agg(
                    CASE
                        WHEN (group_entry->>'key') = 'identification'
                             AND NOT (group_entry->'fields' ? 'vehicle_code')
                        THEN
                            jsonb_set(
                                group_entry,
                                '{fields}',
                                to_jsonb(
                                    ARRAY['vehicle_code'] ||
                                    ARRAY(
                                        SELECT jsonb_array_elements_text(
                                            group_entry->'fields'
                                        )
                                    )
                                )
                            )
                        ELSE group_entry
                    END
                )
                FROM jsonb_array_elements(attribute_groups) AS group_entry
            )
            WHERE attribute_schema ? 'vehicle_code'
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(attribute_groups) AS g
                WHERE g->>'key' = 'identification'
              )
            """
        )
    )


def downgrade() -> None:
    """Remove the seeded `vehicle_code` schema entry and group placement.

    Idempotent: silently no-ops when the seed never ran (so the
    downgrade path is safe to run on a freshly-installed DB that
    skipped this migration). Does NOT touch `Product.attributes` —
    any persisted vehicle_code values stay where they are.
    """
    # 1. Strip the schema entry.
    op.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = attribute_schema - 'vehicle_code'
            WHERE attribute_schema ? 'vehicle_code'
            """
        )
    )

    # 2. Strip the field reference from every group's `fields` list.
    #    Uses a `FROM jsonb_array_elements_text(...) AS f(value)` alias
    #    so the `WHERE` clause references the unnested value cleanly.
    op.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_groups = (
                SELECT COALESCE(jsonb_agg(
                    jsonb_set(
                        group_entry,
                        '{fields}',
                        to_jsonb(
                            ARRAY(
                                SELECT value
                                FROM jsonb_array_elements_text(
                                    group_entry->'fields'
                                ) AS f(value)
                                WHERE value <> 'vehicle_code'
                            )
                        )
                    )
                ), '[]'::jsonb)
                FROM jsonb_array_elements(attribute_groups) AS group_entry
            )
            WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(attribute_groups) AS g
                WHERE g->'fields' ? 'vehicle_code'
            )
            """
        )
    )
