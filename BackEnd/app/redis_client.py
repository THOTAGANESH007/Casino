import redis
from .config import settings
import json
import logging

logger = logging.getLogger(__name__)

try:
    redis_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        # Mandatory for Upstash SSL
        ssl_cert_reqs=None, 
        # Sends a PING every 30s to keep connection alive
        health_check_interval=30,
        # Timeouts to prevent hanging
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )
    redis_client.ping()
    logger.info("Successfully connected to Upstash Redis")
except Exception as e:
    logger.warning(f"Redis connection failed on startup: {e}")
    redis_client = None

class CacheManager:
    """Redis cache manager with Fault Tolerance"""
    
    @staticmethod
    def _is_redis_up():
        return redis_client is not None

    @staticmethod
    def get(key: str):
        """Generic get for any key"""
        if not CacheManager._is_redis_up(): return None
        try:
            data = redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis GET Error (key: {key}): {e}")
            return None

    @staticmethod
    def set(key: str, value: any, ttl: int = 3600):
        """Generic set for any value with TTL"""
        if not CacheManager._is_redis_up(): return
        try:
            # We convert everything to JSON before storing
            redis_client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.error(f"Redis SET Error (key: {key}): {e}")

    @staticmethod
    def get_leaderboard(match_id: int):
        if not CacheManager._is_redis_up(): return None
        try:
            key = f"leaderboard:{match_id}"
            data = redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis Error (get_leaderboard): {e}")
            return None
    
    @staticmethod
    def set_leaderboard(match_id: int, leaderboard: list, ttl: int = 1800):
        if not CacheManager._is_redis_up(): return
        try:
            key = f"leaderboard:{match_id}"
            redis_client.setex(key, ttl, json.dumps(leaderboard))
        except Exception as e:
            logger.error(f"Redis Error (set_leaderboard): {e}")
    
    @staticmethod
    def invalidate_leaderboard(match_id: int):
        if not CacheManager._is_redis_up(): return
        try:
            key = f"leaderboard:{match_id}"
            redis_client.delete(key)
        except Exception as e:
            logger.error(f"Redis Error (invalidate_leaderboard): {e}")
    
    @staticmethod
    def get_match_data(match_id: str):
        if not CacheManager._is_redis_up(): return None
        try:
            key = f"match:{match_id}"
            data = redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis Error (get_match_data): {e}")
            return None
    
    @staticmethod
    def set_match_data(match_id: str, data: dict, ttl: int = 1800):
        if not CacheManager._is_redis_up(): return
        try:
            key = f"match:{match_id}"
            redis_client.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.error(f"Redis Error (set_match_data): {e}")
    
    @staticmethod
    def get_player_stats(match_id: str, player_id: str):
        if not CacheManager._is_redis_up(): return None
        try:
            key = f"player:{match_id}:{player_id}"
            data = redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis Error (get_player_stats): {e}")
            return None
    
    @staticmethod
    def set_player_stats(match_id: str, player_id: str, stats: dict, ttl: int = 1800):
        if not CacheManager._is_redis_up(): return
        try:
            key = f"player:{match_id}:{player_id}"
            redis_client.setex(key, ttl, json.dumps(stats))
        except Exception as e:
            logger.error(f"Redis Error (set_player_stats): {e}")
    
    @staticmethod
    def publish_match_update(match_id: int, message_dict: dict):
        """Publish a message to a specific match channel"""
        if redis_client is None: return
        try:
            channel = f"match_channel_{match_id}"
            redis_client.publish(channel, json.dumps(message_dict))
        except Exception as e:
            logger.error(f"Redis Publish Error: {e}")