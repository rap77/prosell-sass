"""Redis service for distributed state management."""

import logging

import redis.asyncio as redis

from prosell.core.config import get_settings

logger = logging.getLogger(__name__)


class RedisService:
    """
    Simple Redis service for distributed operations.

    Wraps redis.asyncio with a simplified interface.
    """

    def __init__(self) -> None:
        """Initialize Redis service (lazy connection)."""
        self._redis: redis.Redis[str] | None = None
        self._settings = get_settings()

    async def _get_client(self) -> redis.Redis[str]:
        """Get or create Redis client."""
        if self._redis is None:
            self._redis = await redis.from_url(
                self._settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        """
        Set a key-value pair in Redis.

        Args:
            key: Redis key
            value: Value to store
            ex: Expiration time in seconds (optional)
        """
        client = await self._get_client()
        if ex:
            await client.setex(key, ex, value)
        else:
            await client.set(key, value)

    async def get(self, key: str) -> str | None:
        """
        Get a value from Redis.

        Args:
            key: Redis key

        Returns:
            Value if exists, None otherwise
        """
        client = await self._get_client()
        value = await client.get(key)
        return value if value is not None else None

    async def delete(self, key: str) -> None:
        """
        Delete a key from Redis.

        Args:
            key: Redis key
        """
        client = await self._get_client()
        await client.delete(key)

    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in Redis.

        Args:
            key: Redis key

        Returns:
            True if key exists, False otherwise
        """
        client = await self._get_client()
        return await client.exists(key) > 0

    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None
