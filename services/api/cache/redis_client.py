import os
import json
import logging
import redis.asyncio as redis
from redis.exceptions import RedisError

logger = logging.getLogger("prism.cache")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Redis configuration
pool = redis.ConnectionPool.from_url(
    REDIS_URL,
    max_connections=50,
    decode_responses=True,
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True,
    health_check_interval=30
)

def get_redis_client() -> redis.Redis:
    """Returns configured Redis client from connection pool."""
    try:
        client = redis.Redis(connection_pool=pool)
        return client
    except Exception as e:
        raise RuntimeError(f"Failed to connect to Redis pool: {e}")

async def cache_warmth_score(account_id: str, score_data: dict) -> bool:
    try:
        client = get_redis_client()
        key = f"warmth:score:{account_id}"
        await client.setex(key, 300, json.dumps(score_data))
        logger.info(f"Cached warmth score for {account_id}: {score_data.get('warmth_score')}")
        return True
    except RedisError as e:
        logger.error(f"RedisError on warmth:score:{account_id}: {e}")
        return False

async def get_cached_warmth_score(account_id: str) -> dict | None:
    try:
        client = get_redis_client()
        key = f"warmth:score:{account_id}"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on warmth:score:{account_id}: {e}")
        return None

async def cache_warmth_timeline(account_id: str, timeline_data: list[dict]) -> bool:
    try:
        client = get_redis_client()
        key = f"warmth:timeline:{account_id}"
        await client.setex(key, 600, json.dumps(timeline_data))
        return True
    except RedisError as e:
        logger.error(f"RedisError on {key}: {e}")
        return False

async def get_cached_warmth_timeline(account_id: str) -> list[dict] | None:
    try:
        client = get_redis_client()
        key = f"warmth:timeline:{account_id}"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on warmth:timeline:{account_id}: {e}")
        return None

async def cache_account_summary(account_id: str, account_data: dict) -> bool:
    try:
        client = get_redis_client()
        key = f"account:summary:{account_id}"
        await client.setex(key, 180, json.dumps(account_data))
        return True
    except RedisError as e:
        logger.error(f"RedisError on {key}: {e}")
        return False

async def get_cached_account_summary(account_id: str) -> dict | None:
    try:
        client = get_redis_client()
        key = f"account:summary:{account_id}"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on account:summary:{account_id}: {e}")
        return None

async def invalidate_account_cache(account_id: str) -> int:
    try:
        client = get_redis_client()
        keys = [
            f"warmth:score:{account_id}",
            f"warmth:timeline:{account_id}",
            f"account:summary:{account_id}",
            f"alerts:count:{account_id}"
        ]
        deleted_count = await client.delete(*keys)
        return deleted_count
    except RedisError as e:
        logger.error(f"RedisError during invalidate_account_cache for {account_id}: {e}")
        return 0

async def cache_active_alerts(severity: str, alerts_data: list[dict]) -> bool:
    try:
        client = get_redis_client()
        key = f"alerts:active:{severity}"
        await client.setex(key, 30, json.dumps(alerts_data))
        return True
    except RedisError as e:
        logger.error(f"RedisError on {key}: {e}")
        return False

async def get_cached_active_alerts(severity: str) -> list[dict] | None:
    try:
        client = get_redis_client()
        key = f"alerts:active:{severity}"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on alerts:active:{severity}: {e}")
        return None

async def cache_mlro_queue(queue_data: list[dict]) -> bool:
    try:
        client = get_redis_client()
        key = "mlro:queue:pending"
        await client.setex(key, 30, json.dumps(queue_data))
        return True
    except RedisError as e:
        logger.error(f"RedisError on {key}: {e}")
        return False

async def get_cached_mlro_queue() -> list[dict] | None:
    try:
        client = get_redis_client()
        key = "mlro:queue:pending"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on mlro:queue:pending: {e}")
        return None

async def update_system_stats(stats: dict) -> bool:
    try:
        client = get_redis_client()
        key = "system:stats:live"
        await client.setex(key, 15, json.dumps(stats))
        return True
    except RedisError as e:
        logger.error(f"RedisError on {key}: {e}")
        return False

async def get_system_stats() -> dict | None:
    try:
        client = get_redis_client()
        key = "system:stats:live"
        data = await client.get(key)
        if data:
            return json.loads(data)
        return None
    except (RedisError, json.JSONDecodeError) as e:
        logger.error(f"RedisError/JSONError on system:stats:live: {e}")
        return None

async def ping_redis() -> bool:
    try:
        client = get_redis_client()
        return await client.ping()
    except Exception as e:
        logger.error(f"Redis PING failed: {e}")
        return False

async def get_cache_info() -> dict:
    try:
        client = get_redis_client()
        info = await client.info()
        keyspace_hits = int(info.get("keyspace_hits", 0))
        keyspace_misses = int(info.get("keyspace_misses", 0))
        total_accesses = keyspace_hits + keyspace_misses
        hit_rate = (keyspace_hits / total_accesses) if total_accesses > 0 else 0.0
        
        db0_keys = 0
        if "db0" in info and "keys" in info["db0"]:
            db0_keys = info["db0"]["keys"]
            
        return {
            "connected": True,
            "total_keys": db0_keys,
            "used_memory_human": info.get("used_memory_human", "0B"),
            "hit_rate": hit_rate,
            "uptime_seconds": info.get("uptime_in_seconds", 0)
        }
    except Exception as e:
        logger.error(f"Redis INFO failed: {e}")
        return {
            "connected": False,
            "total_keys": 0,
            "used_memory_human": "0B",
            "hit_rate": 0.0,
            "uptime_seconds": 0
        }
