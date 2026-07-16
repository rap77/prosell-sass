"""Subsystem D — Permission enum + ROLE_PERMISSIONS map correctness.

Verifies the two new permissions introduced by Subsystem D:
  * ORG_ADMIN_VIEW_ALL — super_admin/admin can browse all dealers
  * MARKETPLACE_PUBLISH  — admin+ can publish any dealer's products

Pure unit tests, no DB, no HTTP. See design.md for the role assignment.
"""

from __future__ import annotations

import pytest

from prosell.domain.entities.role import (
    ROLE_PERMISSIONS,
    Permission,
    RoleType,
)


class TestSubsystemDPermissionsExist:
    """Task 1.1: the two new permissions are part of the enum."""

    def test_dealer_admin_view_all_in_enum(self) -> None:
        assert hasattr(Permission, "ORG_ADMIN_VIEW_ALL")
        assert Permission.ORG_ADMIN_VIEW_ALL.value == "org:admin_view_all"

    def test_marketplace_publish_in_enum(self) -> None:
        assert hasattr(Permission, "MARKETPLACE_PUBLISH")
        assert Permission.MARKETPLACE_PUBLISH.value == "marketplace:publish"


def _perms_for(role: RoleType) -> set[Permission]:
    return ROLE_PERMISSIONS.get(role, set())


class TestSubsystemDRoleAssignments:
    """Task 1.3: each role has the right set of new permissions."""

    def test_super_admin_has_both_new_permissions(self) -> None:
        perms = _perms_for(RoleType.SUPER_ADMIN)
        assert Permission.ORG_ADMIN_VIEW_ALL in perms
        assert Permission.MARKETPLACE_PUBLISH in perms

    def test_admin_has_both_new_permissions(self) -> None:
        perms = _perms_for(RoleType.ADMIN)
        assert Permission.ORG_ADMIN_VIEW_ALL in perms
        assert Permission.MARKETPLACE_PUBLISH in perms

    def test_manager_has_marketplace_only(self) -> None:
        perms = _perms_for(RoleType.MANAGER)
        # Manager can publish their own dealer's products but not browse all dealers
        assert Permission.MARKETPLACE_PUBLISH in perms
        assert Permission.ORG_ADMIN_VIEW_ALL not in perms

    @pytest.mark.parametrize(
        "role",
        [RoleType.SALES_AGENT, RoleType.SALES_USER, RoleType.VIEWER],
    )
    def test_seller_roles_have_neither_new_permission(self, role: RoleType) -> None:
        perms = _perms_for(role)
        assert Permission.ORG_ADMIN_VIEW_ALL not in perms
        assert Permission.MARKETPLACE_PUBLISH not in perms


class TestSubsystemDPermissionLeakPrevention:
    """No role accidentally gains the wrong new permission."""

    def test_no_role_outside_admin_family_has_admin_view_all(self) -> None:
        for role in RoleType:
            if role not in (RoleType.SUPER_ADMIN, RoleType.ADMIN):
                perms = _perms_for(role)
                assert Permission.ORG_ADMIN_VIEW_ALL not in perms, (
                    f"Role {role.value} should NOT have ORG_ADMIN_VIEW_ALL"
                )

    def test_no_role_outside_admin_family_has_marketplace_publish(self) -> None:
        for role in RoleType:
            if role not in (RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.MANAGER):
                perms = _perms_for(role)
                assert Permission.MARKETPLACE_PUBLISH not in perms, (
                    f"Role {role.value} should NOT have MARKETPLACE_PUBLISH"
                )
