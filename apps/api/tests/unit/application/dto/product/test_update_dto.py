"""Unit tests for `UpdateProductRequest` DTO — cross-field validation.

Why this test file exists (regression / contract):
  `cover_image_key` is a first-class pointer to one of the product's
  images. It must reference an entry that actually exists in
  `image_urls` — otherwise the catalog would render a cover image that
  isn't there, and signed-URL resolution would 404 on every read.

  The DTO enforces this invariant when BOTH fields are present in the
  request (i.e. the request is changing the image list AND the cover
  together). When only `cover_image_key` is sent (PATCH semantics for
  the cover), the DTO cannot validate against the current product
  state — that check moves to the use case, which loads the product
  first. See the use case test for that path.
"""

import pytest
from pydantic import ValidationError

from prosell.application.dto.product.update import UpdateProductRequest


VALID_KEY_A = "orgs/00000000-0000-0000-0000-000000000001/vehicles/a.jpg"
VALID_KEY_B = "orgs/00000000-0000-0000-0000-000000000001/vehicles/b.jpg"
VALID_KEY_C = "orgs/00000000-0000-0000-0000-000000000001/vehicles/c.jpg"


class TestUpdateProductRequestCoverValidation:
    """cover_image_key must reference an entry in image_urls when both
    are present in the same request."""

    def test_accepts_when_cover_key_is_in_image_urls(self) -> None:
        # Happy path: changing the image list and the cover together,
        # the cover is one of the new images.
        req = UpdateProductRequest(
            image_urls=[VALID_KEY_A, VALID_KEY_B],
            cover_image_key=VALID_KEY_A,
        )
        assert req.cover_image_key == VALID_KEY_A
        assert req.image_urls == [VALID_KEY_A, VALID_KEY_B]

    def test_accepts_cover_key_at_any_position(self) -> None:
        # The cover doesn't have to be the first image; the
        # `cover_image_key` field replaces the old "first image is
        # the cover" convention.
        req = UpdateProductRequest(
            image_urls=[VALID_KEY_A, VALID_KEY_B],
            cover_image_key=VALID_KEY_B,
        )
        assert req.cover_image_key == VALID_KEY_B

    def test_rejects_cover_key_not_in_image_urls(self) -> None:
        # The contract: cover_image_key must reference a real entry.
        # C is not in the list, so this should raise.
        with pytest.raises(ValidationError) as exc_info:
            UpdateProductRequest(
                image_urls=[VALID_KEY_A, VALID_KEY_B],
                cover_image_key=VALID_KEY_C,
            )
        # Sanity: the error mentions the cover field.
        assert "cover_image_key" in str(exc_info.value)

    def test_rejects_cover_key_when_image_urls_is_empty(self) -> None:
        # An empty image_urls means "clear all images". You can't have
        # a cover when there are no images.
        with pytest.raises(ValidationError) as exc_info:
            UpdateProductRequest(
                image_urls=[],
                cover_image_key=VALID_KEY_A,
            )
        assert "cover_image_key" in str(exc_info.value)

    def test_accepts_cover_key_without_image_urls_field(self) -> None:
        # PATCH semantics: when image_urls is omitted (None), the
        # product's existing image list is preserved. The DTO cannot
        # validate the cover against the existing list — that check
        # belongs in the use case, where the product is loaded. The
        # DTO must accept this case and defer to the use case.
        req = UpdateProductRequest(cover_image_key=VALID_KEY_A)
        assert req.cover_image_key == VALID_KEY_A
        assert req.image_urls is None

    def test_accepts_none_cover_key(self) -> None:
        # `None` means "do not change the cover" (PATCH semantics).
        req = UpdateProductRequest(image_urls=[VALID_KEY_A], cover_image_key=None)
        assert req.cover_image_key is None

    def test_accepts_when_cover_key_is_none_and_image_urls_is_empty(self) -> None:
        # Clearing all images and leaving the cover as None is a
        # valid operation — there is no cover when there are no images.
        req = UpdateProductRequest(image_urls=[], cover_image_key=None)
        assert req.image_urls == []
        assert req.cover_image_key is None
