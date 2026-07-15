"""Integration tests -- Subsystem D Phase 4: admin dealer endpoints.

Task 4.2 (RED): GET /admin/dealers returns the orgs list (200) for admin,
    403 for a seller without ORG_ADMIN_VIEW_ALL.
Task 4.4 (RED): GET /admin/dealers/{id}/products returns the dealer's
    products (200), 404 for an unknown dealer id.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def root_category(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> CategoryModel:
    """A root category usable as a vertical_id for create_dealer.

    tenant_id has a real FK to organizations, so this can't use a throwaway
    uuid4() -- it must point at an existing org, even though the application
    layer treats roots as tenant-agnostic (get_by_id_cross_tenant ignores it).
    """
    category = CategoryModel(
        id=uuid4(),
        name="Vehicles",
        slug=f"vehicles-{uuid4().hex[:8]}",
        tenant_id=test_organization.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()
    return category


@pytest.fixture
async def other_dealer(db_session: AsyncSession) -> OrganizationModel:
    """A second, unrelated dealer org with one product."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name="Other Dealer",
        status="active",
        description="Second dealer for admin endpoint tests",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()

    category = CategoryModel(
        id=uuid4(),
        name="Other Dealer Category",
        slug=f"other-dealer-category-{uuid4().hex[:8]}",
        tenant_id=org.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()

    product = ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=category.id,
        title="Other Dealer Product",
        price_cents=3_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return org


@pytest.fixture
async def pending_dealer_without_invitation(
    db_session: AsyncSession,
) -> OrganizationModel:
    """A dealer org in PENDING_VERIFICATION status with no invitation row yet.

    Distinct from `other_dealer` (status="active"): resend-invitation has a
    409 gate for non-pending dealers that fires before the 404-for-no-
    invitation check, so the no-invitation-yet test needs a dealer that is
    actually still pending.
    """
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name="Pending Dealer",
        status="pending_verification",
        description="Dealer awaiting verification, no invitation issued yet",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    return org


@pytest.mark.asyncio
async def test_admin_lists_all_dealers(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.2: admin (ORG_ADMIN_VIEW_ALL) sees the dealers list."""
    response = await async_client_as_admin.get("/api/v1/admin/organizations")

    assert response.status_code == 200
    names = {org["name"] for org in response.json()["organizations"]}
    assert other_dealer.name in names


@pytest.mark.asyncio
async def test_list_dealers_exposes_owner_email_from_latest_invitation(
    async_client_as_admin: AsyncClient,
    root_category: CategoryModel,
    other_dealer: OrganizationModel,
) -> None:
    """Dealers list includes owner_email (from latest invitation) so the
    admin edit form can display the owner; orgs without invitation get None."""
    create_response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Owner Email Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "list-owner@x.com",
        },
    )
    assert create_response.status_code == 201

    response = await async_client_as_admin.get("/api/v1/admin/organizations")

    assert response.status_code == 200
    by_name = {org["name"]: org for org in response.json()["organizations"]}
    assert by_name["Owner Email Motors"]["owner_email"] == "list-owner@x.com"
    assert by_name[other_dealer.name]["owner_email"] is None


@pytest.mark.asyncio
async def test_seller_cannot_list_dealers(
    async_client_as_seller: AsyncClient,
) -> None:
    """Task 4.2: seller without ORG_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.get("/api/v1/admin/organizations")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_lists_dealer_products(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.4: admin fetches a specific dealer's products."""
    response = await async_client_as_admin.get(
        f"/api/v1/admin/organizations/{other_dealer.id}/products"
    )

    assert response.status_code == 200
    titles = {p["title"] for p in response.json()["products"]}
    assert "Other Dealer Product" in titles


@pytest.mark.asyncio
async def test_admin_unknown_dealer_id_returns_404(
    async_client_as_admin: AsyncClient,
) -> None:
    """Task 4.4: unknown dealer id returns 404."""
    response = await async_client_as_admin.get(f"/api/v1/admin/organizations/{uuid4()}/products")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_seller_cannot_list_dealer_products(
    async_client_as_seller: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Task 4.4: seller without ORG_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.get(
        f"/api/v1/admin/organizations/{other_dealer.id}/products"
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_dealer_products_excludes_other_org_with_corrupt_tenant_id(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
    db_session: AsyncSession,
) -> None:
    """Code review finding: list_dealer_products passed tenant_id=None and
    relied solely on organization_id for isolation, ignoring the already
    -verified `dealer` object's own tenant_id. If a product row ever has
    organization_id=<this dealer> but a DIFFERENT (corrupt/migrated)
    tenant_id, the admin endpoint must not leak it -- the verified dealer's
    tenant_id must be enforced as a second filter, not just organization_id.
    """
    # tenant_id has a real FK to organizations, so the "corrupt" row needs a
    # THIRD, genuinely different org as its tenant -- organization_id still
    # points at other_dealer, simulating data where the two diverge.
    third_org_id = uuid4()
    third_org = OrganizationModel(
        id=third_org_id,
        tenant_id=third_org_id,
        name="Third Dealer",
        status="active",
        description="Holds the mismatched tenant_id for the corrupt-data test",
        settings={},
    )
    db_session.add(third_org)
    await db_session.flush()

    corrupt_category = CategoryModel(
        id=uuid4(),
        name="Corrupt Tenant Category",
        slug=f"corrupt-tenant-category-{uuid4().hex[:8]}",
        tenant_id=third_org_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(corrupt_category)
    await db_session.flush()

    corrupt_product = ProductModel(
        id=uuid4(),
        tenant_id=third_org_id,  # deliberately NOT other_dealer.tenant_id
        organization_id=other_dealer.id,
        category_id=corrupt_category.id,
        title="Corrupt Tenant Product",
        price_cents=999,
    )
    db_session.add(corrupt_product)
    await db_session.flush()

    response = await async_client_as_admin.get(
        f"/api/v1/admin/organizations/{other_dealer.id}/products"
    )

    assert response.status_code == 200
    titles = {p["title"] for p in response.json()["products"]}
    assert "Corrupt Tenant Product" not in titles


@pytest.mark.asyncio
async def test_create_dealer_requires_dealer_admin_view_all(
    async_client_as_seller: AsyncClient,
    root_category: CategoryModel,
) -> None:
    """Task 12: seller without ORG_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "owner@x.com",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_dealer_rejects_empty_verticals(
    async_client_as_admin: AsyncClient,
) -> None:
    """Task 12: at least one vertical is required (CreateOrganizationUseCase)."""
    response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={"name": "Acme Motors", "vertical_ids": [], "owner_email": "owner@x.com"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_dealer_rejects_unknown_vertical_id(
    async_client_as_admin: AsyncClient,
) -> None:
    """Task 12 / gap G4: a vertical_id with no matching root category 400s."""
    response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(uuid4())],
            "owner_email": "owner@x.com",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_dealer_rejects_invalid_email(
    async_client_as_admin: AsyncClient,
    root_category: CategoryModel,
) -> None:
    """Task 12 / gap G2: owner_email is EmailStr, not a bare str."""
    response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "not-an-email",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_dealer_happy_path(
    async_client_as_admin: AsyncClient,
    root_category: CategoryModel,
) -> None:
    """Task 12: creates the org, enables the vertical, and invites the owner."""
    response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "newowner@x.com",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["organization_id"]
    assert body["email"] == "newowner@x.com"
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_resend_invitation_requires_dealer_admin_view_all(
    async_client_as_seller: AsyncClient,
) -> None:
    """Task 12: seller without ORG_ADMIN_VIEW_ALL gets 403."""
    response = await async_client_as_seller.post(
        f"/api/v1/admin/organizations/{uuid4()}/resend-invitation",
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_resend_invitation_404s_for_unknown_dealer(
    async_client_as_admin: AsyncClient,
) -> None:
    """Task 12: an unknown dealer_id 404s."""
    response = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{uuid4()}/resend-invitation",
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_resend_invitation_404s_when_dealer_has_no_invitation_yet(
    async_client_as_admin: AsyncClient,
    pending_dealer_without_invitation: OrganizationModel,
) -> None:
    """Task 12: a dealer org with no OrganizationInvitation row yet 404s."""
    response = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{pending_dealer_without_invitation.id}/resend-invitation",
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_resend_invitation_happy_path_reissues_the_pending_invitation(
    async_client_as_admin: AsyncClient,
    root_category: CategoryModel,
) -> None:
    """Task 12: resend reuses the existing pending invitation with a fresh token."""
    create_response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "resend-owner@x.com",
        },
    )
    dealer_id = create_response.json()["organization_id"]
    first_invitation_id = create_response.json()["invitation_id"]

    response = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{dealer_id}/resend-invitation",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["invitation_id"] == first_invitation_id  # same row, fresh token
    assert body["email"] == "resend-owner@x.com"
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_resend_invitation_409s_when_dealer_is_not_pending_verification(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    root_category: CategoryModel,
) -> None:
    """Code review CR-1: server-side gate -- resend must reject non-pending dealers.

    The UI hides the button on active dealers, but a scripted caller (or an
    admin acting on a stale dashboard) can still POST. Without this gate, the
    API would silently issue a brand-new pending invitation to a historical
    email (or to a prior owner whose email was changed), which is both
    operationally confusing and a vector for impersonation phish.
    """
    create_response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "already-active@x.com",
        },
    )
    assert create_response.status_code == 201
    dealer_id = create_response.json()["organization_id"]

    # Simulate the owner having already accepted -- flips the dealer to active
    # without going through the full T13 accept flow (we only care that the
    # resend endpoint sees a non-pending status).
    dealer = await db_session.get(OrganizationModel, dealer_id)
    assert dealer is not None
    dealer.status = "active"
    await db_session.flush()

    response = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{dealer_id}/resend-invitation",
    )

    assert response.status_code == 409
    assert "pending" in response.json()["detail"].lower()


# -----------------------------------------------------------------------------
# Broker phone
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_broker_phone_roundtrip_create_list_update(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Brokers carry an optional phone: create echoes it, list returns it,
    and PATCH can change it (pending brokers only, as with name/email)."""
    create = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{other_dealer.id}/brokers",
        json={"name": "Ana Broker", "email": "ana@x.com", "phone": "+58 412 5551234"},
    )
    assert create.status_code == 201
    body = create.json()
    assert body["phone"] == "+58 412 5551234"
    broker_id = body["id"]

    listing = await async_client_as_admin.get(
        f"/api/v1/admin/organizations/{other_dealer.id}/brokers"
    )
    assert listing.status_code == 200
    assert listing.json()["brokers"][0]["phone"] == "+58 412 5551234"

    patched = await async_client_as_admin.patch(
        f"/api/v1/admin/organizations/{other_dealer.id}/brokers/{broker_id}",
        json={"phone": "+58 424 0000000"},
    )
    assert patched.status_code == 200
    assert patched.json()["phone"] == "+58 424 0000000"


@pytest.mark.asyncio
async def test_broker_phone_is_optional(
    async_client_as_admin: AsyncClient,
    other_dealer: OrganizationModel,
) -> None:
    """Brokers without phone still work; phone comes back as None."""
    create = await async_client_as_admin.post(
        f"/api/v1/admin/organizations/{other_dealer.id}/brokers",
        json={"name": "Sin Fono", "email": "sinfono@x.com"},
    )
    assert create.status_code == 201
    assert create.json()["phone"] is None


@pytest.mark.asyncio
async def test_create_dealer_accepts_brokers_with_phone(
    async_client_as_admin: AsyncClient,
    root_category: CategoryModel,
) -> None:
    """POST /admin/dealers accepts brokers[].phone and persists it."""
    create_response = await async_client_as_admin.post(
        "/api/v1/admin/organizations",
        json={
            "name": "Broker Phone Motors",
            "vertical_ids": [str(root_category.id)],
            "owner_email": "owner-bp@x.com",
            "brokers": [{"name": "Beto", "email": "beto@x.com", "phone": "+58 416 7778899"}],
        },
    )
    assert create_response.status_code == 201
    dealer_id = create_response.json()["organization_id"]

    listing = await async_client_as_admin.get(f"/api/v1/admin/organizations/{dealer_id}/brokers")
    assert listing.status_code == 200
    assert listing.json()["brokers"][0]["phone"] == "+58 416 7778899"
