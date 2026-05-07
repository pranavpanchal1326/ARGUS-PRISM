from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import redis.asyncio as redis
from fastapi import Request

from .config import get_settings, Settings

# Initialize singletons for connection pools
settings = get_settings()

db_engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)
AsyncSessionLocal = async_sessionmaker(
    bind=db_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

redis_pool = redis.ConnectionPool.from_url(settings.redis_url)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    client = redis.Redis(connection_pool=redis_pool)
    try:
        yield client
    finally:
        await client.close()


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown-request-id")
