"""Unit tests for `CreateProductRequest` DTO — cross-field validation.

Why this test file exists (regression / contract):
  Same invariant as `UpdateProductRequest`: `cover_image_key` must
  reference an entry in `image_urls`. The DTO enforces it at the API
  boundary. At creation time `image_urls` is always present (defaults
  to `[]`), so we never need to defer to the use case — every error
  is caught here.

  See `test_update_dto.py` for the parallel set of tests on the
  update DTO and for the rationale behind the invariant.
"""

from uuid import UUID

import pytest
from pydantic import ValidationError

from prosell.application.dto.product.create import CreateProductRequest


VALID_KEY_A = "orgs/00000000-0000-0000-0000-000000000001/vehicles/a.jpg"
VALID_KEY_B = "orgs/00000000-0000-0000-0000-000000000001/vehicles/b.jpg"
VALID_KEY_C = "orgs/00000000-0000-0000-0000-000000000001/vehicles/c.jpg"
CATEGORY_ID = UUID("00000000-0000-0000-0000-000000000002")


def _make_request(**overrides) -> CreateProductRequest:
    """Build a CreateProductRequest with the minimum required fields.

    `cover_image_key` and `image_urls` are NOT in the defaults here so
    each test can specify its own combination.
    """
    return CreateProductRequest(
        title="2017 Toyota Camry SE",
        price_cents=18500_00,
        category_id=CATEGORY_ID,
        **overrides,
    )


class TestCreateProductRequestCoverValidation:
    """cover_image_key must reference an entry in image_urls."""

    def test_accepts_when_cover_key_is_in_image_urls(self) -> None:
        # Happy path: a product created with images and a valid cover.
        req = _make_request(
            image_urls=[VALID_KEY_A, VALID_KEY_B],
            cover_image_key=VALID_KEY_A,
        )
        assert req.cover_image_key == VALID_KEY_A

    def test_rejects_cover_key_not_in_image_urls(self) -> None:
        # C is not in the list, so the cover cannot reference it.
        with pytest.raises(ValidationError) as exc_info:
            _make_request(
                image_urls=[VALID_KEY_A, VALID_KEY_B],
                cover_image_key=VALID_KEY_C,
            )
        assert "cover_image_key" in str(exc_info.value)

    def test_rejects_cover_key_when_no_images(self) -> None:
        # An empty image_urls with a cover is a contradiction: the
        # cover has nothing to point to. The DTO catches this at the
        # boundary, before it reaches the DB.
        with pytest.raises(ValidationError) as exc_info:
            _make_request(
                image_urls=[],
                cover_image_key=VALID_KEY_A,
            )
        assert "cover_image_key" in str(exc_info.value)

    def test_accepts_none_cover_key(self) -> None:
        # `None` is the default and is the most common case (a
        # product is created with images but the cover is set
        # later).
        req = _make_request(image_urls=[VALID_KEY_A], cover_image_key=None)
        assert req.cover_image_key is None

    def test_accepts_default_no_cover_no_images(self) -> None:
        # The most basic case: create a product with no images and
        # no cover. Both fields default to None / [].
        req = _make_request()
        assert req.cover_image_key is None
        assert req.image_urls == []
