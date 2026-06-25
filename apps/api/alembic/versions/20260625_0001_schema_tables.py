"""Add bulk_upload_errors and category_schema_changes tables

Revision ID: schema_tables_20260625
Revises: c8a7e1f93b21
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "schema_tables_20260625"
down_revision: str | Sequence[str] | None = "c8a7e1f93b21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bulk_upload_errors",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
    )
    op.create_index("ix_bulk_upload_errors_tenant_id", "bulk_upload_errors", ["tenant_id"])
    op.create_index("ix_bulk_upload_errors_expires_at", "bulk_upload_errors", ["expires_at"])

    op.create_table(
        "category_schema_changes",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("changed_by_user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("previous_attributes", JSONB, nullable=True),
        sa.Column("new_attributes", JSONB, nullable=False),
        sa.Column(
            "migration_applied",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "migration_warnings",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "change_summary",
            sa.Text(),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.create_index(
        "ix_category_schema_changes_category_id",
        "category_schema_changes",
        ["category_id"],
    )
    op.create_index(
        "ix_category_schema_changes_changed_at",
        "category_schema_changes",
        ["changed_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_category_schema_changes_changed_at", table_name="category_schema_changes")
    op.drop_index("ix_category_schema_changes_category_id", table_name="category_schema_changes")
    op.drop_table("category_schema_changes")
    op.drop_index("ix_bulk_upload_errors_expires_at", table_name="bulk_upload_errors")
    op.drop_index("ix_bulk_upload_errors_tenant_id", table_name="bulk_upload_errors")
    op.drop_table("bulk_upload_errors")
