from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.wallet import WalletType
from ..schemas.wallet import WalletResponse, WalletDeposit, WalletWithdraw
from ..utils.dependencies import get_current_active_user
from ..services.wallet_service import wallet_service
from ..config import settings
from ..services.stripe_service import stripe_service
import stripe

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

# @router.post("/deposit", response_model=WalletResponse)
# async def deposit_to_wallet(
#     deposit_data: WalletDeposit,
#     current_user: User = Depends(get_current_active_user),
#     db: Session = Depends(get_db)
# ):
#     """Deposit money to cash wallet"""
    
#     # Get cash wallet
#     wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
#     if not wallet:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Cash wallet not found"
#         )
    
#     # Credit wallet
#     updated_wallet = wallet_service.credit_wallet(
#         db,
#         wallet.wallet_id,
#         deposit_data.amount
#     )
    
#     return updated_wallet

# @router.post("/withdraw", response_model=WalletResponse)
# async def withdraw_from_wallet(
#     withdraw_data: WalletWithdraw,
#     current_user: User = Depends(get_current_active_user),
#     db: Session = Depends(get_db)
# ):
#     """Withdraw money from cash wallet"""
    
#     # Get cash wallet
#     wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
#     if not wallet:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Cash wallet not found"
#         )
    
#     # Debit wallet
#     updated_wallet = wallet_service.debit_wallet(
#         db,
#         wallet.wallet_id,
#         withdraw_data.amount
#     )
    
#     return updated_wallet


# 1. Initiate Deposit
@router.post("/deposit/stripe")
async def create_deposit_session(
    deposit_data: WalletDeposit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate Stripe Checkout Link"""
    if deposit_data.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum deposit is 1.00")
    
    currency = current_user.tenant.default_currency

    try:
        checkout_url = stripe_service.create_checkout_session(
            user_id=current_user.user_id,
            amount=deposit_data.amount,
            currency=currency
        )
        return {"checkout_url": checkout_url}
    except Exception as e:
        print(f"STRIPE ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# 2. Stripe Webhook
@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """Listen for successful payments from Stripe"""
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        metadata = session.get('metadata', {})
        
        # Verify it's our deposit
        if metadata.get('transaction_type') == 'deposit':
            user_id = int(metadata.get('user_id'))
            # Amount comes in cents, convert back to decimal
            amount_paid = Decimal(session['amount_total']) / 100
            
            # Find User's Cash Wallet
            wallet = wallet_service.get_wallet(db, user_id, WalletType.cash)
            if wallet:
                # Credit the wallet atomically
                wallet_service.credit_wallet(db, wallet.wallet_id, amount_paid)
            else:
                print(f"❌ Wallet not found for User {user_id}")

    return {"status": "success"}

# 3. Withdraw via Stripe
@router.post("/withdraw/stripe")
async def withdraw_funds(
    withdraw_data: WalletWithdraw,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Withdraw funds from wallet via Stripe"""
    
    # 1.1 Get Wallet
    wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
    if not wallet or wallet.balance < withdraw_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    # 1.2 Fetch tax rate from the user's region
    tax_rate = wallet_service.get_user_tax_rate(db, current_user.user_id)
    
    # 1.3 Calculate tax
    tax_to_deduct = (withdraw_data.amount * (tax_rate / Decimal("100"))).quantize(Decimal("0.01")) # round to 2 decimal places
    amount_after_tax = withdraw_data.amount - tax_to_deduct
    
    # currency of the tenant
    currency = current_user.tenant.default_currency
    
    # 2. Debit Wallet FIRST (Internal ledger update)
    try:
        wallet_service.debit_wallet(db, wallet.wallet_id, withdraw_data.amount)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Trigger Stripe Payout
    try:
        # In a real app, we'd retrieve the user's stripe_connect_id from the DB
        # For now, we mock the ID or leave it None to trigger the mock logic in service
        stripe_service.create_payout(amount_after_tax, currency, destination_account_id=None)
        
        return {
            "wallet_id": wallet.wallet_id,
            "balance": wallet.balance, # Updated balance
            "message": "Withdrawal processed successfully",
            "status": "success",
            "tax_withheld": tax_to_deduct,
            "sent_to_user": amount_after_tax
        }
    except Exception as e:
        # Rollback money if Stripe fails
        wallet_service.credit_wallet(db, wallet.wallet_id, withdraw_data.amount)
        raise HTTPException(status_code=500, detail=f"Payout failed: {str(e)}")


@router.post("/withdraw/simulate")
async def simulate_withdrawal(
    withdraw_data: WalletWithdraw,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Calculates tax and net payout without executing transaction"""
    
    # 1. Get the user tax rate
    tax_rate = wallet_service.get_user_tax_rate(db, current_user.user_id)
    
    # 2. Perform Math
    tax_amount = (withdraw_data.amount * (tax_rate / Decimal("100"))).quantize(Decimal("0.01"))
    net_payout = withdraw_data.amount - tax_amount
    
    # 3. Return Data
    return {
        "requested_amount": withdraw_data.amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "net_payout": net_payout,
        "currency": current_user.tenant.default_currency or "USD"
    }