from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, Optional, List
from fastapi import HTTPException, status
from ..models.game import Bet, Game
from ..models.user import User
from ..models.wallet import Wallet, WalletType
from .limit_service import limit_service
from .jackpot_service import jackpot_service

class WalletService:
    """Server-authoritative wallet service with multi-tenant support"""
    
    @staticmethod
    def get_user_tax_rate(db: Session, user_id: int) -> Decimal:
        """Fetch tax rate from the user's assigned region"""
        user = db.query(User).filter(User.user_id == user_id).first()
        if user and user.region:
            return Decimal(str(user.region.tax_rate))
        return Decimal("0")
    
    @staticmethod
    def create_wallets_for_user(db: Session, user_id: int, tenant_id: int) -> List[Wallet]:
        """Create separate wallet types for a user under a specific tenant"""
        wallet_types = [WalletType.cash, WalletType.bonus, WalletType.points]
        wallets = []
        
        for wallet_type in wallet_types:
            # Check if this specific wallet already exists for this tenant
            existing = db.query(Wallet).filter_by(
                user_id=user_id, 
                tenant_id=tenant_id, 
                type_of_wallet=wallet_type
            ).first()
            
            if not existing:
                initial_balance = Decimal("200.00") if wallet_type == WalletType.bonus else Decimal("0.00")
                wallet = Wallet(
                    user_id=user_id,
                    tenant_id=tenant_id, # Link to specific casino
                    balance=initial_balance,
                    type_of_wallet=wallet_type
                )
                db.add(wallet)
                wallets.append(wallet)
        
        db.commit()
        return wallets
    
    @staticmethod
    def get_wallet(
        db: Session,
        user_id: int,
        tenant_id: int, # Filter by current casino
        type_of_wallet: WalletType = WalletType.cash
    ) -> Optional[Wallet]:
        """Get a specific wallet for a user within a specific tenant"""
        return db.query(Wallet).filter(
            Wallet.user_id == user_id,
            Wallet.tenant_id == tenant_id,
            Wallet.type_of_wallet == type_of_wallet
        ).first()
    
    @staticmethod
    def get_all_wallets(db: Session, user_id: int, tenant_id: int) -> List[Wallet]:
        """Get all wallets for a user in the active casino"""
        return db.query(Wallet).filter(
            Wallet.user_id == user_id,
            Wallet.tenant_id == tenant_id
        ).all()
    
    @staticmethod
    def credit_wallet(db: Session, wallet_id: int, amount: Decimal, commit: bool = True) -> Wallet:
        """Credit amount to wallet (atomic)"""
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        wallet = db.query(Wallet).filter(Wallet.wallet_id == wallet_id).with_for_update().first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        wallet.balance += amount
        if commit:
            db.commit()
            db.refresh(wallet)
        return wallet
    
    @staticmethod
    def debit_wallet(db: Session, wallet_id: int, amount: Decimal, commit: bool = True) -> Wallet:
        """Debit amount from wallet (atomic with limit and balance check)"""
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        wallet = db.query(Wallet).filter(Wallet.wallet_id == wallet_id).with_for_update().first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        # Check Responsible Gaming Limits
        if wallet.type_of_wallet == WalletType.cash:
            limit_service.check_bet_limits(db, wallet.user_id, amount)

        if wallet.balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        wallet.balance -= amount
        if commit:
            db.commit()
            db.refresh(wallet)
        return wallet

    @staticmethod
    def credit_winnings(db: Session, user_id: int, amount: Decimal, game_id: int, tenant_id: int, bet_id: int = None):
        """Apply RTP and credit net payout to the user's specific tenant cash wallet"""
        game = db.query(Game).filter(Game.game_id == game_id).first()
        rtp_multiplier = (game.rtp_percent / Decimal("100")) if game else Decimal("1")
        net_payout = (amount * rtp_multiplier).quantize(Decimal("0.01"))

        if bet_id:
            bet = db.query(Bet).filter(Bet.bet_id == bet_id).first()
            if bet:
                bet.payout_amount = net_payout
                
        # Find the specific cash wallet for THIS tenant
        wallet = db.query(Wallet).filter(
            Wallet.user_id == user_id, 
            Wallet.tenant_id == tenant_id,
            Wallet.type_of_wallet == WalletType.cash
        ).with_for_update().first()
        
        if wallet:
            wallet.balance += net_payout
            db.commit()
            db.refresh(wallet)
        return wallet

    @staticmethod
    def process_game_bet(db: Session, user_id: int, tenant_id: int, total_bet: Decimal) -> Dict:
        """
        HYBRID BETTING LOGIC (Tenant-Specific):
        1. Checks limits.
        2. Deducts up to 20% from Bonus/Points of the CURRENT tenant.
        3. Remainder from Cash of the CURRENT tenant.
        """
        if total_bet <= 0:
            raise HTTPException(status_code=400, detail="Bet amount must be positive")
        
        limit_service.check_bet_limits(db, user_id, total_bet)

        # Fetch wallets ONLY for the active tenant
        wallets = db.query(Wallet).filter(Wallet.user_id == user_id, Wallet.tenant_id == tenant_id).all()
        cash_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.cash), None)
        bonus_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.bonus), None)
        points_wallet = next((w for w in wallets if w.type_of_wallet == WalletType.points), None)

        if not cash_wallet:
            raise HTTPException(status_code=404, detail="Cash wallet for this casino not found")

        max_promo_allowance = total_bet * Decimal("0.20")
        deducted_bonus = Decimal("0")
        deducted_points = Decimal("0")
        
        if bonus_wallet and bonus_wallet.balance > 0:
            deducted_bonus = min(bonus_wallet.balance, max_promo_allowance)
        
        remaining_promo_allowance = max_promo_allowance - deducted_bonus
        if points_wallet and points_wallet.balance >= 10 and remaining_promo_allowance > 0:
            # 10 Points = $1
            deducted_points = min(points_wallet.balance // 10, remaining_promo_allowance)

        required_cash = total_bet - (deducted_bonus + deducted_points)

        if cash_wallet.balance < required_cash:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient cash in this casino. Need ${required_cash} (Promos cover ${deducted_bonus + deducted_points})"
            )

        # Execution
        cash_wallet.balance -= required_cash
        if bonus_wallet:
            bonus_wallet.balance -= deducted_bonus
        if points_wallet:
            points_wallet.balance -= (deducted_points * 10)
        
        # Jackpot Logic (Real cash used in current tenant)
        jackpot_result = jackpot_service.process_spin(db, user_id, tenant_id, required_cash)
        
        # Loyalty Points (Earned in current tenant)
        points_earned = total_bet * Decimal("0.10")
        if points_wallet:
            points_wallet.balance += points_earned

        db.commit()
        
        return {
            "primary_wallet_id": cash_wallet.wallet_id,
            "deducted_cash": required_cash,
            "deducted_bonus": deducted_bonus,
            "deducted_points": deducted_points * 10,
            "points_earned": points_earned,
            "jackpot_result": jackpot_result
        }

wallet_service = WalletService()