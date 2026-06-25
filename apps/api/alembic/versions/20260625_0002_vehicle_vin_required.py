"""Data migration: set required=true for 'vin' key in vehicle attribute_schema

Any category whose attribute_schema already contains a 'vin' key gets
required=true. Ensures legacy vehicle CSVs still pass schema validation
after CSVProductParser is generalized (no longer hardcodes VIN as required).

Revision ID: vehicle_vin_required_20260625
Revises: schema_tables_20260625
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "vehicle_vin_required_20260625"
down_revision: str | Sequence[str] | None = "schema_tables_20260625"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE categories
            SET attribute_schema = jsonb_set(
                attribute_schema,
                '{vin,required}',
                'true'::jsonb
            )
            WHERE attribute_schema ? 'vin'
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE categories
            SET attribute_schema = jsonb_set(
                attribute_schema,
                '{vin,required}',
                'false'::jsonb
            )
            WHERE attribute_schema -> 'vin' ? 'required'
        """)
    )
