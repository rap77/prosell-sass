"""merge_vehicle_products_with_user_dealers

Revision ID: 504440751584
Revises: b1c2d3e4f5a6, 094a57cf7b48
Create Date: 2026-04-04 18:10:19.624096

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "504440751584"
down_revision: str | Sequence[str] | None = ("b1c2d3e4f5a6", "094a57cf7b48")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
