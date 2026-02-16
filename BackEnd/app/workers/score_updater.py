from ..workers.celery_app import celery_app
from ..models.match import Match, MatchStatuses
from ..models.player import PlayerPerformance
from ..services.cricket_api import CricketAPIService
from ..services.points_calculator import PointsCalculator
from decimal import Decimal, InvalidOperation
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.points import ScoringRule
import logging

logger = logging.getLogger(__name__)

def safe_decimal(value):
    """Helper to safely convert API strings to Decimal"""
    if value in [None, "-", "*", "", "DNB"]:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return Decimal("0")

@celery_app.task(name='app.workers.score_updater.update_live_scores_task')
def update_live_scores_task():
    """
    Background task to update live match scores
    Runs every minute for all active live matches
    """
    db = SessionLocal()
    
    try:
        # Get all live matches
        live_matches = db.query(Match).filter(
            Match.status == MatchStatuses.LIVE,
            Match.is_active == True
        ).all()
        
        logger.info(f"Updating scores for {len(live_matches)} live matches")
        
        for match in live_matches:
            try:
                update_match_scores(db, match)
            except Exception as e:
                logger.error(f"Error updating match {match.match_id}: {str(e)}")
                continue
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in score update task: {str(e)}")
        db.rollback()
    finally:
        db.close()


def update_match_scores(db: Session, match: Match):
    """
    Update scores for a single match
    """
    # Fetch latest scores from API
    player_stats = CricketAPIService.get_player_stats(match.external_match_id)
    
    if not player_stats:
        logger.warning(f"No player stats for match {match.match_id}")
        return
    
    updated_count = 0
    
    # Update each player's performance
    for external_player_id, stats in player_stats.items():
        # Find player in our database
        from app.models.player import Player
        
        player = db.query(Player).filter(
            Player.match_id == match.match_id,
            Player.external_player_id == external_player_id
        ).first()
        
        if not player:
            logger.warning(f"Player {external_player_id} not found in DB")
            continue
        
        # Get or create performance record
        performance = db.query(PlayerPerformance).filter(
            PlayerPerformance.match_id == match.match_id,
            PlayerPerformance.player_id == player.player_id
        ).first()
        
        if not performance:
            performance = PlayerPerformance(
                match_id=match.match_id,
                player_id=player.player_id
            )
            db.add(performance)
        
        # Update stats
        performance.runs = stats.get('runs', 0)
        performance.balls_faced = stats.get('balls_faced', 0)
        performance.fours = stats.get('fours', 0)
        performance.sixes = stats.get('sixes', 0)
        performance.strike_rate = safe_decimal(stats.get('strike_rate'))
        
        performance.wickets = stats.get('wickets', 0)
        performance.overs = safe_decimal(stats.get('overs'))
        performance.runs_conceded = stats.get('runs_conceded', 0)
        performance.maidens = stats.get('maidens', 0)
        performance.economy = safe_decimal(stats.get('economy'))
        
        performance.catches = stats.get('catches', 0)
        performance.stumpings = stats.get('stumpings', 0)
        performance.run_outs = stats.get('run_outs', 0)
        
        # Calculate fantasy points
        rules = db.query(ScoringRule).filter(
            ScoringRule.match_id == match.match_id
        ).first()
        
        if rules:
            performance.fantasy_points = PointsCalculator.calculate_player_points(
                performance, rules
            )
        
        updated_count += 1
    
    db.commit()
    
    logger.info(f"Updated {updated_count} player performances for match {match.match_id}")
    
    # Recalculate all team points
    PointsCalculator.recalculate_all_teams(db, match.match_id)
    
    # Trigger WebSocket broadcast for leaderboard update
    from app.websocket.manager import ConnectionManager
    manager = ConnectionManager()
    
    # This will be picked up by the WebSocket endpoint
    manager.match_updates[match.match_id] = {
        "type": "score_update",
        "match_id": match.match_id
    }


@celery_app.task(name='app.workers.score_updater.finalize_match_task')
def finalize_match_task(match_id: int):
    """
    Finalize match - calculate final standings
    Called when match status changes to COMPLETED
    """
    db = SessionLocal()
    
    try:
        match = db.query(Match).filter(Match.match_id == match_id).first()
        if not match:
            logger.error(f"Match {match_id} not found")
            return
        
        # Final score update
        update_match_scores(db, match)
        
        # Lock all teams
        from app.models.team import FantasyTeam, TeamStatus
        teams = db.query(FantasyTeam).filter(
            FantasyTeam.match_id == match_id
        ).all()
        
        for team in teams:
            team.status = TeamStatus.LOCKED
        
        match.teams_locked = True
        db.commit()
        
        logger.info(f"Finalized match {match_id} with {len(teams)} teams")
        
    except Exception as e:
        logger.error(f"Error finalizing match {match_id}: {str(e)}")
        db.rollback()
    finally:
        db.close()