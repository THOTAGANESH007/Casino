from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from ..models.user import ResponsibleLimit
from ..models.game import Bet, BetStatus, GameRound, GameSession

class LimitService:
    
    @staticmethod
    def get_user_limits(db: Session, user_id: int):
        return db.query(ResponsibleLimit).filter(ResponsibleLimit.user_id == user_id).first()

    @staticmethod
    def check_bet_limits(db: Session, user_id: int, bet_amount: Decimal):
        """
        Checks if placing a bet violates any set limits.
        Raises HTTPException if limit is exceeded.
        """
        limits = LimitService.get_user_limits(db, user_id)
        if not limits:
            return # No limits set

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # 1. Check Daily Bet Limit (Total Wagered Today)
        if limits.daily_bet_limit and limits.daily_bet_limit > 0:
            daily_wagered = db.query(func.sum(Bet.bet_amount)).join(GameRound).join(GameSession).filter(
                GameSession.user_id == user_id,
                Bet.bet_status != BetStatus.cancelled,
                GameSession.started_at >= today_start
            ).scalar() or Decimal(0)

            if (daily_wagered + bet_amount) > limits.daily_bet_limit:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Daily bet limit of {limits.daily_bet_limit} reached. Current: {daily_wagered}"
                )

        # 2. Check Monthly Bet Limit
        if limits.monthly_bet_limit and limits.monthly_bet_limit > 0:
            monthly_wagered = db.query(func.sum(Bet.bet_amount)).join(GameRound).join(GameSession).filter(
                GameSession.user_id == user_id,
                Bet.bet_status != BetStatus.cancelled,
                GameSession.started_at >= month_start
            ).scalar() or Decimal(0)

            if (monthly_wagered + bet_amount) > limits.monthly_bet_limit:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Monthly bet limit of {limits.monthly_bet_limit} reached."
                )

        # 3. Check Daily Loss Limit (Net Loss Today)
        # Loss Limit usually means: Stop if (TotalBets - TotalWins) > Limit
        if limits.daily_loss_limit and limits.daily_loss_limit > 0:
            # Get stats for today
            stats = db.query(
                func.sum(Bet.bet_amount).label("total_bet"),
                func.sum(Bet.payout_amount).label("total_payout")
            ).join(GameRound).join(GameSession).filter(
                GameSession.user_id == user_id,
                Bet.bet_status != BetStatus.cancelled,
                GameSession.started_at >= today_start
            ).first()

            total_bet = (stats.total_bet or Decimal(0))
            total_payout = (stats.total_payout or Decimal(0))
            
            # Current Net Loss (Positive number means player lost money)
            current_net_loss = total_bet - total_payout
            
            # If we place this bet, assuming we lose it immediately (worst case for limit check)
            # or simply checking if we are ALREADY past the limit to stop further play.
            # Usually, loss limits stop you from opening new positions if you are down X amount.
            
            if current_net_loss >= limits.daily_loss_limit:
                 raise HTTPException(
                    status_code=400, 
                    detail=f"Daily loss limit of {limits.daily_loss_limit} reached."
                )

    @staticmethod
    def get_usage_stats(db: Session, user_id: int):
        """Helper to get current usage for UI"""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        daily_stats = db.query(
            func.sum(Bet.bet_amount).label("total_bet"),
            func.sum(Bet.payout_amount).label("total_payout")
        ).join(GameRound).join(GameSession).filter(
            GameSession.user_id == user_id,
            Bet.bet_status != BetStatus.cancelled,
            GameSession.started_at >= today_start
        ).first()

        monthly_wager = db.query(func.sum(Bet.bet_amount)).join(GameRound).join(GameSession).filter(
            GameSession.user_id == user_id,
            Bet.bet_status != BetStatus.cancelled,
            GameSession.started_at >= month_start
        ).scalar() or Decimal(0)

        daily_bet = daily_stats.total_bet or Decimal(0)
        daily_payout = daily_stats.total_payout or Decimal(0)
        daily_loss = daily_bet - daily_payout # Net loss

        return {
            "current_daily_bet": daily_bet,
            "current_daily_loss": daily_loss,
            "current_monthly_bet": monthly_wager
        }

limit_service = LimitService()