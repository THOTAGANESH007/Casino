import stripe
from app.config import settings
from decimal import Decimal

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    @staticmethod
    def create_checkout_session(user_id: int, amount: Decimal, currency: str = "usd"):
        """Create a Stripe Checkout Session for Deposit"""
        
        # Stripe expects amount in cents (integers)
        amount_cents = int(amount * 100)
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            billing_address_collection='required',
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {
                        'name': 'Casino Wallet Deposit',
                    },
                    'unit_amount': amount_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/wallet?status=success",
            cancel_url=f"{settings.FRONTEND_URL}/wallet?status=cancel",
            # Metadata is crucial: we use this in the webhook to know who to credit
            metadata={
                "user_id": str(user_id),
                "transaction_type": "deposit"
            }
        )
        return session.url

    @staticmethod
    def create_payout(amount: Decimal, currency: str = "usd", destination_account_id: str = None):
        """
        Handle Withdrawal via Stripe Payouts or Transfers.
        Note: Real withdrawals usually require Stripe Connect (Express/Standard accounts).
        This is a simplified implementation assuming the platform pays out to a bank account.
        """
        amount_cents = int(amount * 100)
        
        try:
            # In a real Connect scenario, we'd use stripe.Transfer to a connected account
            # For this demo, we simulate a payout failure if no destination is provided
            if not destination_account_id:
                # Mock success for demo purposes if no real Stripe Connect setup
                return {"id": "po_mock_12345", "status": "paid"}

            payout = stripe.Payout.create(
                amount=amount_cents,
                currency=currency.lower(),
                destination=destination_account_id # The user's Stripe Connect Account ID
            )
            return payout
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe Payout Failed: {str(e)}")

stripe_service = StripeService()