import requests
from typing import List, Dict, Optional

from ..models.player import PlayerRoles
from ..config import settings
from ..redis_client import CacheManager
import logging

logger = logging.getLogger(__name__)


class CricketAPIService:
    """
    Service to interact with Cricket API
    Using CricAPI (https://www.cricapi.com/)
    Free tier: 100 requests/day
    For production, use paid tier or alternative like Cricbuzz API
    """
    
    BASE_URL = settings.CRICKET_API_BASE_URL
    API_KEY = settings.CRICKET_API_KEY
    CACHE_KEY = "current_matches"
    CACHE_TTL = 900  # 15 minutes


    @classmethod
    def _fetch_current_matches(cls, force_refresh: bool = False) -> List[Dict]:

        try:
            # ---------- CHECK CACHE ----------
            if not force_refresh:
                cached = CacheManager.get(cls.CACHE_KEY)
                if cached:
                    return cached

            # ---------- API CALL ----------
            url = f"{cls.BASE_URL}/currentMatches"
            params = {"apikey": cls.API_KEY, "offset": 0}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "success":
                logger.error(f"API error: {data}")
                return []

            matches = data.get("data", [])

            # ---------- SAVE CACHE ----------
            CacheManager.set(cls.CACHE_KEY, matches, ttl=cls.CACHE_TTL)

            return matches

        except Exception as e:
            logger.error(f"Error fetching matches: {str(e)}")
            return []

        
    @classmethod
    def get_upcoming_matches(cls) -> List[Dict]:
        matches = cls._fetch_current_matches()

        return [
            m for m in matches
            if not m.get("matchStarted") and not m.get("matchEnded")
        ]

    @classmethod
    def get_live_matches(cls) -> List[Dict]:
        matches = cls._fetch_current_matches()

        return [
            m for m in matches
            if m.get("matchStarted") and not m.get("matchEnded")
        ]
    
    @classmethod
    def get_completed_matches(cls) -> List[Dict]:
        matches = cls._fetch_current_matches()

        return [
            m for m in matches
            if m.get("matchEnded")
        ]

    @classmethod
    def get_upcoming_matches(cls) -> List[Dict]:
        """
        Fetch upcoming cricket matches
        Returns list of matches with basic info
        """
        try:
            url = f"{cls.BASE_URL}/currentMatches"
            params = {"apikey": cls.API_KEY, "offset": 0}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") != "success":
                logger.error(f"API error: {data}")
                return []
            
            matches = data.get("data", [])
            return matches
            
        except Exception as e:
            logger.error(f"Error fetching matches: {str(e)}")
            return []
    
    @classmethod
    def get_match_info(cls, match_id: str) -> Optional[Dict]:
        """
        Fetch detailed match information including squads
        """
        try:
            # Check cache first
            cached = CacheManager.get_match_data(match_id)
            if cached:
                return cached
            
            url = f"{cls.BASE_URL}/match_info"
            params = {"apikey": cls.API_KEY, "id": match_id}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") != "success":
                logger.error(f"API error for match {match_id}: {data}")
                return None
            
            match_data = data.get("data", {})
            
            # Cache the result
            CacheManager.set_match_data(match_id, match_data)
            
            return match_data
            
        except Exception as e:
            logger.error(f"Error fetching match info {match_id}: {str(e)}")
            return None
    
    @classmethod
    def get_match_score(cls, match_id: str) -> Optional[Dict]:
        """
        Fetch live match score
        Returns current score, player stats, etc.
        """
        try:
            url = f"{cls.BASE_URL}/match_scorecard"
            params = {"apikey": cls.API_KEY, "id": match_id}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") != "success":
                logger.error(f"API error for score {match_id}: {data}")
                return None
            
            return data.get("data", {})
            
        except Exception as e:
            logger.error(f"Error fetching match score {match_id}: {str(e)}")
            return None
    
    @classmethod
    def get_player_stats(cls, match_id: str) -> Dict[str, Dict]:

        try:
            scorecard = cls.get_match_score(match_id)
            if not scorecard:
                return {}

            player_stats = {}

            # iterate innings
            for innings in scorecard.get("scorecard", []):

                # ---------------- BATSMEN ----------------
                for bat in innings.get("batting", []):
                    batsman = bat.get("batsman", {})
                    player_id = batsman.get("id")

                    if not player_id:
                        continue

                    player_stats[player_id] = {
                        "name": batsman.get("name"),
                        "runs": bat.get("r", 0),
                        "balls_faced": bat.get("b", 0),
                        "fours": bat.get("4s", 0),
                        "sixes": bat.get("6s", 0),
                        "strike_rate": bat.get("sr", 0),
                        "wickets": 0,
                        "overs": 0,
                        "runs_conceded": 0,
                        "maidens": 0,
                        "economy": 0,
                        "catches": 0,
                        "stumpings": 0,
                        "run_outs": 0
                    }

                # ---------------- BOWLERS ----------------
                for bowl in innings.get("bowling", []):
                    bowler = bowl.get("bowler", {})
                    player_id = bowler.get("id")

                    if not player_id:
                        continue

                    if player_id not in player_stats:
                        player_stats[player_id] = {
                            "name": bowler.get("name"),
                            "runs": 0,
                            "balls_faced": 0,
                            "fours": 0,
                            "sixes": 0,
                            "strike_rate": 0,
                            "catches": 0,
                            "stumpings": 0,
                            "run_outs": 0
                        }

                    player_stats[player_id].update({
                        "wickets": bowl.get("w", 0),
                        "overs": float(bowl.get("o", 0)),
                        "runs_conceded": bowl.get("r", 0),
                        "maidens": bowl.get("m", 0),
                        "economy": float(bowl.get("eco", 0))
                    })

                # ---------------- FIELDING ----------------
                for field in innings.get("catching", []):
                    catcher = field.get("catcher", {})
                    player_id = catcher.get("id")

                    if not player_id:
                        continue

                    if player_id not in player_stats:
                        player_stats[player_id] = {
                            "name": catcher.get("name"),
                            "runs": 0,
                            "balls_faced": 0,
                            "fours": 0,
                            "sixes": 0,
                            "strike_rate": 0,
                            "wickets": 0,
                            "overs": 0,
                            "runs_conceded": 0,
                            "maidens": 0,
                            "economy": 0
                        }

                    player_stats[player_id].update({
                        "catches": field.get("catch", 0),
                        "stumpings": field.get("stumped", 0),
                        "run_outs": field.get("runout", 0)
                    })

            return player_stats

        except Exception as e:
            logger.error(f"Error parsing player stats: {str(e)}")
            return {}
    @classmethod
    def format_role(cls, api_role: str | None) -> str:
        if not api_role:
            return "BAT"

        role = api_role.lower()

        if "wk" in role or "keeper" in role:
            return "WK"
        if "all" in role:
            return "AR"
        if "bowl" in role:
            return "BOWL"
        if "bat" in role:
            return "BAT"

        return "BAT"


    @classmethod
    def get_match_squads(cls, match_id: str) -> Optional[Dict]:
        """
        Fetch squads only (no DB operations)
        Returns:
        {
            "teamA": { "name": "", "squad": [] },
            "teamB": { "name": "", "squad": [] }
        }
        """

        try:
            url = f"{cls.BASE_URL}/match_squad"
            params = {"apikey": cls.API_KEY, "id": match_id}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "success":
                logger.error(f"Squad API error: {data}")
                return None

            teams = data.get("data", [])

            if not isinstance(teams, list) or len(teams) < 2:
                logger.warning("Invalid squad structure received")
                return None

            def format_team(team):
                return {
                    "name": team.get("teamName", ""),
                    "squad": [
                        {
                            "id": p.get("id"),
                            "name": p.get("name"),
                            "role": cls.format_role(p.get("role")),
                            "image": p.get("playerImg"),
                            "battingStyle": p.get("battingStyle"),
                            "bowlingStyle": p.get("bowlingStyle"),
                            "country": p.get("country")
                        }
                        for p in team.get("players", [])
                        if p.get("id")
                    ]
                }

            return {
                "teamA": format_team(teams[0]),
                "teamB": format_team(teams[1])
            }

        except Exception as e:
            logger.error(f"Error fetching squads: {str(e)}")
            return None
