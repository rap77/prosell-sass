# Marketplace Publish Fusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `published_to_marketplace` a direct, automatic consequence of product approval instead of a disconnected manual toggle, so an approved product is never silently invisible to the Facebook sync bot again.

**Architecture:** `Product.approve()` (domain entity) sets `published_to_marketplace = True`; `Product.reverse_publication()` sets it back to `False`. Both are already the single call site shared by the individual-approve and batch-approve use cases, so this is a one-line change per method with no use-case-layer duplication. The manual PATCH path is closed at the DTO/router/use-case layer. A one-time Alembic migration backfills already-broken production data. The frontend loses the now-redundant checkbox in `UnifiedProductForm`.

**Tech Stack:** FastAPI + Pydantic 2, SQLAlchemy 2.0 async, Alembic, pytest/pytest-asyncio, Next.js 16 / React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md`

## Global Constraints

- Never touch `fb_sync_router.py`'s query logic — confirmed correct, out of scope.
- Never build `fb_account_ids` behavior — untouched, orthogonal concern.
- Do not add a standalone "unpublish from FB, stay PUBLISHED" action — `pause()` already covers it (confirmed with user, YAGNI).
- `pause()` / `reserve()` / `mark_sold()` must NOT be touched — they correctly leave `published_to_marketplace` at its current value; only `approve()` and `reverse_publication()` change it.
- Conventional commits, no `Co-Authored-By`, no `--no-verify`.
- TDD: write the failing test before the implementation in every task.

---

### Task 1: Domain — `approve()` sets `published_to_marketplace = True`

**Files:**

- Modify: `apps/api/src/prosell/domain/entities/product.py:204-224`
- Test: `apps/api/tests/unit/test_entities/test_product.py:82-104`

**Interfaces:**

- Consumes: nothing new — `Product.approve(user_id: UUID) -> None` keeps its existing signature.
- Produces: after `approve()`, `product.published_to_marketplace is True`. Task 3 (batch/single integration tests) and Task 5 (frontend) rely on this.

- [x] **Step 1: Extend the failing test**

In `apps/api/tests/unit/test_entities/test_product.py`, extend `test_approve_product` (do not duplicate a new test — same action, same setup):

```python
    def test_approve_product(self) -> None:
        """Test approving a product."""
        tenant_id = uuid4()
        org_id = uuid4()
        category_id = uuid4()
        user_id = uuid4()

        product = Product.create(
            title="Test Product",
            price_cents=10000,
            tenant_id=tenant_id,
            organization_id=org_id,
            category_id=category_id,
        )
        product.submit_for_approval(user_id)
        approver_id = uuid4()

        product.approve(approver_id)

        assert product.status == ProductStatus.PUBLISHED
        assert product.approved_by == approver_id
        assert product.approved_at is not None
        assert product.published_at is not None
        assert product.published_to_marketplace is True
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/test_entities/test_product.py::TestProduct::test_approve_product -v`
Expected: FAIL — `assert False is True` (the field still defaults to `False`).

- [x] **Step 3: Implement — set the flag in `approve()`**

In `apps/api/src/prosell/domain/entities/product.py`, replace:

```python
    def approve(self, user_id: UUID) -> None:
        """
        Approve product (auto-publishes).

        Args:
            user_id: ID of user approving

        Raises:
            ValueError: If product cannot be approved
        """
        if not self.status.can_approve():
            raise ValueError(
                f"Cannot approve product with status {self.status.value}. "
                f"Only PENDING products can be approved."
            )

        self.status = ProductStatus.PUBLISHED
        self.approved_at = datetime.now(UTC)
        self.approved_by = user_id
        self.published_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)
```

with:

```python
    def approve(self, user_id: UUID) -> None:
        """
        Approve product (auto-publishes, including to the FB marketplace).

        Approval is the single moment products become eligible for the FB
        sync bot — see reverse_publication() for the symmetric undo.

        Args:
            user_id: ID of user approving

        Raises:
            ValueError: If product cannot be approved
        """
        if not self.status.can_approve():
            raise ValueError(
                f"Cannot approve product with status {self.status.value}. "
                f"Only PENDING products can be approved."
            )

        self.status = ProductStatus.PUBLISHED
        self.approved_at = datetime.now(UTC)
        self.approved_by = user_id
        self.published_at = datetime.now(UTC)
        self.published_to_marketplace = True
        self.updated_at = datetime.now(UTC)
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/test_entities/test_product.py::TestProduct::test_approve_product -v`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add apps/api/src/prosell/domain/entities/product.py apps/api/tests/unit/test_entities/test_product.py
git commit -m "feat(products): approve() auto-enables marketplace publish"
```

---

### Task 2: Domain — `reverse_publication()` resets `published_to_marketplace = False`

**Files:**

- Modify: `apps/api/src/prosell/domain/entities/product.py:350-367`
- Test: `apps/api/tests/unit/domain/test_product_reverse_transitions.py`

**Interfaces:**

- Consumes: `Product.reverse_publication() -> None` (no signature change).
- Produces: after `reverse_publication()`, `product.published_to_marketplace is False`. Task 3's reverse-transitions API test relies on this.

- [x] **Step 1: Extend the test helper and write the failing test**

In `apps/api/tests/unit/domain/test_product_reverse_transitions.py`, extend `_create_product` with an optional param:

```python
def _create_product(
    status: ProductStatus,
    published_at: datetime | None = None,
    rejection_reason: str | None = None,
    archived_from_status: str | None = None,
    published_to_marketplace: bool = False,
) -> Product:
    """Helper to create a product with given status."""
    return Product(
        id=uuid4(),
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
        title="Test Vehicle",
        description="Test description",
        price_cents=1000000,
        currency="USD",
        status=status,
        published_at=published_at,
        rejection_reason=rejection_reason,
        archived_from_status=archived_from_status,
        published_to_marketplace=published_to_marketplace,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
```

Add a new test inside `class TestReversePublication`:

```python
    def test_reverse_publication_clears_marketplace_flag(self):
        product = _create_product(
            ProductStatus.PUBLISHED,
            published_at=datetime.now(UTC),
            published_to_marketplace=True,
        )

        product.reverse_publication()

        assert product.published_to_marketplace is False
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_product_reverse_transitions.py::TestReversePublication::test_reverse_publication_clears_marketplace_flag -v`
Expected: FAIL — `assert True is False`

- [x] **Step 3: Implement — reset the flag in `reverse_publication()`**

In `apps/api/src/prosell/domain/entities/product.py`, replace:

```python
    def reverse_publication(self) -> None:
        """
        Reverse a published product back to PENDING (undo approval).

        Who performed the reversal is recorded via repo.update()'s audit log,
        not on the entity — there is no "reversed_by" field.

        Raises:
            ProductInvalidStatusTransitionError: If product is not PUBLISHED
        """
        if self.status != ProductStatus.PUBLISHED:
            raise ProductInvalidStatusTransitionError(
                self.status.value, ProductStatus.PENDING.value
            )

        self.status = ProductStatus.PENDING
        self.published_at = None
        self.updated_at = datetime.now(UTC)
```

with:

```python
    def reverse_publication(self) -> None:
        """
        Reverse a published product back to PENDING (undo approval).

        Symmetric counterpart to approve(): resets published_to_marketplace
        so a later re-approval is a fresh decision, not a stale leftover.
        Who performed the reversal is recorded via repo.update()'s audit log,
        not on the entity — there is no "reversed_by" field.

        Raises:
            ProductInvalidStatusTransitionError: If product is not PUBLISHED
        """
        if self.status != ProductStatus.PUBLISHED:
            raise ProductInvalidStatusTransitionError(
                self.status.value, ProductStatus.PENDING.value
            )

        self.status = ProductStatus.PENDING
        self.published_at = None
        self.published_to_marketplace = False
        self.updated_at = datetime.now(UTC)
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_product_reverse_transitions.py -v`
Expected: PASS (all tests in the file, including the new one)

- [x] **Step 5: Commit**

```bash
git add apps/api/src/prosell/domain/entities/product.py apps/api/tests/unit/domain/test_product_reverse_transitions.py
git commit -m "feat(products): reverse_publication() clears marketplace publish flag"
```

---

### Task 3: Integration tests — approve/batch-approve/reverse set the flag end-to-end

**Files:**

- Create: `apps/api/tests/integration/api/test_product_approve_marketplace_fusion.py`
- Modify: `apps/api/tests/integration/api/test_product_reverse_transitions_api.py`

**Interfaces:**

- Consumes: `Product.approve()`/`reverse_publication()` from Tasks 1-2 (already wired into `ApproveProductUseCase`, `BatchApproveProductsUseCase`, and `reverse_product` router endpoint — no use-case or router code changes needed here).
- Produces: nothing new consumed downstream — this task is pure verification.

- [x] **Step 1: Write the failing integration tests (new file)**

Create `apps/api/tests/integration/api/test_product_approve_marketplace_fusion.py`:

```python
"""Integration tests -- approving a product auto-enables marketplace publish.

Covers the fusion design: docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


async def _create_pending_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1_000_000,
        status="pending",
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_approve_endpoint_enables_marketplace_publish(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_pending_product(db_session, test_organization, test_category)

    response = await async_client_as_admin.post(f"/api/v1/products/{product.id}/approve")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "published"
    assert data["published_to_marketplace"] is True


@pytest.mark.asyncio
async def test_batch_approve_enables_marketplace_publish(
    async_client_as_admin: AsyncClient,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    product = await _create_pending_product(db_session, test_organization, test_category)

    response = await async_client_as_admin.post(
        "/api/v1/products/batch/approve",
        json={"product_ids": [str(product.id)]},
    )

    assert response.status_code == 200
    assert response.json()["approved_count"] == 1

    repo = SqlAlchemyProductRepository(db_session)
    approved = await repo.get_by_id(product.id, test_organization.tenant_id)
    assert approved is not None
    assert approved.published_to_marketplace is True
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_approve_marketplace_fusion.py -v`
Expected: FAIL on both — `published_to_marketplace` still `False` if Task 1 wasn't applied. If Task 1 IS already applied (this task runs after it), this step instead confirms they already PASS — in that case skip straight to Step 3's verification, no separate red state exists for this specific test file since the domain change already landed. Run it anyway to confirm current status before moving on.

- [x] **Step 3: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_approve_marketplace_fusion.py -v`
Expected: PASS (Task 1 already made this true; this step is the verification that the whole stack — router, use case, repository round-trip — agrees)

- [x] **Step 4: Extend the reverse-transitions API test file**

In `apps/api/tests/integration/api/test_product_reverse_transitions_api.py`, extend the local `_create_product` helper with the same optional param used in Task 2, and add a test to `class TestReverseEndpoint`:

```python
async def _create_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    *,
    status: str,
    archived_from_status: str | None = None,
    published_to_marketplace: bool = False,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1_000_000,
        status=status,
        archived_from_status=archived_from_status,
        published_to_marketplace=published_to_marketplace,
    )
    db_session.add(product)
    await db_session.flush()
    return product
```

```python
    @pytest.mark.asyncio
    async def test_reverse_published_product_clears_marketplace_flag(
        self,
        async_client_as_admin: AsyncClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        product = await _create_product(
            db_session,
            test_organization,
            test_category,
            status="published",
            published_to_marketplace=True,
        )

        response = await async_client_as_admin.post(
            f"/api/v1/products/{product.id}/reverse",
            headers={"If-Match": "1"},
        )

        assert response.status_code == 200
        assert response.json()["published_to_marketplace"] is False
```

- [x] **Step 5: Run the full reverse-transitions test file**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_reverse_transitions_api.py -v`
Expected: PASS (all tests, including the new one)

- [x] **Step 6: Commit**

```bash
git add apps/api/tests/integration/api/test_product_approve_marketplace_fusion.py apps/api/tests/integration/api/test_product_reverse_transitions_api.py
git commit -m "test(products): verify approve/batch-approve/reverse marketplace publish fusion end-to-end"
```

---

### Task 4: Close the manual PATCH path

**Files:**

- Modify: `apps/api/src/prosell/application/dto/product/update.py:33-36`
- Modify: `apps/api/src/prosell/application/use_cases/product/update_product.py:128-129`
- Modify: `apps/api/src/prosell/infrastructure/api/routers/product_router.py:1076-1084`
- Modify: `apps/api/tests/integration/api/test_product_marketplace_publish_gate.py` (full rewrite)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `UpdateProductRequest` no longer has a `published_to_marketplace` field. Nothing later in this plan depends on it still existing.

- [x] **Step 1: Rewrite the failing test file**

Replace the full contents of `apps/api/tests/integration/api/test_product_marketplace_publish_gate.py`:

```python
"""Integration tests -- published_to_marketplace is no longer PATCHable.

Marketplace-publish fusion (2026-08-21): the flag is now a pure consequence
of Product.approve()/reverse_publication() (see
docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md).
A client still sending the field on PATCH gets it silently ignored --
Pydantic drops unknown fields by default on this DTO (no `extra="forbid"`),
so this is NOT a breaking 422 for stale integrations.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest.fixture
async def own_tenant_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    """Product belonging to the default test tenant, already published."""
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Marketplace Gate Product",
        price_cents=1_000_000,
        status="published",
        published_to_marketplace=False,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_patch_published_to_marketplace_is_ignored(
    async_client_as_admin: AsyncClient,
    own_tenant_product: ProductModel,
) -> None:
    """PATCH no longer accepts published_to_marketplace -- silently dropped."""
    response = await async_client_as_admin.patch(
        f"/api/v1/products/{own_tenant_product.id}",
        json={"published_to_marketplace": True},
    )

    assert response.status_code == 200
    assert response.json()["published_to_marketplace"] is False
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_marketplace_publish_gate.py -v`
Expected: FAIL — the current code still applies the field, so `published_to_marketplace` comes back `True`.

- [x] **Step 3: Remove the field from the DTO**

In `apps/api/src/prosell/application/dto/product/update.py`, delete these lines entirely:

```python
    # Gated behind Permission.MARKETPLACE_PUBLISH at the router boundary —
    # the DTO accepts the field unconditionally; the permission check
    # depends on the auth context, not the request shape.
    published_to_marketplace: bool | None = None
```

(Leave `organization_id` and `fb_account_ids`, which follow immediately after, untouched.)

- [x] **Step 4: Remove the field application in the use case**

In `apps/api/src/prosell/application/use_cases/product/update_product.py`, delete:

```python
        if request.published_to_marketplace is not None:
            product.published_to_marketplace = request.published_to_marketplace
```

- [x] **Step 5: Remove the permission gate in the router**

In `apps/api/src/prosell/infrastructure/api/routers/product_router.py`, delete:

```python
    # Gate `published_to_marketplace` behind MARKETPLACE_PUBLISH. Checked at
    # the router boundary (depends on the auth context, not the entity).
    if request.published_to_marketplace is not None and not current_user.has_permission(
        Permission.MARKETPLACE_PUBLISH
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User lacks permission to publish products to the marketplace",
        )

```

(Keep the blank line separating the previous `image_urls` tenant check from the next `organization_id` cascade check.)

- [x] **Step 6: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_marketplace_publish_gate.py -v`
Expected: PASS

- [x] **Step 7: Run the full product test suite to catch any other regression**

Run: `cd apps/api && uv run pytest tests/unit/test_entities/test_product.py tests/unit/application/dto/product/test_update_dto.py tests/integration/use_cases/test_update_product_use_case.py tests/integration/api/ -v`
Expected: PASS. If `test_update_dto.py` or `test_update_product_use_case.py` reference `published_to_marketplace` anywhere (they didn't at plan-writing time — verify with `grep -n "published_to_marketplace"` on both files first), fix inline: those references would be testing a field that no longer exists.

- [x] **Step 8: Typecheck**

Run: `cd apps/api && uv run pyright`
Expected: no new errors (the field removal shouldn't be referenced anywhere else — Task 3's new test files never reference it either).

- [x] **Step 9: Commit**

```bash
git add apps/api/src/prosell/application/dto/product/update.py apps/api/src/prosell/application/use_cases/product/update_product.py apps/api/src/prosell/infrastructure/api/routers/product_router.py apps/api/tests/integration/api/test_product_marketplace_publish_gate.py
git commit -m "fix(products): close manual PATCH path for published_to_marketplace

approve()/reverse_publication() are now the only way this flag changes."
```

---

### Task 5: Backfill migration for already-broken data

**Files:**

- Create: `apps/api/alembic/versions/20260821_0001-backfill_published_to_marketplace.py`

**Interfaces:**

- Consumes: nothing from earlier tasks (pure data migration).
- Produces: nothing consumed later in this plan.

- [x] **Step 1: Confirm the current migration head**

Run: `cd apps/api && uv run alembic heads`
Expected output: `20260818_0002 (head)` — if a different revision id shows up, use that exact string as `down_revision` in Step 2 instead of `20260818_0002`.

- [x] **Step 2: Write the migration**

Create `apps/api/alembic/versions/20260821_0001-backfill_published_to_marketplace.py`:

```python
"""Backfill published_to_marketplace for already-approved products

Marketplace-publish fusion (2026-08-21): approve() now sets
published_to_marketplace=True automatically, but products approved before
this change are stuck at the old default (False) with no way to fix them
from the UI anymore (the manual PATCH path was removed in the same change).
This is a one-time repair so existing inventory isn't orphaned.

See docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md.

Revision ID: 20260821_0001
Revises: 20260818_0002
Create Date: 2026-08-21 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260821_0001"
down_revision: str | Sequence[str] | None = "20260818_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE products "
            "SET published_to_marketplace = true "
            "WHERE status = 'published' AND published_to_marketplace = false"
        )
    )


def downgrade() -> None:
    # Irreversible by design: we cannot distinguish products that were
    # backfilled here from ones a user later legitimately re-toggled true
    # via approve(). No-op downgrade, same pattern as other data-only
    # migrations in this codebase.
    pass
```

- [x] **Step 2: Apply it locally against the dev DB and verify**

Run: `cd apps/api && uv run alembic upgrade head`
Expected: migration `20260821_0001` runs with no errors.

Verify against staging (where the Kia Optima bug was originally found):

```bash
docker exec prosell-staging-db psql -U postgres -d prosell_staging -c \
  "SELECT status, published_to_marketplace, count(*) FROM products GROUP BY 1, 2 ORDER BY 1, 2;"
```

Expected: no row with `status='published'` and `published_to_marketplace=f` remains. (Staging needs this same migration applied there too — that's a deploy step, not part of this task; note it for the deploy checklist.)

- [x] **Step 3: Commit**

```bash
git add apps/api/alembic/versions/20260821_0001-backfill_published_to_marketplace.py
git commit -m "fix(products): backfill published_to_marketplace for pre-fusion approvals"
```

---

### Task 6: Frontend — remove the manual toggle from `UnifiedProductForm`

**Files:**

- Modify: `apps/web/src/components/forms/UnifiedProductForm.tsx`

**Interfaces:**

- Consumes: `existingProduct.published_to_marketplace` (already on the `Product` type, `apps/web/src/types/product.ts:66`) — read-only now, no local override state.
- Produces: nothing new consumed elsewhere. `ProductCard`/`CatalogDetailView` already read `product.published_to_marketplace` directly from the API response — untouched by this task.

- [x] **Step 1: Remove `fbOverride` state and its resets**

In `apps/web/src/components/forms/UnifiedProductForm.tsx`, delete line 199:

```typescript
// Facebook Marketplace toggle - use existing value as initial, track local override
const [fbOverride, setFbOverride] = useState<boolean | null>(null);
```

Delete the `setFbOverride(null);` line inside the mode-reset effect (~line 338):

```typescript
useEffect(() => {
  if (mode !== "edit") {
    initializedOwnershipProductId.current = null;
    /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on mode change */
    setPendingBrokers([]);
    setSelectedOrgId(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }
}, [mode]);
```

Delete the `setFbOverride(null);` line inside the product-switch reset effect (~line 353):

```typescript
useEffect(() => {
  if (mode === "edit" && initializedOwnershipProductId.current !== productId) {
    setPendingBrokers([]);
    setSelectedOrgId(null);
    setOrgDirty(false);
    setBrokersDirty(false);
  }
}, [mode, productId]);
```

- [x] **Step 2: Replace the derived `publishToFB`/`fbDirty` with a plain read**

Replace (~line 280-288):

```typescript
// Derived FB state (must be after existingProduct declaration)
const publishToFB =
  fbOverride ?? existingProduct?.published_to_marketplace ?? false;
const { data: fbAccounts = [] } = useFBAccounts({}, publishToFB);
// Derived FB accounts: null=not dirty, []=any account, [ids]=specific
const selectedFbAccounts =
  fbAccountsOverride ?? existingProduct?.fb_account_ids ?? [];
const fbAccountsDirty = fbAccountsOverride !== null;
const fbDirty = fbOverride !== null;
```

with:

```typescript
// Derived FB state (must be after existingProduct declaration).
// published_to_marketplace is now a read-only consequence of approve() —
// no local override, see docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md
const isPublishedToFB = existingProduct?.published_to_marketplace ?? false;
const { data: fbAccounts = [] } = useFBAccounts({}, isPublishedToFB);
// Derived FB accounts: null=not dirty, []=any account, [ids]=specific
const selectedFbAccounts =
  fbAccountsOverride ?? existingProduct?.fb_account_ids ?? [];
const fbAccountsDirty = fbAccountsOverride !== null;
```

- [x] **Step 3: Stop sending the field in the PATCH payload**

Delete (~line 511):

```typescript
      // ponytail: FB marketplace toggle only sent when dirty
      ...(fbDirty ? { published_to_marketplace: publishToFB } : {}),
```

- [x] **Step 4: Replace the checkbox with a read-only indicator**

Replace (~line 748-773):

```tsx
      {/* Facebook Marketplace */}
      <section className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ps-text-primary">
          <Facebook className="h-5 w-5 text-ps-cyan" />
          Facebook Marketplace
        </h2>
        <label className="flex cursor-pointer items-center gap-3 text-ps-text-primary">
          <input
            type="checkbox"
            checked={publishToFB}
            onChange={(e) => setFbOverride(e.target.checked)}
            disabled={isDisabled}
            className="h-5 w-5 cursor-pointer rounded border-ps-border-default accent-ps-cyan focus:ring-ps-cyan"
          />
          <div>
            <span className="font-medium">
              Publicar en Facebook Marketplace
            </span>
            <p className="text-sm text-ps-text-secondary">
              El bot publicará este producto en los grupos de FB configurados
            </p>
          </div>
        </label>

        {/* FB Account multi-select — only visible when publishing */}
        {publishToFB && fbAccounts.length > 0 && (
```

with:

```tsx
      {/* Facebook Marketplace */}
      <section className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ps-text-primary">
          <Facebook className="h-5 w-5 text-ps-cyan" />
          Facebook Marketplace
        </h2>
        <div className="flex items-center gap-3 text-ps-text-primary">
          <span
            className={`h-2.5 w-2.5 rounded-full ${isPublishedToFB ? "bg-ps-cyan" : "bg-ps-border-default"}`}
          />
          <div>
            <span className="font-medium">
              {isPublishedToFB
                ? "Publicado en Facebook Marketplace"
                : "No publicado en Facebook Marketplace"}
            </span>
            <p className="text-sm text-ps-text-secondary">
              {isPublishedToFB
                ? "El bot publica este producto en los grupos de FB configurados. Se activa automáticamente al aprobar el producto."
                : "Se activa automáticamente al aprobar el producto — no requiere ninguna acción acá."}
            </p>
          </div>
        </div>

        {/* FB Account multi-select — only visible once published to FB */}
        {isPublishedToFB && fbAccounts.length > 0 && (
```

- [x] **Step 5: Lint and typecheck**

Run: `cd apps/web && pnpm lint && pnpm typecheck`
Expected: no errors — `fbOverride`, `setFbOverride`, `publishToFB`, `fbDirty` must have zero remaining references (verify with `grep -rn "fbOverride\|publishToFB\|fbDirty" apps/web/src` from repo root — expect no output).

- [x] **Step 6: Manual verification in the browser**

This component has no existing render-level test (the co-located `UnifiedProductForm.test.tsx` only tests two pure exported helpers — no mocking scaffold exists for the full form's hooks). Per project convention, verify manually:

1. Start the staging stack (already running per earlier diagnosis) or `pnpm dev` in `apps/web`.
2. Open a `PUBLISHED` product's edit form (e.g. the backfilled Kia Optima, `7d97fa0b-9b09-43b1-842f-baf8ee74c523`).
3. Confirm the Facebook Marketplace section shows "Publicado en Facebook Marketplace" with no checkbox.
4. Open a `PENDING` or `DRAFT` product's edit form — confirm it shows "No publicado..." with no checkbox.
5. Confirm the FB-account multi-select still renders under the indicator when the product is already published to FB.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/forms/UnifiedProductForm.tsx
git commit -m "feat(products): replace manual FB publish toggle with read-only indicator

published_to_marketplace is now set automatically by approve()."
```

---

## Deploy note (not a task — flag for the human operator)

Staging (`prosell-staging-db`, database `prosell_staging`) needs migration `20260821_0001` applied there too, same as any other migration — the usual staging rebuild (`docker compose --env-file .env.staging -f docker-compose.staging.yml build api web && up -d --no-deps api web`) runs `alembic upgrade head` on container start, per existing convention. No manual step beyond the normal deploy.
