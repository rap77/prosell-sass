"""PatchCategorySchemaUseCase — apply schema change with migration warnings and audit log."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from prosell.domain.exceptions.category_exceptions import (
    CategoryNotFoundError,
    SchemaMigrationRequiresForceError,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.category_schema_repository import (
    AbstractCategorySchemaRepository,
)

_AUTO_MIGRATE_PAIRS: frozenset[tuple[str, str]] = frozenset(
    {
        ("number", "string"),
        ("string", "number"),
        ("boolean", "string"),
    }
)
_FORCE_REQUIRED_PAIRS: frozenset[tuple[str, str]] = frozenset(
    {
        ("string", "boolean"),
    }
)


@dataclass
class PatchSchemaResult:
    schema: dict[str, Any]
    schema_version: str  # ISO timestamp of updated_at
    migration_warnings: list[str] = field(default_factory=list)
    requires_force: bool = False


class PatchCategorySchemaUseCase:
    """
    Replaces category attribute_schema with migration warnings and audit log.

    Two-step client flow:
    1. PATCH without force=True → raises SchemaMigrationRequiresForceError if warnings
    2. PATCH with force=True → applies schema, migrates compatible type casts, writes audit log
    """

    def __init__(
        self,
        category_repository: AbstractCategoryRepository,
        schema_repository: AbstractCategorySchemaRepository,
    ) -> None:
        self._repo = category_repository
        self._schema_repo = schema_repository

    async def execute(
        self,
        category_id: UUID,
        tenant_id: UUID,
        new_schema: dict[str, Any],
        force: bool,
        user_id: UUID,
    ) -> PatchSchemaResult:
        category = await self._repo.get_by_id_or_global(category_id, tenant_id)
        if not category:
            raise CategoryNotFoundError(str(category_id))

        old_schema: dict[str, Any] = category.attribute_schema or {}

        warnings, requires_force = await self._detect_warnings(
            category_id=category_id,
            tenant_id=tenant_id,
            old_schema=old_schema,
            new_schema=new_schema,
        )

        if warnings and not force:
            raise SchemaMigrationRequiresForceError(
                warnings=warnings, requires_force=requires_force
            )

        category.attribute_schema = new_schema
        category.updated_at = datetime.now(UTC)
        updated_category = await self._repo.update(category)

        if force:
            await self._apply_compatible_migrations(
                category_id=category_id,
                tenant_id=tenant_id,
                old_schema=old_schema,
                new_schema=new_schema,
            )

        await self._schema_repo.save_schema_change(
            category_id=category_id,
            changed_by_user_id=user_id,
            changed_at=datetime.now(UTC),
            previous_attributes=old_schema or None,
            new_attributes=new_schema,
            migration_applied=force and bool(warnings),
            migration_warnings=warnings,
            change_summary=self._build_summary(old_schema, new_schema),
        )

        return PatchSchemaResult(
            schema=updated_category.attribute_schema,
            schema_version=updated_category.updated_at.isoformat(),
            migration_warnings=warnings,
            requires_force=False,
        )

    async def _detect_warnings(
        self,
        category_id: UUID,
        tenant_id: UUID,
        old_schema: dict[str, Any],
        new_schema: dict[str, Any],
    ) -> tuple[list[str], bool]:
        warnings: list[str] = []
        requires_force = False

        for field_name, new_def in new_schema.items():
            old_def = old_schema.get(field_name)
            if old_def is None:
                continue

            old_type = str(old_def.get("type", "string"))
            new_type = str(new_def.get("type", "string"))
            old_required = bool(old_def.get("required", False))
            new_required = bool(new_def.get("required", False))

            if old_type != new_type:
                count = await self._schema_repo.count_products_with_attribute(
                    category_id, tenant_id, field_name
                )
                if (old_type, new_type) in _FORCE_REQUIRED_PAIRS:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} requires ?force=true "
                        f"({count} products affected, conversion is heuristic)"
                    )
                elif (old_type, new_type) in _AUTO_MIGRATE_PAIRS:
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} "
                        f"({count} products will be auto-migrated)"
                    )
                else:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} requires ?force=true "
                        f"({count} products affected)"
                    )

            if not old_required and new_required:
                missing_count = await self._schema_repo.count_products_missing_attribute(
                    category_id, tenant_id, field_name
                )
                if missing_count > 0:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' changed to required=true but "
                        f"{missing_count} products are missing this attribute "
                        f"— requires ?force=true"
                    )

        return warnings, requires_force

    async def _apply_compatible_migrations(
        self,
        category_id: UUID,
        tenant_id: UUID,
        old_schema: dict[str, Any],
        new_schema: dict[str, Any],
    ) -> None:
        for field_name, new_def in new_schema.items():
            old_def = old_schema.get(field_name)
            if old_def is None:
                continue
            old_type = str(old_def.get("type", "string"))
            new_type = str(new_def.get("type", "string"))
            if old_type == new_type or (old_type, new_type) not in _AUTO_MIGRATE_PAIRS:
                continue

            if new_type == "string":
                await self._schema_repo.migrate_attribute_to_string(
                    category_id, tenant_id, field_name
                )
            elif new_type == "number":
                await self._schema_repo.migrate_attribute_to_number(
                    category_id, tenant_id, field_name
                )

    @staticmethod
    def _build_summary(old_schema: dict[str, Any], new_schema: dict[str, Any]) -> str:
        added = [k for k in new_schema if k not in old_schema]
        removed = [k for k in old_schema if k not in new_schema]
        changed = [k for k in new_schema if k in old_schema and old_schema[k] != new_schema[k]]
        parts = []
        if added:
            parts.append(f"added: {', '.join(added)}")
        if removed:
            parts.append(f"removed: {', '.join(removed)}")
        if changed:
            parts.append(f"changed: {', '.join(changed)}")
        return "; ".join(parts) or "no structural changes"
