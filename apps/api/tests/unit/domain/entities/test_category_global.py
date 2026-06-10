"""Unit tests for global (tenant-less) Category templates."""

from prosell.domain.entities.category import Category


def test_global_category_has_no_tenant():
    cat = Category.create(name="Vehicles", slug="vehicles", tenant_id=None)
    assert cat.tenant_id is None
    assert cat.level == 0
