import redis
from .config import settings
import json

# Redis client for caching
redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)

class CacheManager:
    """Redis cache manager for common operations"""
    
    @staticmethod
    def get_leaderboard(match_id: int):
        """Get cached leaderboard"""
        key = f"leaderboard:{match_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    
    @staticmethod
    def set_leaderboard(match_id: int, leaderboard: list, ttl: int = 300):
        """Cache leaderboard with TTL (default 5 minutes)"""
        key = f"leaderboard:{match_id}"
        redis_client.setex(key, ttl, json.dumps(leaderboard))
    
    @staticmethod
    def invalidate_leaderboard(match_id: int):
        """Invalidate leaderboard cache"""
        key = f"leaderboard:{match_id}"
        redis_client.delete(key)
    
    @staticmethod
    def get_match_data(match_id: str):
        """Get cached match data from external API"""
        key = f"match:{match_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    
    @staticmethod
    def set_match_data(match_id: str, data: dict, ttl: int = 180):
        """Cache match data (3 minutes)"""
        key = f"match:{match_id}"
        redis_client.setex(key, ttl, json.dumps(data))
    
    @staticmethod
    def get_player_stats(match_id: str, player_id: str):
        """Get cached player stats"""
        key = f"player:{match_id}:{player_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    
    @staticmethod
    def set_player_stats(match_id: str, player_id: str, stats: dict, ttl: int = 120):
        """Cache player stats (2 minutes)"""
        key = f"player:{match_id}:{player_id}"
        redis_client.setex(key, ttl, json.dumps(stats))