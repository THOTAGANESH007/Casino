import hashlib
import secrets
from decimal import Decimal
from typing import Tuple

class DiceEngine:
    """Provably fair dice game engine"""
    
    def __init__(self):
        pass
    
    def generate_server_seed(self) -> str:
        """Generate a random server seed"""
        return secrets.token_hex(32)
    
    def hash_server_seed(self, server_seed: str) -> str:
        """Hash the server seed to share with client before game"""
        return hashlib.sha256(server_seed.encode()).hexdigest()
    
    def roll_dice(
        self,
        server_seed: str,
        client_seed: str,
        nonce: int
    ) -> float:
        """
        Roll dice using provably fair algorithm
        Returns a number between 0.00 and 99.99
        """
        # Combine seeds and nonce
        combined = f"{server_seed}:{client_seed}:{nonce}"
        
        # Generate hash
        hash_result = hashlib.sha256(combined.encode()).hexdigest()
        
        # Take first 8 characters and convert to decimal
        hex_substring = hash_result[:8]
        decimal_value = int(hex_substring, 16)
        
        # Convert to range 0-9999
        result = (decimal_value % 10000) / 100
        
        return round(result, 2)
    
    def calculate_multiplier(self, target: float, roll_over: bool = True) -> Decimal:
        """
        Calculate win multiplier based on target
        
        target: The target number (0-99.99)
        roll_over: True if betting roll will be over target, False if under
        """
        if roll_over:
            win_chance = (100 - target) / 100
        else:
            win_chance = target / 100
        
        if win_chance <= 0 or win_chance >= 1:
            return Decimal("0")
        
        # House edge: 1%
        house_edge = Decimal("0.01")
        multiplier = (Decimal("1") - house_edge) / Decimal(str(win_chance))
        
        return multiplier.quantize(Decimal("0.0001"))
    
    def check_win(
        self,
        roll_result: float,
        target: float,
        roll_over: bool = True
    ) -> bool:
        """Check if the roll is a win"""
        if roll_over:
            return roll_result > target
        else:
            return roll_result < target
    
    def play_round(
        self,
        bet_amount: Decimal,
        target: float,
        roll_over: bool,
        client_seed: str,
        nonce: int
    ) -> dict:
        """
        Play a round of dice
        
        Returns:
            dict with server_seed, server_seed_hash, roll_result, won, payout, multiplier
        """
        # Generate server seed
        server_seed = self.generate_server_seed()
        server_seed_hash = self.hash_server_seed(server_seed)
        
        # Roll dice
        roll_result = self.roll_dice(server_seed, client_seed, nonce)
        
        # Check if won
        won = self.check_win(roll_result, target, roll_over)
        
        # Calculate payout
        if won:
            multiplier = self.calculate_multiplier(target, roll_over)
            payout = bet_amount * multiplier
        else:
            multiplier = Decimal("0")
            payout = Decimal("0")
        
        return {
            "server_seed": server_seed,
            "server_seed_hash": server_seed_hash,
            "client_seed": client_seed,
            "nonce": nonce,
            "roll_result": roll_result,
            "target": target,
            "roll_over": roll_over,
            "won": won,
            "multiplier": float(multiplier),
            "payout": payout,
            "bet_amount": bet_amount
        }
    
    def verify_roll(
        self,
        server_seed: str,
        client_seed: str,
        nonce: int,
        claimed_result: float
    ) -> bool:
        """Verify that a roll result is correct"""
        actual_result = self.roll_dice(server_seed, client_seed, nonce)
        return abs(actual_result - claimed_result) < 0.01