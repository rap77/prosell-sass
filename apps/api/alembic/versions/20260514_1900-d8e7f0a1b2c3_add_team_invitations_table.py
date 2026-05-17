"""add team_invitations table

Revision ID: d8e7f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-05-14 19:00:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'd8e7f0a1b2c3'
down_revision: str | Sequence[str] | None = 'c7d8e9f0a1b2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'team_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('team_id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default='now()', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default='now()', onupdate='now()', nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )

    # Create indexes for performance
    op.create_index(op.f('ix_team_invitations_team_id'), 'team_invitations', ['team_id'], unique=False)
    op.create_index(op.f('ix_team_invitations_email'), 'team_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_team_invitations_tenant_id'), 'team_invitations', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_team_invitations_tenant_id'), table_name='team_invitations')
    op.drop_index(op.f('ix_team_invitations_email'), table_name='team_invitations')
    op.drop_index(op.f('ix_team_invitations_team_id'), table_name='team_invitations')
    op.drop_table('team_invitations')
