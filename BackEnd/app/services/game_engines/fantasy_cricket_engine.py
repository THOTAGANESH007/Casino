from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime
from enum import Enum

class PlayerRole(str, Enum):
    BATSMAN = "batsman"
    BOWLER = "bowler"
    ALL_ROUNDER = "all_rounder"
    WICKET_KEEPER = "wicket_keeper"

class MatchStatus(str, Enum):
    UPCOMING = "upcoming"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class FantasyPlayer:
    """Represents a real cricket player"""
    
    def __init__(
        self,
        player_id: int,
        name: str,
        role: PlayerRole,
        team: str,
        base_price: Decimal
    ):
        self.player_id = player_id
        self.name = name
        self.role = role
        self.team = team
        self.base_price = base_price
        
        # Stats (set after match)
        self.runs_scored: int = 0
        self.wickets_taken: int = 0
        self.catches: int = 0
        self.run_outs: int = 0
        self.strike_rate: float = 0.0
        self.economy_rate: float = 0.0

class FantasyTeam:
    """User's fantasy team"""
    
    def __init__(
        self,
        team_id: int,
        user_id: int,
        match_id: str,
        entry_fee: Decimal
    ):
        self.team_id = team_id
        self.user_id = user_id
        self.match_id = match_id
        self.entry_fee = entry_fee
        
        self.players: List[FantasyPlayer] = []
        self.captain_id: Optional[int] = None  # Gets 2x points
        self.vice_captain_id: Optional[int] = None  # Gets 1.5x points
        
        self.total_points: Decimal = Decimal("0")
        self.rank: Optional[int] = None
        self.prize_amount: Decimal = Decimal("0")
    
    def add_player(self, player: FantasyPlayer) -> bool:
        """Add player to team (max 11)"""
        if len(self.players) >= 11:
            return False
        self.players.append(player)
        return True
    
    def set_captain(self, player_id: int) -> bool:
        """Set captain"""
        if any(p.player_id == player_id for p in self.players):
            self.captain_id = player_id
            return True
        return False
    
    def set_vice_captain(self, player_id: int) -> bool:
        """Set vice captain"""
        if any(p.player_id == player_id for p in self.players):
            self.vice_captain_id = player_id
            return True
        return False
    
    def calculate_total_cost(self) -> Decimal:
        """Calculate total team cost"""
        return sum(p.base_price for p in self.players)

class FantasyCricketEngine:
    """Fantasy cricket game engine with delayed settlement"""
    
    # Point scoring rules
    POINTS = {
        "run": Decimal("1"),
        "boundary": Decimal("1"),  # Bonus for 4
        "six": Decimal("2"),  # Bonus for 6
        "half_century": Decimal("8"),
        "century": Decimal("16"),
        "wicket": Decimal("25"),
        "catch": Decimal("8"),
        "run_out": Decimal("6"),
        "maiden_over": Decimal("12"),
    }
    
    def __init__(self, match_id: str, team1: str, team2: str, max_budget: Decimal = Decimal("100")):
        self.match_id = match_id
        self.team1 = team1
        self.team2 = team2
        self.max_budget = max_budget
        
        self.status: MatchStatus = MatchStatus.UPCOMING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        
        self.available_players: List[FantasyPlayer] = []
        self.teams: Dict[int, FantasyTeam] = {}  # team_id -> FantasyTeam
        
        self.prize_pool: Decimal = Decimal("0")
        self.entry_fee: Decimal = Decimal("10")
        
        # Prize distribution (as percentage of pool)
        self.prize_distribution = [
            {"rank_from": 1, "rank_to": 1, "percentage": 40},
            {"rank_from": 2, "rank_to": 2, "percentage": 25},
            {"rank_from": 3, "rank_to": 3, "percentage": 15},
            {"rank_from": 4, "rank_to": 5, "percentage": 10},
            {"rank_from": 6, "rank_to": 10, "percentage": 10},
        ]
    
    def add_available_player(self, player: FantasyPlayer):
        """Add a player to the available pool"""
        self.available_players.append(player)
    
    def create_team(self, user_id: int) -> FantasyTeam:
        """Create a new fantasy team"""
        if self.status != MatchStatus.UPCOMING:
            raise Exception("Cannot create team after match starts")
        
        team_id = len(self.teams) + 1
        team = FantasyTeam(team_id, user_id, self.match_id, self.entry_fee)
        self.teams[team_id] = team
        
        # Add to prize pool
        self.prize_pool += self.entry_fee
        
        return team
    
    def validate_team(self, team: FantasyTeam) -> bool:
        """Validate team composition"""
        if len(team.players) != 11:
            return False
        
        if team.calculate_total_cost() > self.max_budget:
            return False
        
        if not team.captain_id or not team.vice_captain_id:
            return False
        
        # Check role limits (example: max 7 batsmen, 7 bowlers, etc.)
        role_counts = {}
        for player in team.players:
            role_counts[player.role] = role_counts.get(player.role, 0) + 1
        
        # Example rules
        if role_counts.get(PlayerRole.BATSMAN, 0) > 7:
            return False
        if role_counts.get(PlayerRole.BOWLER, 0) > 7:
            return False
        
        return True
    
    def start_match(self):
        """Start the match (no more teams can join)"""
        self.status = MatchStatus.LIVE
        self.start_time = datetime.utcnow()
    
    def calculate_player_points(self, player: FantasyPlayer) -> Decimal:
        """Calculate points for a player based on performance"""
        points = Decimal("0")
        
        # Batting points
        points += Decimal(str(player.runs_scored)) * self.POINTS["run"]
        
        # Boundaries
        fours = player.runs_scored // 4  # Simplified
        sixes = player.runs_scored // 6  # Simplified
        points += Decimal(str(fours)) * self.POINTS["boundary"]
        points += Decimal(str(sixes)) * self.POINTS["six"]
        
        # Milestones
        if player.runs_scored >= 100:
            points += self.POINTS["century"]
        elif player.runs_scored >= 50:
            points += self.POINTS["half_century"]
        
        # Bowling points
        points += Decimal(str(player.wickets_taken)) * self.POINTS["wicket"]
        
        # Fielding points
        points += Decimal(str(player.catches)) * self.POINTS["catch"]
        points += Decimal(str(player.run_outs)) * self.POINTS["run_out"]
        
        return points
    
    def settle_match(self):
        """Settle match and calculate all team points"""
        if self.status != MatchStatus.LIVE:
            raise Exception("Match must be live to settle")
        
        self.status = MatchStatus.COMPLETED
        self.end_time = datetime.utcnow()
        
        # Calculate points for each team
        for team in self.teams.values():
            total_points = Decimal("0")
            
            for player in team.players:
                player_points = self.calculate_player_points(player)
                
                # Apply captain/vice-captain multipliers
                if player.player_id == team.captain_id:
                    player_points *= Decimal("2.0")
                elif player.player_id == team.vice_captain_id:
                    player_points *= Decimal("1.5")
                
                total_points += player_points
            
            team.total_points = total_points
        
        # Rank teams
        sorted_teams = sorted(
            self.teams.values(),
            key=lambda t: t.total_points,
            reverse=True
        )
        
        for rank, team in enumerate(sorted_teams, start=1):
            team.rank = rank
        
        # Distribute prizes
        self._distribute_prizes(sorted_teams)
    
    def _distribute_prizes(self, sorted_teams: List[FantasyTeam]):
        """Distribute prize money based on rankings"""
        for prize_rule in self.prize_distribution:
            rank_from = prize_rule["rank_from"]
            rank_to = prize_rule["rank_to"]
            percentage = Decimal(str(prize_rule["percentage"])) / Decimal("100")
            
            prize_for_range = self.prize_pool * percentage
            num_winners = rank_to - rank_from + 1
            prize_per_winner = prize_for_range / Decimal(str(num_winners))
            
            for team in sorted_teams:
                if rank_from <= team.rank <= rank_to:
                    team.prize_amount = prize_per_winner
    
    def get_leaderboard(self) -> List[Dict]:
        """Get current leaderboard"""
        sorted_teams = sorted(
            self.teams.values(),
            key=lambda t: t.total_points,
            reverse=True
        )
        
        return [
            {
                "rank": team.rank or idx + 1,
                "team_id": team.team_id,
                "user_id": team.user_id,
                "total_points": float(team.total_points),
                "prize_amount": float(team.prize_amount)
            }
            for idx, team in enumerate(sorted_teams)
        ]