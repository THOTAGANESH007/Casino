import asyncio
from fastapi import WebSocket
from typing import Dict, List
import json
import logging
from ..redis_client import redis_client

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates
    """
    
    def __init__(self):
        # Store active connections per match
        # {match_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[int, List[WebSocket]] = {}
        
        # Store pending match updates
        self.match_updates: Dict[int, dict] = {}
    
    async def connect(self, websocket: WebSocket, match_id: int):
        """Accept new WebSocket connection and subscribe to match updates"""
        await websocket.accept()
        
        if match_id not in self.active_connections:
            self.active_connections[match_id] = []
        # Start a background task to listen to Redis for THIS specific match
            # only if we aren't already listening.
        asyncio.create_task(self.redis_listener(match_id))
        self.active_connections[match_id].append(websocket)
        logger.info(f"WebSocket connected to match {match_id}. Total: {len(self.active_connections[match_id])}")
    
    def disconnect(self, websocket: WebSocket, match_id: int):
        """Remove WebSocket connection"""
        if match_id in self.active_connections:
            if websocket in self.active_connections[match_id]:
                self.active_connections[match_id].remove(websocket)
                logger.info(f"WebSocket disconnected from match {match_id}")
            
            # Clean up empty lists
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]
    
    async def redis_listener(self, match_id: int):
        """
        A background task that runs for each match.
        It listens to Redis and forwards messages to local WebSockets.
        """
        pubsub = redis_client.pubsub()
        channel = f"match_channel_{match_id}"
        await pubsub.subscribe(channel)
        
        logger.info(f"Redis Listener started for channel: {channel}")

        try:
            while match_id in self.active_connections:
                # Check for messages every 0.1 seconds
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    data = json.loads(message['data'])
                    # Forward to all local sockets for this match
                    await self.broadcast_locally(match_id, data)
                
                await asyncio.sleep(0.1) 
        except Exception as e:
            logger.error(f"Redis Listener Error for match {match_id}: {e}")
        finally:
            await pubsub.unsubscribe(channel)

    async def broadcast_locally(self, match_id: int, message: dict):
        """Send message to sockets held in THIS process only"""
        if match_id not in self.active_connections:
            return
        
        for connection in self.active_connections[match_id]:
            try:
                await connection.send_json(message)
            except Exception:
                # Connection likely dead, will be cleaned up by disconnect logic
                pass
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")
    
    async def broadcast_to_match(self, match_id: int, message: dict):
        """Broadcast message to all clients watching a match"""
        if match_id not in self.active_connections:
            return
        
        disconnected = []
        
        for connection in self.active_connections[match_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {str(e)}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn, match_id)
    
    async def broadcast_leaderboard(self, match_id: int, leaderboard: list):
        """Broadcast updated leaderboard to all watching clients"""
        message = {
            "type": "leaderboard_update",
            "match_id": match_id,
            "leaderboard": leaderboard
        }
        
        await self.broadcast_to_match(match_id, message)
        logger.info(f"Broadcasted leaderboard update to match {match_id}")
    
    async def broadcast_score_update(self, match_id: int, player_id: int, stats: dict):
        """Broadcast player score update"""
        message = {
            "type": "score_update",
            "match_id": match_id,
            "player_id": player_id,
            "stats": stats
        }
        
        await self.broadcast_to_match(match_id, message)
    
    async def broadcast_match_status(self, match_id: int, status: str):
        """Broadcast match status change (started, completed, etc.)"""
        message = {
            "type": "match_status",
            "match_id": match_id,
            "status": status
        }
        
        await self.broadcast_to_match(match_id, message)


# Global connection manager instance
manager = ConnectionManager()