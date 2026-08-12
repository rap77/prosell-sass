"""Restore tables omitted by the historical schema branch.

Revision ID: 20260812_0001
Revises: 20260809_0002
Create Date: 2026-08-12

The historical schema_tables_20260625 revision was not on every deployed
database path. The API relies on these tables for schema audit entries and
bulk-upload error downloads.
"""

from alembic import op

revision = "20260812_0001"
down_revision = "20260809_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS bulk_upload_errors (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL,
            category_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            payload JSONB NOT NULL
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_bulk_upload_errors_tenant_id
        ON bulk_upload_errors (tenant_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_bulk_upload_errors_expires_at
        ON bulk_upload_errors (expires_at)
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS category_schema_changes (
            id UUID PRIMARY KEY,
            category_id UUID NOT NULL,
            changed_by_user_id UUID NOT NULL,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            previous_attributes JSONB,
            new_attributes JSONB NOT NULL,
            migration_applied BOOLEAN NOT NULL DEFAULT false,
            migration_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
            change_summary TEXT NOT NULL DEFAULT ''
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_category_schema_changes_category_id
        ON category_schema_changes (category_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_category_schema_changes_changed_at
        ON category_schema_changes (changed_at)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS bulk_upload_errors")
    op.execute("DROP TABLE IF EXISTS category_schema_changes")
