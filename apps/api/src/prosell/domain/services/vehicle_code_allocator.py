"""Vehicle code allocator — durable, globally-unique product identifier.

Allocates the next `vehicle_code` for a brand-new vehicle-category
product. `vehicle_code` is a vehicle-only legacy product id that ends up
in the `id` column of the client-format catalog CSV (replacing the
previous 1-based positional `row_id`) and is treated as a legacy id by
the super_admin's tooling.

Storage shape (current, post-`20260927_0001_move_vehicle_code_to_attributes_jsonb.py`):
    The value lives inside ``Product.attributes["vehicle_code"]`` (JSONB
    text), NOT on a first-class column. The DB-level uniqueness invariant
    is enforced by a functional partial unique index on
    ``(attributes->>'vehicle_code')``. The allocator returns an `int`
    as before — the use case's job is to format it as text and store
    it under ``attributes["vehicle_code"]`` at INSERT time. Callers
    that already have a code from a client CSV import are responsible
    for passing it in via ``CreateProductRequest.attributes``.

Concurrency choice (documented decision):
    The allocator delegates to a database-native sequence through the product
    repository. PostgreSQL's ``nextval`` is atomic, so concurrent callers
    always receive distinct values without application-level locks. Sequence
    gaps after a rolled-back transaction are acceptable: vehicle codes need
    global uniqueness and durability, not contiguity. The partial functional
    unique index on the JSONB path remains the database integrity backstop
    for caller-supplied codes.

Preview choice (documented decision):
    `peek_next` is a non-mutating read-only preview backed by
    ``SELECT MAX((attributes->>'vehicle_code')::bigint)`` (an O(1)
    indexed aggregate, same path the repository already exposes as
    `get_max_vehicle_code`). It does NOT call ``nextval``, so a buyer
    who pre-fills and then abandons the create form burns no sequence
    value — the actual production persistence still goes through the
    atomic ``nextval``-based ``allocate_next`` path.
"""

from prosell.domain.exceptions.product_exceptions import DuplicateVehicleCodeError
from prosell.domain.repositories.product_repository import AbstractProductRepository


class VehicleCodeAllocator:
    """Allocate the next durable `vehicle_code` for a new vehicle-category product.

    Wraps `AbstractProductRepository` so the allocation logic stays out
    of the use cases that consume it. The use case holds the same
    repository the allocator queries, so there's no second session /
    second transaction to manage. The returned int is the *next code*
    to assign — the use case stores it as text under
    ``Product.attributes["vehicle_code"]``; the DB-level uniqueness
    invariant (functional unique index on the JSONB path) catches
    collisions on the way in.
    """

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self._product_repository = product_repository

    async def allocate_next(self) -> int:
        """Return an atomically allocated, globally unique vehicle code.

        Durability path: back the call with ``nextval`` so concurrent
        creators never collide. The returned value is consumed by an
        actual INSERT (create use case), which is responsible for
        storing it as text under ``attributes["vehicle_code"]``.
        """
        return await self._product_repository.allocate_next_vehicle_code()

    async def peek_next(self) -> int:
        """Return the next likely `vehicle_code` WITHOUT consuming a sequence value.

        Uses ``SELECT MAX((attributes->>'vehicle_code')::bigint)`` + 1
        (or 1 if no row exists yet) so the underlying PostgreSQL
        sequence does not advance on a peek. That means N consecutive
        previews of the create form return the same number while no
        INSERT happens — the create path accepts that with a
        ``DuplicateVehicleCodeError`` surfaced as a field-level error
        on the form, so a stale preview is still recoverable.
        """
        current_max = await self._product_repository.get_max_vehicle_code()
        return (current_max or 0) + 1

    async def reserve(self, vehicle_code: int) -> None:
        """Validate that `vehicle_code` is free before the caller commits.

        Used by callers that already picked a `vehicle_code` (e.g. the
        client CSV import path carries the code in the `id` column and
        threads it into ``CreateProductRequest.attributes["vehicle_code"]``)
        and want to fail fast with `DuplicateVehicleCodeError` instead of
        surfacing the DB-level functional partial unique index violation
        as a generic IntegrityError. `CreateProductUseCase` calls this
        when the caller supplied an explicit code in attributes.

        Raises:
            DuplicateVehicleCodeError: If another product already holds
                `vehicle_code` (in `attributes->>'vehicle_code'`).
        """
        if await self._product_repository.vehicle_code_exists(vehicle_code):
            raise DuplicateVehicleCodeError(vehicle_code)
