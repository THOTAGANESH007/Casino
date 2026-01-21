from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.game import TenantGame, ProviderGame, Game, GameProvider
from ..schemas.game import PlayerGameResponse
from ..utils.dependencies import require_tenant

router = APIRouter(prefix="/lobby", tags=["Player Lobby"])

@router.get("/games", response_model=List[PlayerGameResponse])
async def get_my_tenant_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant)
):
    """Fetch only games enabled by the tenant admin"""
    
    # Join TenantGame -> ProviderGame -> Game & Provider
    active_games = db.query(TenantGame)\
        .join(ProviderGame, TenantGame.provider_game_id == ProviderGame.id)\
        .join(Game, ProviderGame.game_id == Game.game_id)\
        .join(GameProvider, ProviderGame.provider_id == GameProvider.provider_id)\
        .filter(
            TenantGame.tenant_id == current_user.tenant_id,
            TenantGame.is_active == True,
            GameProvider.is_active == True
        ).all()
        
    result = []
    for tg in active_games:
        pg = tg.provider_game
        result.append({
            "game_id": pg.game.game_id,
            "game_name": pg.game.game_name,
            "provider_name": pg.provider.provider_name,
            "rtp_percent": float(pg.game.rtp_percent)
        })
        
    return result