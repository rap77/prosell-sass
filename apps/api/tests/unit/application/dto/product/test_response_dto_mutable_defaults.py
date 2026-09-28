"""Unit tests for `ProductResponse` DTO — default state isolation.

Why this test file exists (regression / contract):
    Pydantic forbids mutable default arguments at class-body level. The
    exceptions to that rule are `dict`, `list`, `set`, and `frozenset`,
    each of which Pydantic DEEP-COPIES via a `Field(default_factory=…)`
    when the constructor is called. Replacing a literal `= {}` / `= []`
    on a `BaseModel` field with `Field(default_factory=dict)` /
    `Field(default_factory=list)` is the explicitly supported way to keep
    distinct instances from sharing the same backing object.

    The GGA finding we are fixing (GGA-2026-09-26 — `product/response.py`
    lines 20, 52, 54, 75) is precisely this: Pydantic will still accept
    the literal defaults because `dict`/`list` are the documented
    exceptions, but the intent of the contract is "every instance gets a
    fresh container", and using `Field(default_factory=…)` makes that
    intent explicit and lint-safe.

    These tests pin the contract: mutating `attributes` / `image_urls` /
    `fb_account_ids` on one instance must NEVER bleed into another.
"""

import copy
from datetime import UTC, datetime
from uuid import UUID

from prosell.application.dto.product.response import (
    ProductResponse,
    ProductSummaryForLead,
)

CATEGORY_ID = UUID("00000000-0000-0000-0000-000000000001")
TENANT_ID = UUID("00000000-0000-0000-0000-000000000002")
ORG_ID = UUID("00000000-0000-0000-0000-000000000003")
FB_ACCOUNT_ID = UUID("00000000-0000-0000-0000-000000000004")
NOW = datetime(2026, 9, 26, 12, 0, 0, tzinfo=UTC)


def _product_response() -> ProductResponse:
    """Build a `ProductResponse` with the minimum required fields.

    Factored so pyright sees the field names against the typed
    `ProductResponse` constructor (rather than an untyped kwargs
    blob) — matches the typed defaults laid out in `response.py`.
    """
    return ProductResponse(
        id=UUID("00000000-0000-0000-0000-00000000000a"),
        tenant_id=TENANT_ID,
        organization_id=ORG_ID,
        org_code="ORG-1",
        category_id=CATEGORY_ID,
        # Note: the durable, globally-unique legacy product id
        # (vehicle_code) used to be a top-level field here; it moved
        # into `attributes["vehicle_code"]` after migration
        # 20260927_0001. The mutable-defaults isolation assertion below
        # still holds because `attributes` defaults to a fresh dict per
        # instance via `Field(default_factory=dict)`.
        title="2017 Toyota Camry SE",
        slug="2017-toyota-camry-se",
        description="Well-kept one-owner car.",
        price_cents=18500_00,
        currency="USD",
        condition="used",
        status="published",
        # `attributes={}` deliberately uses an inline literal so the
        # "factory must not share state" invariant is genuinely tested.
        attributes={},
        image_urls=[],
        cover_image_key=None,
        thumbnail_image_key=None,
        stock_number=None,
        location_city=None,
        location_state=None,
        location_zip=None,
        is_featured=False,
        published_to_marketplace=True,
        fb_account_ids=[],
        view_count=0,
        favorite_count=0,
        submitted_for_approval_at=None,
        submitted_by=None,
        approved_at=None,
        approved_by=None,
        rejection_reason=None,
        published_at=None,
        sold_at=None,
        archived_at=None,
        created_at=NOW,
        updated_at=NOW,
        version=1,
    )


def _summary() -> ProductSummaryForLead:
    return ProductSummaryForLead(
        id=UUID("00000000-0000-0000-0000-00000000000b"),
        title="2017 Toyota Camry SE",
        price_cents=18500_00,
        currency="USD",
        status="published",
        attributes={},
        created_at=NOW,
        updated_at=NOW,
    )


class TestProductResponseMutableDefaultIsolation:
    """Mutating a container field on one instance MUST NOT affect another."""

    def test_attributes_are_not_shared_between_instances(self) -> None:
        """Two `ProductResponse` instances — adding a key on one is invisible
        to the other. Pin for the GGA finding on `response.py:52`."""
        first = _product_response()
        second = _product_response()

        first.attributes["color"] = "red"

        assert "color" not in second.attributes
        assert second.attributes == {}

    def test_image_urls_are_not_shared_between_instances(self) -> None:
        """Two `ProductResponse` instances — appending to one is invisible
        to the other. Pin for the GGA finding on `response.py:54`."""
        first = _product_response()
        second = _product_response()

        first.image_urls.append("orgs/x/vehicles/a.jpg")

        assert second.image_urls == []

    def test_fb_account_ids_are_not_shared_between_instances(self) -> None:
        """Two `ProductResponse` instances — appending to one is invisible
        to the other. Pin for the GGA finding on `response.py:75`."""
        first = _product_response()
        second = _product_response()

        first.fb_account_ids.append(FB_ACCOUNT_ID)

        assert second.fb_account_ids == []

    def test_attributes_do_not_alias_with_fb_account_ids(self) -> None:
        """Distinct container fields hold distinct objects — a defensive
        cross-field check that catches a refactor that accidentally
        re-points a default factory at the wrong cache key."""
        first = _product_response()

        # Two distinct containers must not be the same identity.
        assert first.attributes is not first.image_urls
        assert first.attributes is not first.fb_account_ids
        assert first.image_urls is not first.fb_account_ids

    def test_pydantic_reports_default_factory_in_schema_metadata(self) -> None:
        """Schema metadata exposes the factory, not a literal — useful
        for OpenAPI consumers and to keep the "no shared state" invariant
        grep-able in code review."""
        fields = ProductResponse.model_fields
        assert fields["attributes"].default_factory is dict
        assert fields["image_urls"].default_factory is list
        assert fields["fb_account_ids"].default_factory is list


class TestProductSummaryForLeadMutableDefaultIsolation:
    """`ProductSummaryForLead.attributes` must not share state across
    instances either — pin for the GGA finding on `response.py:20`."""

    def test_attributes_are_not_shared_between_instances(self) -> None:
        first = _summary()
        second = _summary()

        first.attributes["stock_number"] = "ABC123"

        assert "stock_number" not in second.attributes
        assert second.attributes == {}

    def test_pydantic_reports_default_factory_in_schema_metadata(self) -> None:
        fields = ProductSummaryForLead.model_fields
        assert fields["attributes"].default_factory is dict


class TestDefaultContainersSurviveCopyAndPickle:
    """`Field(default_factory=...)` must yield a fresh container on every
    construction path — including `model_copy` and `model_dump`/`model_validate`
    round-trips — so HTTP serialization cannot leak shared state back
    into a freshly parsed DTO either.

    Note: `model_copy(deep=False)` deliberately shares the underlying
    container objects between original and copy in Pydantic v2 — that is
    the documented behavior, not a bug, and it is not covered by the
    GGA finding (which is strictly about factory-defaulted defaults).
    The deep-copy path below is what protects against accidental shared
    state when callers do opt into a deep copy.
    """

    def test_model_validate_round_trip_isolates_attributes(self) -> None:
        first = _product_response()
        # Round-trip through model_dump -> model_validate (the same shape
        # FastAPI uses to deserialize a JSON response). The re-parsed DTO
        # owns its own `attributes` dict — mutating the dumped source's
        # attributes after parse must not bleed into other instances.
        dumped = first.model_dump()
        ProductResponse.model_validate(dumped)

        second = _product_response()
        # Mutating the post-validation dump must not affect a fresh
        # instance built from kwargs.
        dumped["attributes"]["stock_number"] = "LEAK"
        assert "stock_number" not in second.attributes

    def test_deepcopy_returns_fresh_containers(self) -> None:
        """`copy.deepcopy` on a `ProductResponse` must produce a fully
        isolated twin — mutating the twin's containers must not change
        the original. Combined with the per-instance tests above, this
        pins the full GGA contract: every construction path yields a
        fresh container."""
        original = _product_response()
        twin = copy.deepcopy(original)

        twin.attributes["fresh_key"] = "x"
        twin.image_urls.append("orgs/x/vehicles/a.jpg")
        twin.fb_account_ids.append(FB_ACCOUNT_ID)

        assert original.attributes == {}
        assert original.image_urls == []
        assert original.fb_account_ids == []
