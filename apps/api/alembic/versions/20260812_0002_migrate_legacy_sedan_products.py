"""Move legacy Sedan products to the canonical automotive category.

Revision ID: 20260812_0002
Revises: 20260812_0001
Create Date: 2026-08-12

Sedan is redundant with the canonical Carros y Camionetas category because
vehicle body style is represented by the ``body_type`` attribute. This guarded
data migration moves the three known legacy products without changing their
attributes.
"""

import sqlalchemy as sa
from alembic import op

revision = "20260812_0002"
down_revision = "20260812_0001"
branch_labels = None
depends_on = None

LEGACY_SEDAN_CATEGORY_ID = "b67fbde5-4407-452f-9779-a75b6d3be966"
AUTOMOTIVE_CATEGORY_ID = "b26f93ac-2d21-4849-9a1f-2a7df6b32de2"
LEGACY_PRODUCT_IDS = (
    "822e4242-ba28-4a0e-be68-582106acfd12",
    "a045bfc6-a4ef-43c8-a334-ea69a821e0f8",
    "cca681a7-f585-4327-a0fc-b9be20e4e09f",
)


def _validate_legacy_products(expected_category_id: str) -> None:
    """Abort unless the exact reviewed records still match their expected state."""
    connection = op.get_bind()
    count = connection.execute(
        sa.text(
            """
        SELECT count(*)
        FROM products
        WHERE id = ANY(CAST(:product_ids AS uuid[]))
          AND category_id = CAST(:category_id AS uuid)
          AND attributes->>'body_type' = 'sedan'
        """
        ),
        {"product_ids": list(LEGACY_PRODUCT_IDS), "category_id": expected_category_id},
    ).scalar_one()
    if count != len(LEGACY_PRODUCT_IDS):
        raise RuntimeError(
            "Legacy Sedan product migration aborted: reviewed products no longer "
            "match the expected category and body_type."
        )


def _validate_category(category_id: str) -> None:
    """Ensure a migration never assigns products to a missing category."""
    exists = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT EXISTS(SELECT 1 FROM categories WHERE id = CAST(:category_id AS uuid))"
            ),
            {"category_id": category_id},
        )
        .scalar_one()
    )
    if not exists:
        raise RuntimeError("Legacy Sedan product migration aborted: category is missing.")


def upgrade() -> None:
    # ponytail: skip if target category doesn't exist (e.g. fresh staging DB)
    connection = op.get_bind()
    category_exists = connection.execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM categories WHERE id = CAST(:category_id AS uuid))"),
        {"category_id": AUTOMOTIVE_CATEGORY_ID},
    ).scalar_one()

    if not category_exists:
        return  # No categories in this environment, skip migration

    # ponytail: skip if no legacy products exist (e.g. staging/test environments)
    products_exist = connection.execute(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ANY(CAST(:product_ids AS uuid[])))"
        ),
        {"product_ids": list(LEGACY_PRODUCT_IDS)},
    ).scalar_one()

    if not products_exist:
        return  # No legacy products to migrate, skip

    # If we're here, both category and products exist - run strict validation
    _validate_category(AUTOMOTIVE_CATEGORY_ID)
    _validate_legacy_products(LEGACY_SEDAN_CATEGORY_ID)
    connection.execute(
        sa.text(
            "UPDATE products SET category_id = CAST(:category_id AS uuid) "
            "WHERE id = ANY(CAST(:product_ids AS uuid[]))"
        ),
        {"category_id": AUTOMOTIVE_CATEGORY_ID, "product_ids": list(LEGACY_PRODUCT_IDS)},
    )


def downgrade() -> None:
    _validate_category(LEGACY_SEDAN_CATEGORY_ID)
    _validate_legacy_products(AUTOMOTIVE_CATEGORY_ID)
    op.get_bind().execute(
        sa.text(
            "UPDATE products SET category_id = CAST(:category_id AS uuid) "
            "WHERE id = ANY(CAST(:product_ids AS uuid[]))"
        ),
        {"category_id": LEGACY_SEDAN_CATEGORY_ID, "product_ids": list(LEGACY_PRODUCT_IDS)},
    )
