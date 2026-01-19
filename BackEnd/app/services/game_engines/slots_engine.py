import random
from typing import List, Dict
from decimal import Decimal

class SlotsEngine:
    """Server-authoritative Slots game engine (3x3 grid)"""
    
    # Symbols and their weights (higher weight = more common)
    SYMBOLS = {
        "💎": {"weight": 1, "payout": {3: 50, 2: 10}},      # Diamond - rare
        "7️⃣": {"weight": 2, "payout": {3: 30, 2: 5}},        # Seven
        "🍒": {"weight": 5, "payout": {3: 20, 2: 3}},        # Cherry
        "🍋": {"weight": 8, "payout": {3: 15, 2: 2}},        # Lemon
        "🍊": {"weight": 10, "payout": {3: 10, 2: 1}},       # Orange
        "🍇": {"weight": 12, "payout": {3: 8}},              # Grape
        "🔔": {"weight": 15, "payout": {3: 5}},              # Bell
    }
    
    def __init__(self, rows: int = 3, cols: int = 3):
        self.rows = rows
        self.cols = cols
        self.rtp_percent = 96.0  # Return to Player percentage
    
    def get_weighted_symbol(self) -> str:
        """Get a random symbol based on weights"""
        symbols = []
        weights = []
        
        for symbol, data in self.SYMBOLS.items():
            symbols.append(symbol)
            weights.append(data["weight"])
        
        return random.choices(symbols, weights=weights, k=1)[0]
    
    def spin(self) -> List[List[str]]:
        """Spin the reels and return grid"""
        grid = []
        for _ in range(self.rows):
            row = []
            for _ in range(self.cols):
                row.append(self.get_weighted_symbol())
            grid.append(row)
        return grid
    
    def check_winning_lines(self, grid: List[List[str]]) -> List[Dict]:
        """
        Check for winning combinations
        
        Checks:
        - Horizontal lines (rows)
        - Vertical lines (columns)
        - Diagonals
        """
        wins = []
        
        # Check horizontal lines
        for row_idx, row in enumerate(grid):
            symbol_counts = {}
            for symbol in row:
                symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
            
            for symbol, count in symbol_counts.items():
                if count >= 2 and symbol in self.SYMBOLS:
                    payout_data = self.SYMBOLS[symbol]["payout"]
                    if count in payout_data:
                        wins.append({
                            "type": "horizontal",
                            "line": row_idx,
                            "symbol": symbol,
                            "count": count,
                            "multiplier": payout_data[count]
                        })
        
        # Check vertical lines
        for col_idx in range(self.cols):
            column = [grid[row_idx][col_idx] for row_idx in range(self.rows)]
            symbol_counts = {}
            for symbol in column:
                symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
            
            for symbol, count in symbol_counts.items():
                if count >= 2 and symbol in self.SYMBOLS:
                    payout_data = self.SYMBOLS[symbol]["payout"]
                    if count in payout_data:
                        wins.append({
                            "type": "vertical",
                            "line": col_idx,
                            "symbol": symbol,
                            "count": count,
                            "multiplier": payout_data[count]
                        })
        
        # Check diagonal (top-left to bottom-right)
        if self.rows == self.cols:
            diagonal1 = [grid[i][i] for i in range(self.rows)]
            symbol_counts = {}
            for symbol in diagonal1:
                symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
            
            for symbol, count in symbol_counts.items():
                if count >= 2 and symbol in self.SYMBOLS:
                    payout_data = self.SYMBOLS[symbol]["payout"]
                    if count in payout_data:
                        wins.append({
                            "type": "diagonal",
                            "line": "main",
                            "symbol": symbol,
                            "count": count,
                            "multiplier": payout_data[count]
                        })
            
            # Check diagonal (top-right to bottom-left)
            diagonal2 = [grid[i][self.cols - 1 - i] for i in range(self.rows)]
            symbol_counts = {}
            for symbol in diagonal2:
                symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
            
            for symbol, count in symbol_counts.items():
                if count >= 2 and symbol in self.SYMBOLS:
                    payout_data = self.SYMBOLS[symbol]["payout"]
                    if count in payout_data:
                        wins.append({
                            "type": "diagonal",
                            "line": "anti",
                            "symbol": symbol,
                            "count": count,
                            "multiplier": payout_data[count]
                        })
        
        return wins
    
    def play_round(self, bet_amount: Decimal) -> Dict:
        """
        Play a round of slots
        
        Returns:
            dict with grid, wins, total_multiplier, payout
        """
        # Spin the reels
        grid = self.spin()
        
        # Check for wins
        wins = self.check_winning_lines(grid)
        
        # Calculate total multiplier
        total_multiplier = Decimal("0")
        for win in wins:
            total_multiplier += Decimal(str(win["multiplier"]))
        
        # Calculate payout
        payout = bet_amount * total_multiplier if total_multiplier > 0 else Decimal("0")
        
        return {
            "grid": grid,
            "wins": wins,
            "total_multiplier": float(total_multiplier),
            "payout": payout,
            "bet_amount": bet_amount
        }