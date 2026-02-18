from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from ..models.player import PlayerRoles
from ..services.rapid_api import RapidAPICricketService
from ..services.cricket_api import CricketAPIService
from ..utils.security import get_password_hash
from ..database import get_db
from ..models.user import User, UserKYC, UserType
from ..models.tenant import Tenant, TenantRegion
from ..schemas.tenant import RegionUpdate, TenantCreate, TenantResponse, RegionCreate, RegionResponse
from ..schemas.user import TenantAdminCreate, UserResponse
from ..utils.dependencies import require_casino_owner, require_tenant_admin
from ..services.email_service import email_service
from ..models.game import Game, GameProvider, ProviderGame, TenantGame
from ..schemas.game import GameProviderCreate, GameProviderResponse, MarketplaceItemResponse, ProviderGameCreate, TenantGameToggle
from ..models.match import Match, MatchStatuses, MatchType
from ..models.player import Player
from ..models.points import ScoringRule
from decimal import Decimal
import logging
from ..services.kyc_service import KYCService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# ============= TENANT MANAGEMENT =============

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Create a new tenant"""
    
    new_tenant = Tenant(
        tenant_name=tenant_data.tenant_name,
        default_timezone=tenant_data.default_timezone,
        default_currency=tenant_data.default_currency,
        status=True
    )
    
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    return new_tenant

@router.get("/tenants", response_model=List[TenantResponse])
async def get_all_tenants(
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get all tenants"""
    tenants = db.query(Tenant).all()
    return tenants

@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get a specific tenant"""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant

@router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: int,
    status: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Enable or disable a tenant"""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    tenant.status = status
    db.commit()
    
    return {"message": f"Tenant {'enabled' if status else 'disabled'} successfully"}

# ============= REGION MANAGEMENT =============

@router.post("/regions", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
async def create_region(
    region_data: RegionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Create a new region for a tenant"""
    
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.tenant_id == region_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    new_region = TenantRegion(
        tenant_id=region_data.tenant_id,
        tax_rate=region_data.tax_rate,
        region_name=region_data.region_name
    )
    
    db.add(new_region)
    db.commit()
    db.refresh(new_region)
    
    return new_region

@router.get("/regions", response_model=List[RegionResponse])
async def get_all_regions(
    tenant_id: int = None,
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get all regions, optionally filtered by tenant"""
    query = db.query(TenantRegion)
    if tenant_id:
        query = query.filter(TenantRegion.tenant_id == tenant_id)
    
    regions = query.all()
    return regions


# Update region tax rate
@router.patch("/regions/{region_id}/tax")
async def update_region_tax(
    region_id: int,
    update_data: RegionUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Update tax rate for a specific region"""
    region = db.query(TenantRegion).filter(TenantRegion.region_id == region_id).first()
    
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
    
    region.tax_rate = update_data.tax_rate
    db.commit()
    db.refresh(region)
    
    return region

# ============= USER & KYC MANAGEMENT =============

@router.get("/users-admin", response_model=List[UserResponse])
async def get_all_users_admin(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """
    Get all users belonging specifically to the logged-in admin's tenant.
    Filters out other admins, showing only players.
    """
    query = db.query(User).filter(User.tenant_id == admin.tenant_id)
    
    query = query.filter(User.role == UserType.player)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.all()
    return users

@router.get("/kyc/pending")
async def get_pending_kyc(
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Get all pending KYC verifications"""
    pending_kyc = db.query(UserKYC).filter(
        UserKYC.verified_status == False
    ).all()
    
    result = []
    for kyc in pending_kyc:
        user = db.query(User).filter(User.user_id == kyc.user_id).first()
        result.append({
            "kyc_id": kyc.kyc_id,
            "user_id": kyc.user_id,
            "user_name": f"{user.first_name} {user.last_name or ''}",
            "email": user.email,
            "document_type": kyc.document_type,
            "document_number": kyc.document_number
        })
    
    return result
@router.post("/kyc/{kyc_id}/parse")
async def admin_parse_kyc(kyc_id: int, db: Session = Depends(get_db)):
    kyc = db.query(UserKYC).filter(UserKYC.kyc_id == kyc_id).first()
    extracted_no = KYCService.parse_document(kyc.document_url, kyc.document_type)
    
    kyc.parsed_number = extracted_no
    db.commit()
    db.refresh(kyc)
    return {"extracted_number": extracted_no}

@router.post("/kyc/{kyc_id}/approve")
async def approve_kyc(
    kyc_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Approve KYC verification"""
    
    kyc = db.query(UserKYC).filter(UserKYC.kyc_id == kyc_id).first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC record not found"
        )
    
    # Mark KYC as verified
    kyc.verified_status = True
    kyc.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Get user
    user = db.query(User).filter(User.user_id == kyc.user_id).first()
    
    # Send email
    await email_service.send_kyc_approval_email(
        user.email,
        user.first_name
    )
    
    return {"message": "KYC approved successfully"}

@router.post("/kyc/{kyc_id}/reject")
async def reject_kyc(
    kyc_id: int,
    reason: str = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Reject KYC verification"""
    
    kyc = db.query(UserKYC).filter(UserKYC.kyc_id == kyc_id).first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC record not found"
        )
    
    # Get user
    user = db.query(User).filter(User.user_id == kyc.user_id).first()
    
    # Delete KYC record (user can resubmit)
    db.delete(kyc)
    db.commit()
    
    # Send email
    await email_service.send_kyc_rejection_email(
        user.email,
        user.first_name,
        reason
    )
    
    return {"message": "KYC rejected"}

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Activate a user account"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if KYC is verified
    kyc = db.query(UserKYC).filter(UserKYC.user_id == user_id).first()
    if not kyc or not kyc.verified_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC must be verified before activation"
        )
    
    # Activate user
    user.is_active = True
    db.commit()
    
    # Send activation email
    await email_service.send_activation_email(
        user.email,
        user.first_name
    )
    
    return {"message": "User activated successfully"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Deactivate a user account"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}


# Game Provider Management

@router.get("/providers", response_model=List[GameProviderResponse])
async def get_providers(
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Fetch all game providers"""
    return db.query(GameProvider).all()

@router.post("/providers", response_model=GameProviderResponse)
async def add_game_provider(
    provider_data: GameProviderCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Add a new game provider"""
    # Check if exists
    existing = db.query(GameProvider).filter(
        GameProvider.provider_name == provider_data.provider_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider already exists"
        )

    new_provider = GameProvider(
        provider_name=provider_data.provider_name,
        api_url=provider_data.api_url,
        is_active=True
    )
    
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    return new_provider

@router.patch("/providers/{provider_id}/status")
async def toggle_provider_status(
    provider_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Enable or disable a game provider"""
    provider = db.query(GameProvider).filter(GameProvider.provider_id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider.is_active = is_active
    db.commit()
    return {"message": f"Provider {'enabled' if is_active else 'disabled'}"}

# Create Admin User for Tenant

@router.post("/create_admin_user_for_tenant", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user_for_tenant(
    admin_data: TenantAdminCreate, 
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Create an admin user for a specific tenant"""
    
    # 1. Verify Tenant Exists
    tenant = db.query(Tenant).filter(Tenant.tenant_id == admin_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # 2. Check if email exists
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 3. Hash password
    hashed_password = get_password_hash(admin_data.password)

    # 4. Create User
    new_admin = User(
        email=admin_data.email,
        password=hashed_password,
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        phone=admin_data.phone,
        role=UserType.admin,
        tenant_id=admin_data.tenant_id,
        is_active=True
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    return new_admin


@router.get("/tenant-admins", response_model=List[UserResponse])
async def get_tenant_admins(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Get all tenant admins, optionally filtered by tenant"""
    query = db.query(User).filter(User.role == UserType.admin)
    
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
        
    return query.all()


@router.patch("/tenant-admins/{user_id}/status")
async def update_tenant_admin_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Enable or disable a tenant admin"""
    
    # Fetch user ensuring they are an admin (don't allow disabling other roles here)
    admin_user = db.query(User).filter(
        User.user_id == user_id,
        User.role == UserType.admin
    ).first()
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant Admin not found"
        )
    
    admin_user.is_active = is_active
    db.commit()
    db.refresh(admin_user)
    
    return {"message": f"Admin status updated to {'Active' if is_active else 'Inactive'}"}



@router.post("/catalog/add", status_code=status.HTTP_201_CREATED)
async def add_game_to_provider(
    item: ProviderGameCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Owner links a generic game to a provider with a specific cost"""
    # Check if exists
    exists = db.query(ProviderGame).filter(
        ProviderGame.provider_id == item.provider_id,
        ProviderGame.game_id == item.game_id
    ).first()
    
    if exists:
        raise HTTPException(status_code=400, detail="Game already linked to this provider")
        
    new_link = ProviderGame(
        provider_id=item.provider_id,
        game_id=item.game_id,
        cost_per_play=item.cost_per_play
    )
    db.add(new_link)
    db.commit()
    return {"message": "Game added to provider catalog"}

# Helper to ensure base games exist (Run once or via script)
@router.post("/games/init")
async def init_base_games(db: Session = Depends(get_db), owner: User = Depends(require_casino_owner)):
    base_games = ["Blackjack", "Roulette", "Slots", "Mines", "Crash", "Dice", "Fantasy Cricket", "Real Fantasy Cricket"]
    created = []
    for name in base_games:
        if not db.query(Game).filter(Game.game_name == name).first():
            db.add(Game(game_name=name, rtp_percent=98.0))
            created.append(name)
    db.commit()
    return {"created": created}

@router.get("/marketplace", response_model=List[MarketplaceItemResponse])
async def get_game_marketplace(
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Show all available games from all providers and if tenant owns them"""
    
    # 1. Get all provider games
    catalog = db.query(ProviderGame).join(Game).join(GameProvider).all()
    
    # 2. Get what tenant currently has
    my_games = db.query(TenantGame).filter(TenantGame.tenant_id == admin.tenant_id).all()
    my_game_ids = {g.provider_game_id: g.is_active for g in my_games}
    
    result = []
    for item in catalog:
        result.append({
            "id": item.id,
            "game_name": item.game.game_name,
            "provider_name": item.provider.provider_name,
            "cost_per_play": float(item.cost_per_play),
            "is_enabled": my_game_ids.get(item.id, False) # True if exists and active
        })
        
    return result

@router.post("/games/toggle")
async def toggle_tenant_game(
    data: TenantGameToggle,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Enable or disable a game for this tenant"""
    
    # Check if record exists
    tenant_game = db.query(TenantGame).filter(
        TenantGame.tenant_id == admin.tenant_id,
        TenantGame.provider_game_id == data.provider_game_id
    ).first()
    
    if tenant_game:
        tenant_game.is_active = data.is_active
    else:
        if data.is_active:
            # Create new subscription
            tenant_game = TenantGame(
                tenant_id=admin.tenant_id,
                provider_game_id=data.provider_game_id,
                is_active=True
            )
            db.add(tenant_game)
    
    db.commit()
    return {"message": "Game updated successfully"}


@router.get("/games", status_code=status.HTTP_200_OK)
async def get_base_games(
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """List all generic games (Blackjack, Slots, etc.)"""
    return db.query(Game).all()

@router.get("/catalog", status_code=status.HTTP_200_OK)
async def get_catalog(
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """List all configured Provider Games (The Catalog)"""
    catalog = db.query(ProviderGame).join(Game).join(GameProvider).all()
    
    result = []
    for item in catalog:
        result.append({
            "id": item.id,
            "provider_name": item.provider.provider_name,
            "game_name": item.game.game_name,
            "cost_per_play": item.cost_per_play,
            "is_active": item.provider.is_active # inherited from provider
        })
    return result

def match_status(started, ended):
    if started == False and ended == False:
        return MatchStatuses.UPCOMING
    elif started == True and ended == False:
        return MatchStatuses.LIVE
    else:
        return MatchStatuses.COMPLETED
@router.post("/matches/fetch-upcoming")
def fetch_upcoming_matches(db: Session = Depends(get_db)):
    """
    Fetch matches from CricAPI and save to DB.
    Mappings are specific to CricAPI JSON response.
    """
    try:
        # 1. Get raw data from Service
        upcoming_matches_data = CricketAPIService.get_upcoming_matches()
        created_count = 0

        for match_data in upcoming_matches_data:
            # CricAPI uses 'id' string
            external_id = str(match_data.get("id"))

            # Check if exists
            existing = db.query(Match).filter(
                Match.external_match_id == external_id
            ).first()

            if existing:
                continue

            # 2. Extract Data Safely
            # Date: CricAPI sends "dateTimeGMT" or "date"
            match_date_str = match_data.get("dateTimeGMT") or match_data.get("date")
            
            if not match_date_str:
                logger.warning(f"Skipping match {external_id}: No date found")
                continue

            # Match Type
            m_type = match_data.get("matchType", "").upper()
            if "TEST" in m_type: match_type = MatchType.TEST
            elif "ODI" in m_type: match_type = MatchType.ODI
            elif "T10" in m_type: match_type = MatchType.T10
            else: match_type = MatchType.T20

            # Teams: CricAPI sends 'teamInfo': [{'name': 'Ind'}, {'name': 'Aus'}]
            teams_info = match_data.get("teamInfo", [])
            team_a = teams_info[0].get("name") if len(teams_info) > 0 else "Team A"
            team_b = teams_info[1].get("name") if len(teams_info) > 1 else "Team B"

            # 3. Create Record
            match = Match(
                external_match_id=external_id,
                match_name=match_data.get("name", f"{team_a} vs {team_b}"),
                match_type=match_type,
                venue=match_data.get("venue", "Unknown Venue"),
                match_date=match_date_str,
                team_a=team_a,
                team_b=team_b,
                status=match_status(match_data.get("matchStarted"), match_data.get("matchEnded")),
                series_name=match_data.get("series_id", ""),
                is_active=False,
                # Default Money Settings
                entry_fee=Decimal("10.00"),
                max_budget=Decimal("100.0"),
                prize_pool=Decimal("0.00")
            )

            db.add(match)
            created_count += 1

        db.commit()

        return {
            "message": f"Fetched {len(upcoming_matches_data)} matches, created {created_count}",
            "created": created_count
        }

    except Exception as e:
        logger.error(f"Error fetching matches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/matches")
def list_all_matches(status_filter: MatchStatuses = None, db: Session = Depends(get_db)):
    query = db.query(Match)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    return query.order_by(Match.match_date.desc()).all()

@router.post("/matches/{match_id}/activate")
def activate_match(match_id: int, db: Session = Depends(get_db)):
    """Activate match and fetch squads via CricAPI"""
    match = db.query(Match).filter(Match.match_id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.is_active:
        raise HTTPException(status_code=400, detail="Match already activated")
    
    # 1. Fetch Squads
    # Your service returns: { "teamA": { "squad": [...] }, "teamB": { "squad": [...] } }
    match_info = CricketAPIService.get_match_squads(match.external_match_id)
    
    if not match_info:
        raise HTTPException(
            status_code=500, 
            detail="Squads not found in API. CricAPI might not have released them yet."
        )

    players_created = 0
    
    # 2. Parse Team A
    team_a_data = match_info.get("teamA", {})
    for p_data in team_a_data.get("squad", []):
        create_player(db, match.match_id, p_data, match.team_a)
        players_created += 1

    # 3. Parse Team B
    team_b_data = match_info.get("teamB", {})
    for p_data in team_b_data.get("squad", []):
        create_player(db, match.match_id, p_data, match.team_b)
        players_created += 1
    
    # Create rules & activate
    create_default_scoring_rules(db, match.match_id)
    match.is_active = True
    db.commit()
    
    return {
        "message": f"Match activated with {players_created} players",
        "match_id": match_id
    }

def create_player(db: Session, match_id: int, player_data: dict, team_name: str):
    """Map CricAPI player to DB"""
    external_id = str(player_data.get("id"))
    
    existing = db.query(Player).filter(
        Player.match_id == match_id,
        Player.external_player_id == external_id
    ).first()
    
    if existing: return existing
    
    # Role Logic
    raw_role = player_data.get("role")
    role_str = raw_role.lower() if raw_role else ""
    if "bat" in role_str: role = PlayerRoles.BATSMAN
    elif "bowl" in role_str: role = PlayerRoles.BOWLER
    elif "all" in role_str: role = PlayerRoles.ALL_ROUNDER
    elif "keep" in role_str or "wk" in role_str: role = PlayerRoles.WICKET_KEEPER
    else: role = PlayerRoles.BATSMAN
    
    # Credits Logic
    credits = 9.0
    if role == PlayerRoles.ALL_ROUNDER: credits = 9.5
    if role == PlayerRoles.BOWLER: credits = 8.5

    player = Player(
        match_id=match_id,
        external_player_id=external_id,
        name=player_data.get("name"),
        role=role,
        team=team_name,
        credits=Decimal(str(credits)),
        image_url=player_data.get("image"),
        meta_data=player_data
    )
    db.add(player)
    return player

def create_default_scoring_rules(db: Session, match_id: int):
    if not db.query(ScoringRule).filter(ScoringRule.match_id == match_id).first():
        db.add(ScoringRule(match_id=match_id))
        db.commit()

@router.post("/matches/{match_id}/lock")
def lock_team_creation(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.match_id == match_id).first()
    if not match: raise HTTPException(status_code=404, detail="Match not found")
    match.teams_locked = True
    db.commit()
    return {"message": "Team creation locked"}

@router.post("/matches/{match_id}/start")
def start_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.match_id == match_id).first()
    if not match: raise HTTPException(status_code=404, detail="Match not found")
    match.status = MatchStatuses.LIVE
    db.commit()
    return {"message": "Match started"}

@router.put("/matches/{match_id}/scoring-rules")
def update_scoring_rules(match_id: int, rules_data: dict, db: Session = Depends(get_db)):
    rules = db.query(ScoringRule).filter(ScoringRule.match_id == match_id).first()
    if not rules: raise HTTPException(status_code=404, detail="Rules not found")
    for field, value in rules_data.items():
        if hasattr(rules, field):
            setattr(rules, field, Decimal(str(value)))
    db.commit()
    return rules
