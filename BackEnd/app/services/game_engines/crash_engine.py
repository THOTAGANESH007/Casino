import random
import hashlib
from decimal import Decimal
from typing import Dict, List, Optional

class CrashEngine:
    """Server-authoritative Crash game engine with provably fair mechanism"""
    
    def __init__(self):
        self.house_edge = Decimal("0.01")  # 1% house edge
    
    def generate_crash_point(self, server_seed: str) -> Decimal:
        """
        Generate crash point using provably fair algorithm
        
        The crash point follows an exponential distribution
        Returns a multiplier between 1.00 and theoretically infinite (capped at 10000x)
        """
        # Hash the server seed
        hash_result = hashlib.sha256(server_seed.encode()).hexdigest()
        
        # Take first 13 hex characters (52 bits)
        hex_substring = hash_result[:13]
        
        # Convert to integer
        seed_value = int(hex_substring, 16)
        
        # Maximum value for 13 hex chars
        max_value = 16 ** 13
        
        # Calculate crash point
        # Using: crash_point = 99 / (1 - random_value) * (1 - house_edge)
        random_value = Decimal(seed_value) / Decimal(max_value)
        
        # Prevent division by zero or values too close to 1
        if random_value >= Decimal("0.99"):
            random_value = Decimal("0.99")
        
        crash_point = (Decimal("99") / (Decimal("100") - random_value * Decimal("100")))
        crash_point = crash_point * (Decimal("1") - self.house_edge)
        
        # Cap at 10000x
        if crash_point > Decimal("10000"):
            crash_point = Decimal("10000")
        
        # Ensure minimum of 1.00x
        if crash_point < Decimal("1.00"):
            crash_point = Decimal("1.00")
        
        return crash_point.quantize(Decimal("0.01"))
    
    def hash_crash_point(self, server_seed: str) -> str:
        """Generate a hash to share before the game starts"""
        return hashlib.sha256(server_seed.encode()).hexdigest()
    
    def verify_crash_point(
        self,
        server_seed: str,
        claimed_crash_point: Decimal,
        tolerance: Decimal = Decimal("0.01")
    ) -> bool:
        """Verify that a crash point matches the server seed"""
        actual_crash_point = self.generate_crash_point(server_seed)
        return abs(actual_crash_point - claimed_crash_point) <= tolerance


class CrashGame:
    """Manages a single crash game round with multiple players"""
    
    def __init__(self, game_id: str, server_seed: str):
        self.game_id = game_id
        self.server_seed = server_seed
        self.crash_engine = CrashEngine()
        self.crash_point = self.crash_engine.generate_crash_point(server_seed)
        self.server_seed_hash = self.crash_engine.hash_crash_point(server_seed)
        
        self.players: Dict[int, Dict] = {}  # user_id -> player_data
        self.current_multiplier = Decimal("1.00")
        self.game_started = False
        self.game_crashed = False
    
    def add_player_bet(self, user_id: int, bet_amount: Decimal, auto_cashout: Optional[Decimal] = None) -> bool:
        """Add a player's bet before game starts"""
        if self.game_started:
            return False
        
        self.players[user_id] = {
            "bet_amount": bet_amount,
            "auto_cashout": auto_cashout,
            "cashed_out": False,
            "cashout_multiplier": None,
            "payout": Decimal("0")
        }
        return True
    
    def start_game(self) -> Dict:
        """Start the game"""
        self.game_started = True
        self.current_multiplier = Decimal("1.00")
        
        return {
            "game_id": self.game_id,
            "started": True,
            "server_seed_hash": self.server_seed_hash,
            "players_count": len(self.players)
        }
    
    def update_multiplier(self, elapsed_seconds: Decimal) -> Decimal:
        """Update current multiplier based on elapsed time"""
        if not self.game_started or self.game_crashed:
            return self.current_multiplier
        
        # Multiplier grows exponentially: 1.00 + (time_seconds * 0.1)^1.5
        growth_rate = Decimal("0.1")
        self.current_multiplier = Decimal("1.00") + ((elapsed_seconds * growth_rate) ** Decimal("1.5"))
        
        # Check auto-cashouts
        for user_id, player_data in self.players.items():
            if not player_data["cashed_out"] and player_data["auto_cashout"]:
                if self.current_multiplier >= player_data["auto_cashout"]:
                    self.cash_out_player(user_id)
        
        # Check if game should crash
        if self.current_multiplier >= self.crash_point:
            self.game_crashed = True
            self.current_multiplier = self.crash_point
        
        return self.current_multiplier.quantize(Decimal("0.01"))
    
    def cash_out_player(self, user_id: int) -> Optional[Dict]:
        """Cash out a player at current multiplier"""
        if user_id not in self.players:
            return None
        
        player_data = self.players[user_id]
        
        if player_data["cashed_out"] or self.game_crashed:
            return None
        
        player_data["cashed_out"] = True
        player_data["cashout_multiplier"] = self.current_multiplier
        player_data["payout"] = player_data["bet_amount"] * self.current_multiplier
        
        return {
            "user_id": user_id,
            "cashout_multiplier": float(self.current_multiplier),
            "payout": player_data["payout"]
        }
    
    def get_game_result(self) -> Dict:
        """Get final game results"""
        results = []
        
        for user_id, player_data in self.players.items():
            if player_data["cashed_out"]:
                results.append({
                    "user_id": user_id,
                    "bet_amount": player_data["bet_amount"],
                    "cashout_multiplier": float(player_data["cashout_multiplier"]),
                    "payout": player_data["payout"],
                    "won": True
                })
            else:
                results.append({
                    "user_id": user_id,
                    "bet_amount": player_data["bet_amount"],
                    "payout": Decimal("0"),
                    "won": False
                })
        
        return {
            "game_id": self.game_id,
            "crash_point": float(self.crash_point),
            "server_seed": self.server_seed,
            "server_seed_hash": self.server_seed_hash,
            "player_results": results
        }
    
    def get_current_state(self) -> Dict:
        """Get current game state"""
        return {
            "game_id": self.game_id,
            "started": self.game_started,
            "crashed": self.game_crashed,
            "current_multiplier": float(self.current_multiplier),
            "crash_point": float(self.crash_point) if self.game_crashed else None,
            "players_count": len(self.players),
            "active_players": sum(1 for p in self.players.values() if not p["cashed_out"])
        }