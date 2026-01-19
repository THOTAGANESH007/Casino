import random
from typing import List, Dict
from decimal import Decimal

class RouletteEngine:
    """Server-authoritative Roulette engine (European style - single zero)"""
    
    # Roulette wheel numbers
    NUMBERS = list(range(0, 37))  # 0-36
    
    # Red numbers in European roulette
    RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
    
    def __init__(self, seed: int = None):
        if seed:
            random.seed(seed)
    
    def spin(self) -> int:
        """Spin the wheel and return winning number"""
        return random.choice(self.NUMBERS)
    
    def get_color(self, number: int) -> str:
        """Get color of a number"""
        if number == 0:
            return "green"
        elif number in self.RED_NUMBERS:
            return "red"
        else:
            return "black"
    
    def check_bet(self, bet_type: str, bet_value: any, winning_number: int) -> bool:
        """Check if a bet wins"""
        
        if bet_type == "straight":
            # Bet on single number
            return int(bet_value) == winning_number
        
        elif bet_type == "red":
            return winning_number in self.RED_NUMBERS
        
        elif bet_type == "black":
            return winning_number in self.BLACK_NUMBERS
        
        elif bet_type == "even":
            return winning_number != 0 and winning_number % 2 == 0
        
        elif bet_type == "odd":
            return winning_number != 0 and winning_number % 2 == 1
        
        elif bet_type == "low":
            # 1-18
            return 1 <= winning_number <= 18
        
        elif bet_type == "high":
            # 19-36
            return 19 <= winning_number <= 36
        
        elif bet_type == "dozen1":
            # 1-12
            return 1 <= winning_number <= 12
        
        elif bet_type == "dozen2":
            # 13-24
            return 13 <= winning_number <= 24
        
        elif bet_type == "dozen3":
            # 25-36
            return 25 <= winning_number <= 36
        
        elif bet_type == "column1":
            # 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
            return winning_number > 0 and (winning_number - 1) % 3 == 0
        
        elif bet_type == "column2":
            # 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
            return winning_number > 0 and (winning_number - 2) % 3 == 0
        
        elif bet_type == "column3":
            # 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
            return winning_number > 0 and winning_number % 3 == 0
        
        elif bet_type == "split":
            # Bet on two adjacent numbers
            numbers = bet_value if isinstance(bet_value, list) else []
            return winning_number in numbers
        
        elif bet_type == "street":
            # Bet on a row of three numbers
            numbers = bet_value if isinstance(bet_value, list) else []
            return winning_number in numbers
        
        elif bet_type == "corner":
            # Bet on four numbers that meet at a corner
            numbers = bet_value if isinstance(bet_value, list) else []
            return winning_number in numbers
        
        elif bet_type == "line":
            # Bet on two adjacent streets (6 numbers)
            numbers = bet_value if isinstance(bet_value, list) else []
            return winning_number in numbers
        
        return False
    
    def get_payout_multiplier(self, bet_type: str) -> Decimal:
        """Get payout multiplier for bet type"""
        payouts = {
            "straight": Decimal("35"),      # Single number: 35:1
            "split": Decimal("17"),         # Two numbers: 17:1
            "street": Decimal("11"),        # Three numbers: 11:1
            "corner": Decimal("8"),         # Four numbers: 8:1
            "line": Decimal("5"),           # Six numbers: 5:1
            "dozen1": Decimal("2"),         # Dozen: 2:1
            "dozen2": Decimal("2"),
            "dozen3": Decimal("2"),
            "column1": Decimal("2"),        # Column: 2:1
            "column2": Decimal("2"),
            "column3": Decimal("2"),
            "red": Decimal("1"),            # Even money: 1:1
            "black": Decimal("1"),
            "even": Decimal("1"),
            "odd": Decimal("1"),
            "low": Decimal("1"),
            "high": Decimal("1"),
        }
        return payouts.get(bet_type, Decimal("0"))
    
    def play_round(self, bets: List[Dict]) -> Dict:
        """
        Play a round of roulette
        
        bets: List of dicts with keys: bet_type, bet_value, bet_amount
        Returns: dict with winning_number, color, results
        """
        winning_number = self.spin()
        color = self.get_color(winning_number)
        
        results = []
        total_payout = Decimal("0")
        
        for bet in bets:
            bet_type = bet["bet_type"]
            bet_value = bet.get("bet_value")
            bet_amount = Decimal(str(bet["bet_amount"]))
            
            is_winner = self.check_bet(bet_type, bet_value, winning_number)
            
            if is_winner:
                multiplier = self.get_payout_multiplier(bet_type)
                payout = bet_amount * (multiplier + 1)  # Include original bet
                total_payout += payout
            else:
                payout = Decimal("0")
            
            results.append({
                "bet_type": bet_type,
                "bet_value": bet_value,
                "bet_amount": bet_amount,
                "won": is_winner,
                "payout": payout
            })
        
        return {
            "winning_number": winning_number,
            "color": color,
            "bet_results": results,
            "total_payout": total_payout
        }