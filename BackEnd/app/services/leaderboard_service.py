from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models.team import FantasyTeam
from ..models.user import User
from ..redis_client import CacheManager
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class LeaderboardService:
    """Service for managing and updating leaderboards"""
    
    @staticmethod
    def get_leaderboard(db: Session, match_id: int, use_cache: bool = True) -> List[Dict]:
        """
        Get leaderboard for a match
        Returns sorted list of teams with ranks
        """
        # Try cache first
        if use_cache:
            cached = CacheManager.get_leaderboard(match_id)
            if cached:
                logger.info(f"Leaderboard cache hit for match {match_id}")
                return cached
        
        # Query from database
        teams = db.query(FantasyTeam).filter(
            FantasyTeam.match_id == match_id
        ).order_by(desc(FantasyTeam.total_points)).all()
        
        leaderboard = []
        current_rank = 1
        
        for idx, team in enumerate(teams):
            # Update rank in database
            team.rank = current_rank
            
            # Get user info
            user = db.query(User).filter(User.user_id == team.user_id).first()
            
            leaderboard_entry = {
                "rank": current_rank,
                "team_id": team.team_id,
                "team_name": team.team_name,
                "username": user.username if user else "Unknown",
                "user_id": team.user_id,
                "total_points": float(team.total_points),
                "captain_id": team.captain_id,
                "vice_captain_id": team.vice_captain_id
            }
            
            leaderboard.append(leaderboard_entry)
            current_rank += 1
        
        db.commit()
        
        # Cache the result
        CacheManager.set_leaderboard(match_id, leaderboard, ttl=120)
        
        logger.info(f"Generated leaderboard for match {match_id}: {len(leaderboard)} teams")
        return leaderboard
    
    @staticmethod
    def get_user_rank(db: Session, match_id: int, user_id: int) -> Dict:
        """
        Get specific user's rank and stats in a match
        """
        team = db.query(FantasyTeam).filter(
            FantasyTeam.match_id == match_id,
            FantasyTeam.user_id == user_id
        ).first()
        
        if not team:
            return {
                "rank": None,
                "total_points": 0,
                "team_name": None
            }
        
        # Get total teams count
        total_teams = db.query(FantasyTeam).filter(
            FantasyTeam.match_id == match_id
        ).count()
        
        return {
            "rank": team.rank,
            "total_points": float(team.total_points),
            "team_name": team.team_name,
            "total_teams": total_teams
        }
    
    @staticmethod
    def get_top_performers(db: Session, match_id: int, limit: int = 10) -> List[Dict]:
        """
        Get top performing players in a match based on fantasy points
        """
        from app.models.player import PlayerPerformance, Player
        
        performances = db.query(
            PlayerPerformance, Player
        ).join(
            Player, PlayerPerformance.player_id == Player.player_id
        ).filter(
            PlayerPerformance.match_id == match_id
        ).order_by(
            desc(PlayerPerformance.fantasy_points)
        ).limit(limit).all()
        
        top_performers = []
        for performance, player in performances:
            top_performers.append({
                "player_id": player.player_id,
                "name": player.name,
                "role": player.role.value,
                "team": player.team,
                "fantasy_points": float(performance.fantasy_points),
                "runs": performance.runs,
                "wickets": performance.wickets,
                "catches": performance.catches
            })
        
        return top_performers