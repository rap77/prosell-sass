"""Redis service port for the domain layer."""

from typing import Protocol


class IRedisService(Protocol):
    """Interface for Redis cache operations used by domain use cases."""

    async def get(self, key: str) -> str | None: ...

    async def set(self, key: str, value: str, ex: int | None = None) -> None: ...

    async def delete(self, key: str) -> None: ...
