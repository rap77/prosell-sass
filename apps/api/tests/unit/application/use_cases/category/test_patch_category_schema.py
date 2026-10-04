"""Characterization tests for PatchCategorySchemaUseCase — backend decomposition
Stage 2.1. This use case had ZERO test coverage despite performing live schema
migrations across every product in a category (confirmed by direct search before
writing these). Pins current behavior before any future refactor touches it.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.category.patch_category_schema import (
    PatchCategorySchemaUseCase,
    PatchSchemaResult,
)
from prosell.domain.entities.category import Category
from prosell.domain.exceptions.category_exceptions import (
    CategoryNotFoundError,
    SchemaMigrationRequiresForceError,
)


def _make_category(**overrides) -> Category:
    defaults: dict = {
        "id": uuid4(),
        "name": "Vehicles",
        "slug": "vehicles",
        "attribute_schema": {},
        "attribute_groups": [],
    }
    defaults.update(overrides)
    return Category(**defaults)


def _make_use_case(category: Category | None, schema_repo_overrides: dict | None = None):
    category_repository = AsyncMock()
    category_repository.get_by_id_or_global.return_value = category
    category_repository.update.side_effect = lambda c: c

    schema_repository = AsyncMock()
    schema_repository.count_products_with_attribute.return_value = 0
    schema_repository.count_products_missing_attribute.return_value = 0
    if schema_repo_overrides:
        for name, value in schema_repo_overrides.items():
            getattr(schema_repository, name).return_value = value

    use_case = PatchCategorySchemaUseCase(
        category_repository=category_repository, schema_repository=schema_repository
    )
    return use_case, category_repository, schema_repository


class TestCategoryNotFound:
    @pytest.mark.asyncio
    async def test_raises_when_category_does_not_exist(self):
        use_case, _, _ = _make_use_case(category=None)

        with pytest.raises(CategoryNotFoundError):
            await use_case.execute(
                category_id=uuid4(),
                tenant_id=uuid4(),
                new_schema={},
                force=False,
                user_id=uuid4(),
            )


class TestAddingNewField:
    """A field present only in the new schema generates no warnings at all —
    `_detect_warnings` skips any field_name whose old_def is None."""

    @pytest.mark.asyncio
    async def test_no_warnings_no_force_required(self):
        category = _make_category(attribute_schema={})
        use_case, category_repository, schema_repository = _make_use_case(category)

        result = await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"color": {"type": "string"}},
            force=False,
            user_id=uuid4(),
        )

        assert isinstance(result, PatchSchemaResult)
        assert result.migration_warnings == []
        assert result.requires_force is False
        assert category.attribute_schema == {"color": {"type": "string"}}
        category_repository.update.assert_awaited_once()
        schema_repository.save_schema_change.assert_awaited_once()
        call = schema_repository.save_schema_change.await_args.kwargs
        assert call["migration_applied"] is False
        assert call["previous_attributes"] is None  # old_schema was empty -> None, not {}


class TestAutoMigratePairs:
    """number<->string and boolean->string are auto-migrated — but ANY warning
    (even a benign auto-migrate one) still blocks without force=True. This is
    the "two-step client flow" the use case's own docstring describes."""

    @pytest.mark.asyncio
    async def test_without_force_raises_even_for_an_auto_migrate_pair(self):
        category = _make_category(attribute_schema={"year": {"type": "number"}})
        use_case, _, _ = _make_use_case(category)

        with pytest.raises(SchemaMigrationRequiresForceError) as exc_info:
            await use_case.execute(
                category_id=category.id,
                tenant_id=uuid4(),
                new_schema={"year": {"type": "string"}},
                force=False,
                user_id=uuid4(),
            )

        assert exc_info.value.requires_force is False
        assert "auto-migrated" in exc_info.value.warnings[0]

    @pytest.mark.asyncio
    async def test_with_force_applies_migration_and_persists_audit_log(self):
        category = _make_category(attribute_schema={"year": {"type": "number"}})
        use_case, _category_repository, schema_repository = _make_use_case(
            category, {"count_products_with_attribute": 7}
        )

        result = await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"year": {"type": "string"}},
            force=True,
            user_id=uuid4(),
        )

        assert result.requires_force is False  # always False in the returned result
        assert "7 products will be auto-migrated" in result.migration_warnings[0]
        schema_repository.migrate_attribute_to_string.assert_awaited_once()
        call = schema_repository.save_schema_change.await_args.kwargs
        assert call["migration_applied"] is True

    @pytest.mark.asyncio
    async def test_number_to_string_calls_migrate_to_string_not_to_number(self):
        category = _make_category(attribute_schema={"year": {"type": "number"}})
        use_case, _, schema_repository = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"year": {"type": "string"}},
            force=True,
            user_id=uuid4(),
        )

        schema_repository.migrate_attribute_to_string.assert_awaited_once()
        schema_repository.migrate_attribute_to_number.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_string_to_number_calls_migrate_to_number(self):
        category = _make_category(attribute_schema={"mileage": {"type": "string"}})
        use_case, _, schema_repository = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"mileage": {"type": "number"}},
            force=True,
            user_id=uuid4(),
        )

        schema_repository.migrate_attribute_to_number.assert_awaited_once()
        schema_repository.migrate_attribute_to_string.assert_not_awaited()


class TestForceRequiredPairs:
    """string->boolean requires force, BUT is never auto-migrated — force only
    allows the schema definition to be saved; existing product data is left
    untouched (no migrate_attribute_to_* call at all). Non-obvious enough to
    pin explicitly — a careless refactor could easily "fix" this into a
    silent auto-migration that was never asked for."""

    @pytest.mark.asyncio
    async def test_requires_force_and_warning_mentions_heuristic(self):
        category = _make_category(attribute_schema={"is_new": {"type": "string"}})
        use_case, _, _ = _make_use_case(category)

        with pytest.raises(SchemaMigrationRequiresForceError) as exc_info:
            await use_case.execute(
                category_id=category.id,
                tenant_id=uuid4(),
                new_schema={"is_new": {"type": "boolean"}},
                force=False,
                user_id=uuid4(),
            )

        assert exc_info.value.requires_force is True
        assert "heuristic" in exc_info.value.warnings[0]

    @pytest.mark.asyncio
    async def test_with_force_saves_schema_but_never_migrates_data(self):
        category = _make_category(attribute_schema={"is_new": {"type": "string"}})
        use_case, _, schema_repository = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"is_new": {"type": "boolean"}},
            force=True,
            user_id=uuid4(),
        )

        schema_repository.migrate_attribute_to_string.assert_not_awaited()
        schema_repository.migrate_attribute_to_number.assert_not_awaited()
        assert category.attribute_schema == {"is_new": {"type": "boolean"}}


class TestUnlistedTypeChangePair:
    """A type change not in either frozenset (e.g. string->object) still
    requires force, via the generic `else` branch."""

    @pytest.mark.asyncio
    async def test_requires_force_with_generic_warning(self):
        category = _make_category(attribute_schema={"metadata": {"type": "string"}})
        use_case, _, _ = _make_use_case(category, {"count_products_with_attribute": 3})

        with pytest.raises(SchemaMigrationRequiresForceError) as exc_info:
            await use_case.execute(
                category_id=category.id,
                tenant_id=uuid4(),
                new_schema={"metadata": {"type": "object"}},
                force=False,
                user_id=uuid4(),
            )

        assert exc_info.value.requires_force is True
        assert "3 products affected" in exc_info.value.warnings[0]
        assert "heuristic" not in exc_info.value.warnings[0]


class TestRequiredFieldChange:
    @pytest.mark.asyncio
    async def test_no_warning_when_newly_required_field_has_no_missing_products(self):
        category = _make_category(attribute_schema={"vin": {"type": "string", "required": False}})
        use_case, _, _ = _make_use_case(category, {"count_products_missing_attribute": 0})

        result = await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={"vin": {"type": "string", "required": True}},
            force=False,
            user_id=uuid4(),
        )

        assert result.migration_warnings == []

    @pytest.mark.asyncio
    async def test_requires_force_when_products_are_missing_the_now_required_field(self):
        category = _make_category(attribute_schema={"vin": {"type": "string", "required": False}})
        use_case, _, _ = _make_use_case(category, {"count_products_missing_attribute": 5})

        with pytest.raises(SchemaMigrationRequiresForceError) as exc_info:
            await use_case.execute(
                category_id=category.id,
                tenant_id=uuid4(),
                new_schema={"vin": {"type": "string", "required": True}},
                force=False,
                user_id=uuid4(),
            )

        assert exc_info.value.requires_force is True
        assert "5 products are missing" in exc_info.value.warnings[0]


class TestBuildSummary:
    @pytest.mark.asyncio
    async def test_summary_reports_added_removed_and_changed_fields(self):
        category = _make_category(
            attribute_schema={
                "removed_field": {"type": "string"},
                "changed_field": {"type": "string", "required": False},
            }
        )
        use_case, _, schema_repository = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={
                "changed_field": {"type": "string", "required": True},
                "added_field": {"type": "string"},
            },
            force=True,
            user_id=uuid4(),
        )

        call = schema_repository.save_schema_change.await_args.kwargs
        summary = call["change_summary"]
        assert "added: added_field" in summary
        assert "removed: removed_field" in summary
        assert "changed: changed_field" in summary

    @pytest.mark.asyncio
    async def test_summary_reports_no_structural_changes_for_identical_schema(self):
        schema: dict[str, dict[str, object]] = {"vin": {"type": "string"}}
        category = _make_category(attribute_schema=dict(schema))
        use_case, _, schema_repository = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema=dict(schema),
            force=False,
            user_id=uuid4(),
        )

        call = schema_repository.save_schema_change.await_args.kwargs
        assert call["change_summary"] == "no structural changes"


class TestNewGroups:
    @pytest.mark.asyncio
    async def test_attribute_groups_updated_when_provided(self):
        category = _make_category(attribute_groups=[{"key": "basic"}])
        use_case, _, _ = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={},
            force=False,
            user_id=uuid4(),
            new_groups=[{"key": "advanced"}],
        )

        assert category.attribute_groups == [{"key": "advanced"}]

    @pytest.mark.asyncio
    async def test_attribute_groups_left_untouched_when_not_provided(self):
        category = _make_category(attribute_groups=[{"key": "basic"}])
        use_case, _, _ = _make_use_case(category)

        await use_case.execute(
            category_id=category.id,
            tenant_id=uuid4(),
            new_schema={},
            force=False,
            user_id=uuid4(),
            new_groups=None,
        )

        assert category.attribute_groups == [{"key": "basic"}]
