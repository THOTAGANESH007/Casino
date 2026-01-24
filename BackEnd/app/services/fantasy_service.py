from decimal import Decimal
from typing import Dict

class FantasyService:
    POINTS_RULES = {
        "run": Decimal("1"),
        "boundary": Decimal("1"),
        "six": Decimal("2"),
        "half_century": Decimal("8"),
        "century": Decimal("16"),
        "wicket": Decimal("25"),
        "catch": Decimal("8"),
        "run_out": Decimal("6"),
    }

    @staticmethod
    def calculate_player_points(stats: Dict) -> Decimal:
        """Calculate points for a single real player based on stats"""
        points = Decimal("0")
        runs = stats.get("runs", 0)
        wickets = stats.get("wickets", 0)
        catches = stats.get("catches", 0)
        run_outs = stats.get("run_outs", 0)

        # Batting
        points += Decimal(runs) * FantasyService.POINTS_RULES["run"]
        points += Decimal(runs // 4) * FantasyService.POINTS_RULES["boundary"]
        points += Decimal(runs // 6) * FantasyService.POINTS_RULES["six"]
        if runs >= 100: points += FantasyService.POINTS_RULES["century"]
        elif runs >= 50: points += FantasyService.POINTS_RULES["half_century"]

        # Bowling/Fielding
        points += Decimal(wickets) * FantasyService.POINTS_RULES["wicket"]
        points += Decimal(catches) * FantasyService.POINTS_RULES["catch"]
        points += Decimal(run_outs) * FantasyService.POINTS_RULES["run_out"]

        return points

    @staticmethod
    def calculate_team_score(team, all_players_map) -> Decimal:
        """Calculate total score for a user team"""
        total = Decimal("0")
        
        for player in team.players:
            # Get latest stats from the map (to avoid DB queries inside loop)
            p_obj = all_players_map.get(player.id)
            if not p_obj: continue
            
            p_points = FantasyService.calculate_player_points(p_obj.stats or {})
            
            # Multipliers
            if player.id == team.captain_id:
                p_points *= Decimal("2.0")
            elif player.id == team.vice_captain_id:
                p_points *= Decimal("1.5")
            
            total += p_points
            
        return total

fantasy_service = FantasyService()