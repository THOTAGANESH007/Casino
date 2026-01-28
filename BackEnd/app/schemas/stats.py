from pydantic import BaseModel
from typing import List
from decimal import Decimal

class GameStat(BaseModel):
    game_name: str
    play_count: int

class DailyRevenue(BaseModel):
    date: str
    revenue: Decimal

class TopUser(BaseModel):
    email: str
    name:str
    total_wagered: Decimal

class TenantDashboardResponse(BaseModel):
    ngr: Decimal
    avg_ltv: Decimal
    active_users_24h: int
    active_users_30d: int
    top_5_users_weekly: List[TopUser]
    game_popularity: List[GameStat]
    revenue_7d: List[DailyRevenue]
    
class TenantLeaderboardItem(BaseModel):
    tenant_name: str
    user_count: int
    total_turnover: Decimal
    revenue_contribution: Decimal

class GlobalGameStat(BaseModel):
    game_name: str
    total_revenue: Decimal
    play_count: int

class OwnerDashboardResponse(BaseModel):
    global_turnover: Decimal
    global_net_revenue: Decimal
    active_tenants_count: int
    global_active_users_24h: int
    system_liquidity: Decimal  # Total cash in all player wallets
    tenant_leaderboard: List[TenantLeaderboardItem]
    top_performing_games: List[GlobalGameStat]