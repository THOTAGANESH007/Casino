from sqlalchemy.orm import Session
from sqlalchemy import select
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from app.models.wallet import Wallet, WalletType
from app.models.user import User

class WalletService:
    """Server-authoritative wallet service with atomic transactions"""
    
    @staticmethod
    def create_wallets_for_user(db: Session, user_id: int) -> list[Wallet]:
        """Create all wallet types for a new user"""
        wallet_types = [WalletType.cash, WalletType.bonus, WalletType.points]
        wallets = []
        
        for wallet_type in wallet_types:
            wallet = Wallet(
                user_id=user_id,
                balance=Decimal("0.00"),
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

wallet_service = WalletService()