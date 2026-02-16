from decimal import Decimal
from sqlalchemy.orm import Session
from ..models.points import ScoringRule
from ..models.player import PlayerPerformance
from ..models.team import FantasyTeam
from ..redis_client import CacheManager
import logging

logger = logging.getLogger(__name__)


class PointsCalculator:
    """Calculate fantasy points based on player performance and scoring rules"""
    
    @staticmethod
    def calculate_player_points(performance: PlayerPerformance, rules: ScoringRule) -> Decimal:
        """
        Calculate fantasy points for a player based on their performance
        and the match's scoring rules
        """
        total_points = Decimal('0.0')
        
        # === BATTING POINTS ===
        # Runs
        total_points += Decimal(str(performance.runs)) * rules.run_points
        
        # Boundaries
        total_points += Decimal(str(performance.fours)) * rules.four_points
        total_points += Decimal(str(performance.sixes)) * rules.six_points
        
        # Milestones
        if performance.runs >= 100:
            total_points += rules.century_bonus
        elif performance.runs >= 50:
            total_points += rules.half_century_bonus
        elif performance.runs >= 30:
            total_points += rules.thirty_run_bonus
        
        # Duck (out for 0)
        if performance.runs == 0 and performance.balls_faced > 0:
            total_points += rules.duck_penalty
        
        # Strike rate bonus (min 10 balls)
        if performance.balls_faced >= 10:
            sr = float(performance.strike_rate)
            if sr >= 150:
                total_points += rules.strike_rate_above_150_bonus
            elif sr >= 130:
                total_points += rules.strike_rate_above_130_bonus
            elif sr < 70:
                total_points += rules.strike_rate_below_70_penalty
        
        # === BOWLING POINTS ===
        # Wickets
        total_points += Decimal(str(performance.wickets)) * rules.wicket_points
        
        # Maidens
        total_points += Decimal(str(performance.maidens)) * rules.maiden_over_points
        
        # Wicket milestones
        if performance.wickets >= 5:
            total_points += rules.five_wicket_bonus
        elif performance.wickets >= 4:
            total_points += rules.four_wicket_bonus
        elif performance.wickets >= 3:
            total_points += rules.three_wicket_bonus
        
        # Economy bonus (min 2 overs)
        if performance.overs >= 2:
            economy = float(performance.economy)
            if economy < 5:
                total_points += rules.economy_below_5_bonus
            elif economy < 6:
                total_points += rules.economy_below_6_bonus
            elif economy > 10:
                total_points += rules.economy_above_10_penalty
        
        # === FIELDING POINTS ===
        total_points += Decimal(str(performance.catches)) * rules.catch_points
        total_points += Decimal(str(performance.stumpings)) * rules.stumping_points
        # Assuming run_outs field tracks direct hit run outs
        total_points += Decimal(str(performance.run_outs)) * rules.run_out_direct_points
        
        return total_points
    
    @staticmethod
    def update_team_points(db: Session, team_id: int) -> Decimal:
        """
        Calculate and update total points for a fantasy team
        Applies captain (2x) and vice-captain (1.5x) multipliers
        """
        team = db.query(FantasyTeam).filter(FantasyTeam.team_id == team_id).first()
        if not team:
            logger.error(f"Team {team_id} not found")
            return Decimal('0.0')
        
        # Get scoring rules for this match
        rules = db.query(ScoringRule).filter(
            ScoringRule.match_id == team.match_id
        ).first()
        
        if not rules:
            logger.warning(f"No scoring rules for match {team.match_id}")
            return Decimal('0.0')
        
        total_team_points = Decimal('0.0')
        
        # Iterate through team players
        for team_player in team.team_players:
            # Get player performance
            performance = db.query(PlayerPerformance).filter(
                PlayerPerformance.match_id == team.match_id,
                PlayerPerformance.player_id == team_player.player_id
            ).first()
            
            if not performance:
                continue
            
            # Calculate base points
            base_points = performance.fantasy_points
            if base_points == 0:
                # Calculate if not already calculated
                base_points = PointsCalculator.calculate_player_points(performance, rules)
                performance.fantasy_points = base_points
            
            # Apply multipliers
            player_points = base_points
            if team_player.is_captain:
                player_points *= Decimal('2.0')
            elif team_player.is_vice_captain:
                player_points *= Decimal('1.5')
            
            # Update team player points
            team_player.points = player_points
            total_team_points += player_points
        
        # Update team total
        team.total_points = total_team_points
        db.commit()
        
        logger.info(f"Updated team {team_id} points: {total_team_points}")
        return total_team_points
    
    @staticmethod
    def recalculate_all_teams(db: Session, match_id: int):
        """
        Recalculate points for all teams in a match
        Called after score update
        """
        teams = db.query(FantasyTeam).filter(
            FantasyTeam.match_id == match_id
        ).all()
        
        for team in teams:
            PointsCalculator.update_team_points(db, team.team_id)
        
        # Invalidate leaderboard cache
        CacheManager.invalidate_leaderboard(match_id)
        
        logger.info(f"Recalculated points for {len(teams)} teams in match {match_id}")