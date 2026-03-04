"""Product image entity."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel


class ProductImage(DomainModel):
    """
    Product image entity.

    Pure domain logic - no external dependencies.
    Manages product images with ordering and primary selection.
    """

    # Required fields
    id: UUID
    product_id: UUID

    # Image URLs
    url: str  # Public URL of the image
    thumbnail_url: str | None = None  # Smaller thumbnail version

    # Ordering and display
    sort_order: int = Field(default=0, ge=0)
    is_primary: bool = False  # Primary image for product display

    # Metadata
    alt_text: str | None = None  # Alt text for accessibility
    width: int | None = None  # Image width in pixels
    height: int | None = None  # Image height in pixels
    file_size_bytes: int | None = None  # File size for storage tracking

    # Upload info
    storage_key: str | None = None  # Storage path (e.g., DO Spaces key)
    content_type: str | None = None  # e.g., "image/jpeg"

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        product_id: UUID,
        url: str,
        storage_key: str | None = None,
        sort_order: int = 0,
        **kwargs,
    ) -> "ProductImage":
        """
        Factory method for new product image creation.

        Args:
            product_id: Product ID
            url: Public URL of the image
            storage_key: Storage path/key (optional)
            sort_order: Display order
            **kwargs: Additional optional fields

        Returns:
            New ProductImage entity
        """
        return cls(
            id=uuid4(),
            product_id=product_id,
            url=url,
            storage_key=storage_key,
            sort_order=sort_order,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    def set_as_primary(self) -> None:
        """
        Mark this image as primary.

        Note: In a use case, this would also unset is_primary on other
        images of the same product. This method only sets this image's flag.
        """
        self.is_primary = True
        self.updated_at = datetime.now(UTC)

    def unset_primary(self) -> None:
        """Unset primary flag."""
        if self.is_primary:
            self.is_primary = False
            self.updated_at = datetime.now(UTC)

    def update_sort_order(self, sort_order: int) -> None:
        """
        Update sort order.

        Args:
            sort_order: New sort order value

        Raises:
            ValueError: If sort_order is negative
        """
        if sort_order < 0:
            raise ValueError("sort_order must be >= 0")
        self.sort_order = sort_order
        self.updated_at = datetime.now(UTC)

    def update_metadata(
        self,
        alt_text: str | None = None,
        width: int | None = None,
        height: int | None = None,
        file_size_bytes: int | None = None,
    ) -> None:
        """
        Update image metadata.

        Args:
            alt_text: Alt text for accessibility
            width: Image width in pixels
            height: Image height in pixels
            file_size_bytes: File size in bytes
        """
        if alt_text is not None:
            self.alt_text = alt_text
        if width is not None:
            if width <= 0:
                raise ValueError("width must be > 0")
            self.width = width
        if height is not None:
            if height <= 0:
                raise ValueError("height must be > 0")
            self.height = height
        if file_size_bytes is not None:
            if file_size_bytes < 0:
                raise ValueError("file_size_bytes must be >= 0")
            self.file_size_bytes = file_size_bytes

        self.updated_at = datetime.now(UTC)

    def set_thumbnail_url(self, thumbnail_url: str) -> None:
        """
        Set thumbnail URL.

        Args:
            thumbnail_url: URL of thumbnail image
        """
        self.thumbnail_url = thumbnail_url
        self.updated_at = datetime.now(UTC)

    @property
    def has_thumbnail(self) -> bool:
        """Check if image has thumbnail."""
        return self.thumbnail_url is not None

    @property
    def has_dimensions(self) -> bool:
        """Check if image dimensions are known."""
        return self.width is not None and self.height is not None

    @property
    def aspect_ratio(self) -> float | None:
        """Calculate aspect ratio (width / height)."""
        if self.width and self.height and self.height > 0:
            return self.width / self.height
        return None

    @property
    def is_landscape(self) -> bool | None:
        """Check if image is landscape (wider than tall)."""
        ratio = self.aspect_ratio
        if ratio is None:
            return None
        return ratio > 1.0

    @property
    def is_portrait(self) -> bool | None:
        """Check if image is portrait (taller than wide)."""
        ratio = self.aspect_ratio
        if ratio is None:
            return None
        return ratio < 1.0
