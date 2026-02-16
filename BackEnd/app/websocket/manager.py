from fastapi import WebSocket
from typing import Dict, List
import json
import logging

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
        
        self.active_connections[match_id].append(websocket)
        logger.info(f"WebSocket connected to match {match_id}. Total: {len(self.active_connections[match_id])}")
    
    def disconnect(self, websocket: WebSocket, match_id: int):
        """Remove WebSocket connection"""
        if match_id in self.active_connections:
            if websocket in self.active_connections[match_id]:
                self.active_connections[match_id].remove(websocket)
                logger.info(f"WebSocket disconnected from match {match_id}")
            
            # Clean up empty lists
            if len(self.active_connections[match_id]) == 0:
                del self.active_connections[match_id]
    
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