"""Database session management."""

from __future__ import annotations

from collections.abc import AsyncGenerator

__all__ = ["get_async_session"]

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from prosell.core.config import settings

engine = create_async_engine(
    str(settings.database_url),
    echo=settings.debug and settings.environment == "development",
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession]:
    """
    FastAPI dependency for database session.

    Yields a session and handles commit/rollback automatically.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
