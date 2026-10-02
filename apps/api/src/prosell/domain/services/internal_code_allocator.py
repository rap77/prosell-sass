"""Internal code allocator — durable, globally-unique product identifier.

Allocates the next `internal_code` for a brand-new vehicle-category
product. `internal_code` is a vehicle-only durable catalog id (never
sourced from an external system — see bulk_upload_vehicles.py) that
ends up in the `id` column of the client-format catalog CSV (replacing
the previous 1-based positional `row_id`) and is treated as a legacy
id by the super_admin's tooling.

Storage shape (current, post-`20261002_0001_rename_vehicle_code_to_internal_code.py`,
originally post-`20260927_0001_move_vehicle_code_to_attributes_jsonb.py`):
    The value lives inside ``Product.attributes["internal_code"]`` (JSONB
    text), NOT on a first-class column. The DB-level uniqueness invariant
    is enforced by a functional partial unique index on
    ``(attributes->>'internal_code')``. The allocator returns an `int`
    as before — the use case's job is to format it as text and store
    it under ``attributes["internal_code"]`` at INSERT time. A caller
    may still supply an explicit code (e.g. an admin typing one in the
    manual product-creation form) via ``CreateProductRequest.attributes``.

Concurrency choice (documented decision):
    The allocator delegates to a database-native sequence through the product
    repository. PostgreSQL's ``nextval`` is atomic, so concurrent callers
    always receive distinct values without application-level locks. Sequence
    gaps after a rolled-back transaction are acceptable: internal codes need
    global uniqueness and durability, not contiguity. The partial functional
    unique index on the JSONB path remains the database integrity backstop
    for caller-supplied codes.

Preview choice (documented decision):
    `peek_next` is a non-mutating read-only preview backed by
    ``SELECT MAX((attributes->>'internal_code')::bigint)`` (an O(1)
    indexed aggregate, same path the repository already exposes as
    `get_max_internal_code`). It does NOT call ``nextval``, so a buyer
    who pre-fills and then abandons the create form burns no sequence
    value — the actual production persistence still goes through the
    atomic ``nextval``-based ``allocate_next`` path.
"""

from prosell.domain.exceptions.product_exceptions import DuplicateInternalCodeError
from prosell.domain.repositories.product_repository import AbstractProductRepository


class InternalCodeAllocator:
    """Allocate the next durable `internal_code` for a new vehicle-category product.

    Wraps `AbstractProductRepository` so the allocation logic stays out
    of the use cases that consume it. The use case holds the same
    repository the allocator queries, so there's no second session /
    second transaction to manage. The returned int is the *next code*
    to assign — the use case stores it as text under
    ``Product.attributes["internal_code"]``; the DB-level uniqueness
    invariant (functional unique index on the JSONB path) catches
    collisions on the way in.
    """

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self._product_repository = product_repository

    async def allocate_next(self) -> int:
        """Return an atomically allocated, globally unique internal code.

        Durability path: back the call with ``nextval`` so concurrent
        creators never collide. The returned value is consumed by an
        actual INSERT (create use case), which is responsible for
        storing it as text under ``attributes["internal_code"]``.
        """
        return await self._product_repository.allocate_next_internal_code()

    async def peek_next(self) -> int:
        """Return the next likely `internal_code` WITHOUT consuming a sequence value.

        Uses ``SELECT MAX((attributes->>'internal_code')::bigint)`` + 1
        (or 1 if no row exists yet) so the underlying PostgreSQL
        sequence does not advance on a peek. That means N consecutive
        previews of the create form return the same number while no
        INSERT happens — the create path accepts that with a
        ``DuplicateInternalCodeError`` surfaced as a field-level error
        on the form, so a stale preview is still recoverable.
        """
        current_max = await self._product_repository.get_max_internal_code()
        return (current_max or 0) + 1

    async def reserve(self, internal_code: int) -> None:
        """Validate that `internal_code` is free before the caller commits.

        Used by callers that already picked an `internal_code` (e.g. an
        admin typing one explicitly in the manual product-edit form,
        threaded into ``CreateProductRequest.attributes["internal_code"]``)
        and want to fail fast with `DuplicateInternalCodeError` instead of
        surfacing the DB-level functional partial unique index violation
        as a generic IntegrityError. `CreateProductUseCase` calls this
        when the caller supplied an explicit code in attributes.

        Raises:
            DuplicateInternalCodeError: If another product already holds
                `internal_code` (in `attributes->>'internal_code'`).
        """
        if await self._product_repository.internal_code_exists(internal_code):
            raise DuplicateInternalCodeError(internal_code)
