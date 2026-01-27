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