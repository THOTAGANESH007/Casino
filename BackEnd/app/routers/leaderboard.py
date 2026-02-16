from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.leaderboard_service import LeaderboardService
from ..websocket.manager import manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/match/{match_id}")
def get_match_leaderboard(
    match_id: int,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get leaderboard for a match
    Returns top teams sorted by points
    """
    leaderboard = LeaderboardService.get_leaderboard(db, match_id)
    
    # Apply limit
    if limit:
        leaderboard = leaderboard[:limit]
    
    return {
        "match_id": match_id,
        "total_teams": len(leaderboard),
        "leaderboard": leaderboard
    }


@router.get("/match/{match_id}/user/{user_id}")
def get_user_rank(
    match_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user's rank and stats for a match"""
    return LeaderboardService.get_user_rank(db, match_id, user_id)


@router.get("/match/{match_id}/top-performers")
def get_top_performers(
    match_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get top performing players in match"""
    return LeaderboardService.get_top_performers(db, match_id, limit)


@router.websocket("/ws/match/{match_id}")
async def websocket_leaderboard(
    websocket: WebSocket,
    match_id: int,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time leaderboard updates
    
    Usage:
    - Connect: ws://localhost:8000/leaderboard/ws/match/{match_id}
    - Receive: JSON messages with leaderboard updates
    """
    await manager.connect(websocket, match_id)
    
    try:
        # Send initial leaderboard
        leaderboard = LeaderboardService.get_leaderboard(db, match_id)
        await manager.send_personal_message({
            "type": "initial_leaderboard",
            "leaderboard": leaderboard
        }, websocket)
        
        # Keep connection alive and listen for messages
        while True:
            # Receive any messages from client (heartbeat, etc.)
            data = await websocket.receive_text()
            
            # Check if there are pending updates
            if match_id in manager.match_updates:
                # Fetch and broadcast latest leaderboard
                updated_leaderboard = LeaderboardService.get_leaderboard(
                    db, match_id, use_cache=False
                )
                await manager.broadcast_leaderboard(match_id, updated_leaderboard)
                
                # Clear update flag
                del manager.match_updates[match_id]
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, match_id)
        logger.info(f"Client disconnected from match {match_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, match_id)