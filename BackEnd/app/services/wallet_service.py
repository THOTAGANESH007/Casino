from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, Optional
from fastapi import HTTPException, status
from ..models.wallet import Wallet, WalletType
from .limit_service import limit_service
class WalletService:
    """Server-authoritative wallet service with atomic transactions"""
    
    @staticmethod
    def create_wallets_for_user(db: Session, user_id: int) -> list[Wallet]:
        """Create all wallet types for a new user"""
        wallet_types = [WalletType.cash, WalletType.bonus, WalletType.points]
        wallets = []
        
        for wallet_type in wallet_types:
            initial_balance = Decimal("200.00") if wallet_type == WalletType.bonus else Decimal("0.00")
            wallet = Wallet(
                user_id=user_id,
                balance=initial_balance,
                type_of_wallet=wallet_type
            )
            db.add(wallet)
            wallets.append(wallet)
        
        db.commit()
        for wallet in wallets:
            db.refresh(wallet)
        print("Wallets created for user_id:", user_id)
        # return wallets
    
    @staticmethod
    def get_wallet(
        db: Session,
        user_id: int,
        type_of_wallet: WalletType = WalletType.cash
    ) -> Optional[Wallet]:
        """Get a specific wallet for a user"""
        return db.query(Wallet).filter(
            Wallet.user_id == user_id,
            Wallet.type_of_wallet == type_of_wallet
        ).first()
    
    @staticmethod
    def get_all_wallets(db: Session, user_id: int) -> list[Wallet]:
        """Get all wallets for a user"""
        return db.query(Wallet).filter(Wallet.user_id == user_id).all()
    
    @staticmethod
    def credit_wallet(
        db: Session,
        wallet_id: int,
        amount: Decimal,
        commit: bool = True
    ) -> Wallet:
        """Credit amount to wallet (atomic)"""
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be positive"
            )
        
        # Lock the row for update
        wallet = db.query(Wallet).filter(
            Wallet.wallet_id == wallet_id
        ).with_for_update().first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        wallet.balance += amount
        
        if commit:
            db.commit()
            db.refresh(wallet)
        
        return wallet
    
    @staticmethod
    def debit_wallet(
        db: Session,
        wallet_id: int,
        amount: Decimal,
        commit: bool = True
    ) -> Wallet:
        """Debit amount from wallet (atomic with balance check)"""
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be positive"
            )
        
        # Lock the row for update
        wallet = db.query(Wallet).filter(
            Wallet.wallet_id == wallet_id
        ).with_for_update().first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        if wallet.type_of_wallet == WalletType.cash:
            limit_service.check_bet_limits(db, wallet.user_id, amount)

        if wallet.balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        wallet.balance -= amount
        
        if commit:
            db.commit()
            db.refresh(wallet)
        
        return wallet
    
    @staticmethod
    def transfer_between_wallets(
        db: Session,
        from_wallet_id: int,
        to_wallet_id: int,
        amount: Decimal
    ) -> tuple[Wallet, Wallet]:
        """Transfer amount between wallets (atomic transaction)"""
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be positive"
            )
        
        try:
            # Debit from source (this locks the row)
            from_wallet = WalletService.debit_wallet(db, from_wallet_id, amount, commit=False)
            
            # Credit to destination (this locks the row)
            to_wallet = WalletService.credit_wallet(db, to_wallet_id, amount, commit=False)
            
            # Commit both operations atomically
            db.commit()
            db.refresh(from_wallet)
            db.refresh(to_wallet)
            
            return from_wallet, to_wallet
        
        except Exception as e:
            db.rollback()
            raise e
    
    @staticmethod
    def get_balance(db: Session, wallet_id: int) -> Decimal:
        """Get current balance"""
        wallet = db.query(Wallet).filter(Wallet.wallet_id == wallet_id).first()
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        return wallet.balance


    @staticmethod
    def credit_winnings(db: Session, user_id: int, amount: Decimal):
        """
        Credit Winnings.
        Rule: Winnings usually go to Cash wallet.
        """
        wallet = db.query(Wallet).filter(
            Wallet.user_id == user_id, 
            Wallet.type_of_wallet == WalletType.cash
        ).with_for_update().first()
        
        if wallet:
            wallet.balance += amount
            db.commit()
            db.refresh(wallet)
        return wallet

    @staticmethod
    def process_game_bet(db: Session, user_id: int, total_bet: Decimal) -> Dict:
        """
        HYBRID BETTING LOGIC:
        1. Max 20% can come from Bonus + Points.
        2. Remainder must come from Cash.
        3. Earn Points (e.g., 1% of bet amount).
        """
        if total_bet <= 0:
            raise HTTPException(status_code=400, detail="Bet amount must be positive")

        # 1. Fetch all wallets
        wallets = db.query(Wallet).filter(Wallet.user_id == user_id).all()
        cash_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.cash), None)
        bonus_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.bonus), None)
        points_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.points), None)

        if not cash_wallet:
            raise HTTPException(status_code=404, detail="Cash wallet not found")

        # 2. Calculate Split
        # Max promo allowed is 20%
        max_promo_allowance = total_bet * Decimal("0.20")
        
        deducted_bonus = Decimal("0")
        deducted_points = Decimal("0")
        
        # Priority: Use Bonus first, then Points
        if bonus_wallet and bonus_wallet.balance > 0:
            deducted_bonus = min(bonus_wallet.balance, max_promo_allowance)
        
        remaining_promo_allowance = max_promo_allowance - deducted_bonus
        
        if points_wallet and points_wallet.balance > 0 and remaining_promo_allowance > 0:
            # Assuming 1 Point = $1 for betting purposes
            deducted_points = min(points_wallet.balance, remaining_promo_allowance)

        # The rest must come from Cash
        required_cash = total_bet - (deducted_bonus + deducted_points)

        # 3. Check Cash Balance
        if cash_wallet.balance < required_cash:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient cash. Need ${required_cash} in cash wallet (Promos cover ${deducted_bonus + deducted_points})"
            )

        # 4. Execute Deductions (Updates objects in session)
        cash_wallet.balance -= required_cash
        if bonus_wallet:
            bonus_wallet.balance -= deducted_bonus
        if points_wallet:
            points_wallet.balance -= deducted_points

        # 5. Award New Points (Loyalty Program)
        # Rule: Earn 1 Point for every $10 bet (10% ratio) or 1% ratio. Let's do 10%.
        points_earned = total_bet * Decimal("0.10")
        if points_wallet:
            points_wallet.balance += points_earned

        # 6. Commit Transaction
        db.commit()
        
        # Return Cash Wallet ID for foreign key in Bet table, and details
        return {
            "primary_wallet_id": cash_wallet.wallet_id,
            "deducted_cash": required_cash,
            "deducted_bonus": deducted_bonus,
            "deducted_points": deducted_points,
            "points_earned": points_earned
        }

wallet_service = WalletService()
