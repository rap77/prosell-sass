"""Unit tests for ProductStatus.reverse_transitions() (undo support)."""

from prosell.domain.value_objects.product_status import ProductStatus


class TestProductStatusReverseTransitions:
    """Test the reverse (undo) transition map on ProductStatus."""

    def test_reverse_transitions_maps_published_to_pending(self):
        assert ProductStatus.reverse_transitions()[ProductStatus.PUBLISHED] == [
            ProductStatus.PENDING
        ]

    def test_reverse_transitions_maps_rejected_to_pending(self):
        assert ProductStatus.reverse_transitions()[ProductStatus.REJECTED] == [
            ProductStatus.PENDING
        ]

    def test_reverse_transitions_only_covers_published_and_rejected(self):
        """ARCHIVED restore target is dynamic (archived_from_status), not a
        fixed status, so it is not part of this static map."""
        assert set(ProductStatus.reverse_transitions().keys()) == {
            ProductStatus.PUBLISHED,
            ProductStatus.REJECTED,
        }

    def test_can_reverse_true_for_published(self):
        assert ProductStatus.PUBLISHED.can_reverse() is True

    def test_can_reverse_true_for_rejected(self):
        assert ProductStatus.REJECTED.can_reverse() is True

    def test_can_reverse_false_for_draft(self):
        assert ProductStatus.DRAFT.can_reverse() is False

    def test_can_reverse_false_for_archived(self):
        assert ProductStatus.ARCHIVED.can_reverse() is False
