import random
from decimal import Decimal
from sqlalchemy.orm import Session
from ..models.jackpot import Jackpot, JackpotWin
from ..models.wallet import Wallet, WalletType

class JackpotService:
    
    @staticmethod
    def process_spin(db: Session, user_id: int, tenant_id: int, bet_amount: Decimal):
        """
        Process jackpot contribution and check for win.
        Condition: Only bets > 100 contribute and trigger a roll.
        """
        # --- CONDITION CHECK ---
        if bet_amount <= 100:
            return {"won": False, "amount": Decimal(0), "name": ""}
        # -----------------------

        # 1. Fetch active jackpots for this tenant
        jackpots = db.query(Jackpot).filter(
            Jackpot.tenant_id == tenant_id,
            Jackpot.is_active == True
        ).with_for_update().all() # Lock row for atomicity
        
        win_result = {"won": False, "amount": Decimal(0), "name": ""}
        
        for jackpot in jackpots:
            # 2. Contribute to Pool
            contribution = bet_amount * jackpot.contribution_percent
            jackpot.current_amount += contribution
            
            # 3. Check for Win (RNG)
            if random.random() < float(jackpot.win_probability):
                # WINNER!
                win_amount = jackpot.current_amount
                
                # a. Log Win
                win_record = JackpotWin(
                    jackpot_id=jackpot.id,
                    user_id=user_id,
                    amount_won=win_amount
                )
                db.add(win_record)
                
                # b. Credit User Cash Wallet
                wallet = db.query(Wallet).filter(
                    Wallet.user_id == user_id,
                    Wallet.type_of_wallet == WalletType.cash
                ).first()
                
                if wallet:
                    wallet.balance += win_amount
                
                # c. Reset Jackpot
                jackpot.current_amount = jackpot.start_amount
                
                # d. Set Result
                win_result = {
                    "won": True, 
                    "amount": win_amount, 
                    "name": jackpot.name
                }
                break # Only one jackpot win per spin allowed
        
        # Note: We don't commit here; the calling WalletService commits the transaction
        return win_result

    @staticmethod
    def get_jackpots(db: Session, tenant_id: int):
        return db.query(Jackpot).filter(
            Jackpot.tenant_id == tenant_id, 
            Jackpot.is_active == True
        ).all()

jackpot_service = JackpotService()