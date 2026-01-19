import random
from typing import List, Set
from decimal import Decimal

class MinesEngine:
    """Server-authoritative Mines game engine"""
    
    def __init__(self, grid_size: int = 25, num_mines: int = 5):
        """
        Initialize mines game
        
        grid_size: Total number of tiles (default 5x5 = 25)
        num_mines: Number of mines to place
        """
        self.grid_size = grid_size
        self.num_mines = num_mines
        self.mine_positions: Set[int] = set()
        self.revealed_positions: Set[int] = set()
        self.game_over = False
        self.game_won = False
        self.multiplier = Decimal("1.0")
    
    def start_game(self, seed: int = None) -> dict:
        """Start a new game and place mines randomly"""
        if seed:
            random.seed(seed)
        
        # Reset game state
        self.revealed_positions = set()
        self.game_over = False
        self.game_won = False
        self.multiplier = Decimal("1.0")
        
        # Place mines randomly
        self.mine_positions = set(random.sample(range(self.grid_size), self.num_mines))
        
        return {
            "grid_size": self.grid_size,
            "num_mines": self.num_mines,
            "revealed": list(self.revealed_positions),
            "game_over": self.game_over,
            "multiplier": float(self.multiplier)
        }
    
    def calculate_multiplier(self) -> Decimal:
        """Calculate current multiplier based on revealed tiles"""
        num_revealed = len(self.revealed_positions)
        if num_revealed == 0:
            return Decimal("1.0")
        
        # Calculate based on probability
        # Each safe tile revealed increases multiplier
        safe_tiles_remaining = self.grid_size - self.num_mines - num_revealed
        total_tiles_remaining = self.grid_size - num_revealed
        
        if total_tiles_remaining <= 0:
            return Decimal("1.0")
        
        # House edge: 2%
        house_edge = Decimal("0.98")
        
        # Multiplier increases with each safe reveal
        base_multiplier = Decimal(str(self.grid_size - self.num_mines)) / Decimal(str(self.grid_size))
        
        multiplier = Decimal("1.0")
        for i in range(num_revealed):
            tiles_left = self.grid_size - i
            safe_left = self.grid_size - self.num_mines - i
            if safe_left > 0 and tiles_left > 0:
                multiplier *= (Decimal(str(tiles_left)) / Decimal(str(safe_left))) * house_edge
        
        return multiplier.quantize(Decimal("0.01"))
    
    def reveal_tile(self, position: int) -> dict:
        """
        Reveal a tile
        
        Returns game state with updated information
        """
        if self.game_over:
            raise Exception("Game is already over")
        
        if position < 0 or position >= self.grid_size:
            raise Exception("Invalid position")
        
        if position in self.revealed_positions:
            raise Exception("Tile already revealed")
        
        # Reveal the tile
        self.revealed_positions.add(position)
        
        # Check if it's a mine
        if position in self.mine_positions:
            self.game_over = True
            self.game_won = False
            self.multiplier = Decimal("0")
            
            return {
                "position": position,
                "is_mine": True,
                "revealed": list(self.revealed_positions),
                "mine_positions": list(self.mine_positions),
                "game_over": True,
                "game_won": False,
                "multiplier": float(self.multiplier)
            }
        
        # Safe tile - update multiplier
        self.multiplier = self.calculate_multiplier()
        
        # Check if all safe tiles are revealed
        if len(self.revealed_positions) == self.grid_size - self.num_mines:
            self.game_over = True
            self.game_won = True
        
        return {
            "position": position,
            "is_mine": False,
            "revealed": list(self.revealed_positions),
            "game_over": self.game_over,
            "game_won": self.game_won,
            "multiplier": float(self.multiplier)
        }
    
    def cash_out(self) -> dict:
        """Cash out current game"""
        if self.game_over:
            raise Exception("Game is already over")
        
        if len(self.revealed_positions) == 0:
            raise Exception("No tiles revealed yet")
        
        self.game_over = True
        self.game_won = True
        
        return {
            "revealed": list(self.revealed_positions),
            "mine_positions": list(self.mine_positions),
            "game_over": True,
            "game_won": True,
            "multiplier": float(self.multiplier)
        }
    
    def calculate_payout(self, bet_amount: Decimal) -> Decimal:
        """Calculate payout based on current multiplier"""
        if not self.game_won:
            return Decimal("0")
        
        return bet_amount * self.multiplier
    
    def get_game_state(self, hide_mines: bool = True) -> dict:
        """Get current game state"""
        state = {
            "grid_size": self.grid_size,
            "num_mines": self.num_mines,
            "revealed": list(self.revealed_positions),
            "game_over": self.game_over,
            "game_won": self.game_won,
            "multiplier": float(self.multiplier)
        }
        
        if not hide_mines or self.game_over:
            state["mine_positions"] = list(self.mine_positions)
        
        return state