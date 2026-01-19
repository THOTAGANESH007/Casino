import random
from typing import List, Tuple
from decimal import Decimal

class Card:
    def __init__(self, suit: str, rank: str):
        self.suit = suit
        self.rank = rank
    
    def value(self) -> int:
        """Get card value for blackjack"""
        if self.rank in ['J', 'Q', 'K']:
            return 10
        elif self.rank == 'A':
            return 11  # Ace can be 1 or 11
        else:
            return int(self.rank)
    
    def __repr__(self):
        return f"{self.rank}{self.suit}"

class BlackjackEngine:
    """Server-authoritative Blackjack engine"""
    
    SUITS = ['♠', '♥', '♦', '♣']
    RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    
    def __init__(self, seed: int = None):
        if seed:
            random.seed(seed)
        self.deck: List[Card] = []
        self.player_hand: List[Card] = []
        self.dealer_hand: List[Card] = []
        self.game_over = False
        self.result = None
    
    def create_deck(self, num_decks: int = 6) -> List[Card]:
        """Create a shuffled deck"""
        deck = []
        for _ in range(num_decks):
            for suit in self.SUITS:
                for rank in self.RANKS:
                    deck.append(Card(suit, rank))
        random.shuffle(deck)
        return deck
    
    def calculate_hand_value(self, hand: List[Card]) -> int:
        """Calculate the value of a hand, handling aces"""
        value = sum(card.value() for card in hand)
        num_aces = sum(1 for card in hand if card.rank == 'A')
        
        # Adjust for aces
        while value > 21 and num_aces > 0:
            value -= 10
            num_aces -= 1
        
        return value
    
    def start_game(self) -> dict:
        """Start a new blackjack game"""
        self.deck = self.create_deck()
        self.player_hand = []
        self.dealer_hand = []
        self.game_over = False
        self.result = None
        
        # Deal initial cards
        self.player_hand.append(self.deck.pop())
        self.dealer_hand.append(self.deck.pop())
        self.player_hand.append(self.deck.pop())
        self.dealer_hand.append(self.deck.pop())
        
        player_value = self.calculate_hand_value(self.player_hand)
        
        # Check for natural blackjack
        if player_value == 21:
            self.game_over = True
            dealer_value = self.calculate_hand_value(self.dealer_hand)
            if dealer_value == 21:
                self.result = "push"
            else:
                self.result = "blackjack"
        
        return self.get_game_state(hide_dealer_card=True)
    
    def hit(self) -> dict:
        """Player hits"""
        if self.game_over:
            raise Exception("Game is already over")
        
        self.player_hand.append(self.deck.pop())
        player_value = self.calculate_hand_value(self.player_hand)
        
        if player_value > 21:
            self.game_over = True
            self.result = "bust"
        
        return self.get_game_state(hide_dealer_card=not self.game_over)
    
    def stand(self) -> dict:
        """Player stands, dealer plays"""
        if self.game_over:
            raise Exception("Game is already over")
        
        # Dealer plays (hits until 17 or higher)
        dealer_value = self.calculate_hand_value(self.dealer_hand)
        while dealer_value < 17:
            self.dealer_hand.append(self.deck.pop())
            dealer_value = self.calculate_hand_value(self.dealer_hand)
        
        player_value = self.calculate_hand_value(self.player_hand)
        
        # Determine winner
        if dealer_value > 21:
            self.result = "win"
        elif player_value > dealer_value:
            self.result = "win"
        elif player_value < dealer_value:
            self.result = "lose"
        else:
            self.result = "push"
        
        self.game_over = True
        return self.get_game_state(hide_dealer_card=False)
    
    def double_down(self) -> dict:
        """Player doubles down"""
        if self.game_over or len(self.player_hand) != 2:
            raise Exception("Cannot double down")
        
        # Hit once
        self.player_hand.append(self.deck.pop())
        player_value = self.calculate_hand_value(self.player_hand)
        
        if player_value > 21:
            self.game_over = True
            self.result = "bust"
            return self.get_game_state(hide_dealer_card=False)
        
        # Auto-stand
        return self.stand()
    
    def get_game_state(self, hide_dealer_card: bool = False) -> dict:
        """Get current game state"""
        dealer_hand_display = self.dealer_hand.copy()
        if hide_dealer_card and len(dealer_hand_display) > 1:
            dealer_hand_display = [dealer_hand_display[0]]
        
        return {
            "player_hand": [str(card) for card in self.player_hand],
            "player_value": self.calculate_hand_value(self.player_hand),
            "dealer_hand": [str(card) for card in dealer_hand_display],
            "dealer_value": self.calculate_hand_value(dealer_hand_display) if not hide_dealer_card else None,
            "game_over": self.game_over,
            "result": self.result
        }
    
    def calculate_payout(self, bet_amount: Decimal) -> Decimal:
        """Calculate payout based on result"""
        if self.result == "blackjack":
            return bet_amount * Decimal("2.5")  # 3:2 payout
        elif self.result == "win":
            return bet_amount * Decimal("2")  # 1:1 payout
        elif self.result == "push":
            return bet_amount  # Return original bet
        else:  # bust or lose
            return Decimal("0")