from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.wallet import WalletType
from ..schemas.wallet import WalletResponse, WalletDeposit, WalletWithdraw
from ..utils.dependencies import get_current_active_user
from ..services.wallet_service import wallet_service

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/", response_model=List[WalletResponse])
async def get_user_wallets(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all wallets for the current user"""
    wallets = wallet_service.get_all_wallets(db, current_user.user_id)
    return wallets

@router.get("/{wallet_type}", response_model=WalletResponse)
async def get_wallet_by_type(
    wallet_type: WalletType,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific wallet by type"""
    wallet = wallet_service.get_wallet(db, current_user.user_id, wallet_type)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{wallet_type.value} wallet not found"
        )
    return wallet

@router.post("/deposit", response_model=WalletResponse)
async def deposit_to_wallet(
    deposit_data: WalletDeposit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deposit money to cash wallet"""
    
    # Get cash wallet
    wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cash wallet not found"
        )
    
    # Credit wallet
    updated_wallet = wallet_service.credit_wallet(
        db,
        wallet.wallet_id,
        deposit_data.amount
    )
    
    return updated_wallet

@router.post("/withdraw", response_model=WalletResponse)
async def withdraw_from_wallet(
    withdraw_data: WalletWithdraw,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Withdraw money from cash wallet"""
    
    # Get cash wallet
    wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cash wallet not found"
        )
    
    # Debit wallet
    updated_wallet = wallet_service.debit_wallet(
        db,
        wallet.wallet_id,
        withdraw_data.amount
    )
    
    return updated_wallet