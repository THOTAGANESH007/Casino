import requests
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
from zoneinfo import ZoneInfo
from ..config import settings

logger = logging.getLogger(__name__)


class RapidAPICricketService:
    """
    Production-ready service to fetch upcoming matches
    with proper timezone handling.
    """

    BASE_URL = "https://cricbuzz-cricket.p.rapidapi.com"

    HEADERS = {
        "X-RapidAPI-Key": settings.RAPID_API_KEY,
        "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com"
    }

    # Timezone constant
    IST = ZoneInfo("Asia/Kolkata")

    # --------------------------------------------------
    # Safe timestamp parser
    # --------------------------------------------------
    @staticmethod
    def parse_timestamp(ts) -> Optional[datetime]:
        try:
            return datetime.fromtimestamp(int(ts) / 1000, tz=timezone.utc)
        except Exception:
            return None

    # --------------------------------------------------
    # Match state detector
    # --------------------------------------------------
    @staticmethod
    def get_match_state(start_time: datetime) -> str:

        now = datetime.now(timezone.utc)

        if start_time > now:
            return "UPCOMING"
        else:
            return "LIVE_OR_COMPLETED"

    # --------------------------------------------------
    # Fetch Upcoming Matches
    # --------------------------------------------------
    @classmethod
    def get_upcoming_matches(cls) -> List[Dict]:

        try:
            url = f"{cls.BASE_URL}/matches/v1/upcoming"

            res = requests.get(url, headers=cls.HEADERS, timeout=10)
            res.raise_for_status()

            data = res.json()
            matches = []

            for category in data.get("typeMatches", []):

                for series in category.get("seriesMatches", []):

                    wrapper = series.get("seriesAdWrapper")
                    if not wrapper:
                        continue

                    series_name = wrapper.get("seriesName")

                    for match in wrapper.get("matches", []):

                        info = match.get("matchInfo", {})

                        start_time = cls.parse_timestamp(
                            info.get("startDate")
                        )

                        # skip invalid timestamps
                        if not start_time:
                            continue

                        # keep only future matches
                        if start_time <= datetime.now(timezone.utc):
                            continue

                        matches.append({
                            "id": info.get("matchId"),
                            "name": info.get("matchDesc"),
                            "series": series_name,
                            "match_type": info.get("matchFormat"),
                            "match_state": cls.get_match_state(start_time),

                            "team_a": info.get("team1", {}).get("teamName"),
                            "team_b": info.get("team2", {}).get("teamName"),

                            # UTC timestamp (for DB/backend logic)
                            "start_time_utc": start_time.isoformat(),

                            # IST timestamp (for frontend display)
                            "start_time_ist": start_time.astimezone(cls.IST)
                            .strftime("%Y-%m-%d %H:%M:%S IST"),

                            "venue": info.get("venueInfo", {}).get("ground"),
                            "venue_city": info.get("venueInfo", {}).get("city"),
                            "venue_country": info.get("venueInfo", {}).get("country")
                        })
            return matches

        except Exception as e:
            logger.error(f"RapidAPI upcoming fetch error: {e}")
            return []
        
    # --------------------------------------------------
    # Fetch Live Matches
    # --------------------------------------------------
    @classmethod
    def get_live_matches(cls):

        try:
            url = f"{cls.BASE_URL}/matches/v1/live"

            res = requests.get(url, headers=cls.HEADERS, timeout=10)
            res.raise_for_status()

            data = res.json()
            matches = []

            for category in data.get("typeMatches", []):

                for series in category.get("seriesMatches", []):

                    wrapper = series.get("seriesAdWrapper")
                    if not wrapper:
                        continue

                    series_name = wrapper.get("seriesName")

                    for match in wrapper.get("matches", []):

                        info = match.get("matchInfo", {})
                        score = match.get("matchScore", {})

                        start_time = cls.parse_timestamp(
                            info.get("startDate")
                        )

                        if not start_time:
                            continue

                        matches.append({
                            "id": info.get("matchId"),
                            "name": info.get("matchDesc"),
                            "series": series_name,
                            "match_type": info.get("matchFormat"),

                            "match_state": "LIVE",

                            "team_a": info.get("team1", {}).get("teamName"),
                            "team_b": info.get("team2", {}).get("teamName"),

                            # UTC + IST times
                            "start_time_utc": start_time.isoformat(),
                            "start_time_ist": start_time.astimezone(cls.IST)
                            .strftime("%Y-%m-%d %H:%M:%S IST"),

                            "venue": info.get("venueInfo", {}).get("ground"),
                            "venue_city": info.get("venueInfo", {}).get("city"),

                            # Score data
                            "score": score
                        })
            return matches

        except Exception as e:
            logger.error(f"Live match fetch error: {e}")
            return []

    # --------------------------------------------------
    # Fetch Squad for a Match
    # --------------------------------------------------

    @classmethod
    def get_match_squads(cls, match_id: int) -> Dict:
        """
        Fetch squads for a given match
        Returns both teams squads
        """

        try:
            # match details endpoint (common Cricbuzz-style endpoint)
            url = f"{cls.BASE_URL}/mcenter/v1/{match_id}"

            res = requests.get(url, headers=cls.HEADERS, timeout=10)
            res.raise_for_status()

            data = res.json()
            print(data)

            squads = {
                "team_a": [],
                "team_b": []
            }

            team1 = data.get("team1", {})
            team2 = data.get("team2", {})

            # team A players
            for player in team1.get("playerDetails", []):
                squads["team_a"].append({
                    "id": player.get("id"),
                    "name": player.get("name"),
                    "role": player.get("role"),
                    "batting_style": player.get("battingStyle"),
                    "bowling_style": player.get("bowlingStyle")
                })

            # team B players
            for player in team2.get("playerDetails", []):
                squads["team_b"].append({
                    "id": player.get("id"),
                    "name": player.get("name"),
                    "role": player.get("role"),
                    "batting_style": player.get("battingStyle"),
                    "bowling_style": player.get("bowlingStyle")
                })

            return squads

        except Exception as e:
            logger.error(f"Squad fetch error for {match_id}: {e}")
            return {"team_a": [], "team_b": []}
