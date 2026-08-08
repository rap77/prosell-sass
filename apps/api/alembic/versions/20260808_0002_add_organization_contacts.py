"""Add contacts JSONB to organizations.

Revision ID: 20260808_0002
Revises: 20260808_0001
Create Date: 2026-08-08

Multi-contact support: array of {id, category, custom_label, phone, email, whatsapp, order}.
Migrates existing phone/email/whatsapp to first contact if any exist.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260808_0002"
down_revision = "20260808_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("contacts", JSONB, nullable=True))

    # ponytail: migrate legacy contact fields to first contact entry
    op.execute("""
        UPDATE organizations
        SET contacts = jsonb_build_array(
            jsonb_build_object(
                'id', gen_random_uuid()::text,
                'category', 'gerencia',
                'custom_label', NULL,
                'phone', phone,
                'email', email,
                'whatsapp', whatsapp,
                'order', 0
            )
        )
        WHERE phone IS NOT NULL OR email IS NOT NULL OR whatsapp IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column("organizations", "contacts")
