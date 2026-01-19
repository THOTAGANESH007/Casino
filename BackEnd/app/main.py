from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base

# Import routers
from .routers import auth, admin, wallet
from .routers.games import (
    blackjack,
    roulette,
    dice,
    mines,
    slots,
    crash,
    fantasy_cricket
)

app = FastAPI(
    title="Multi-Tenant Casino API",
    description="Production-grade multi-tenant online casino backend with server-authoritative games",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Casino Support",
        "email": "support@casino.com"
    }
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(wallet.router)

# Game routers
app.include_router(blackjack.router)
app.include_router(roulette.router)
app.include_router(dice.router)
app.include_router(mines.router)
app.include_router(slots.router)
app.include_router(crash.router)
app.include_router(fantasy_cricket.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Tenant Casino API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "games": [
            "Blackjack",
            "Roulette",
            "Dice (Provably Fair)",
            "Mines",
            "Slots",
            "Crash (Multiplayer)",
            "Fantasy Cricket"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

@app.get("/games")
async def list_games():
    """List all available games"""
    return {
        "games": [
            {
                "name": "Blackjack",
                "endpoint": "/games/blackjack",
                "description": "Classic 21 card game with hit, stand, and double down",
                "rtp": "99.5%"
            },
            {
                "name": "Roulette",
                "endpoint": "/games/roulette",
                "description": "European roulette with all bet types",
                "rtp": "97.3%"
            },
            {
                "name": "Dice",
                "endpoint": "/games/dice",
                "description": "Provably fair dice game with verifiable results",
                "rtp": "99.0%"
            },
            {
                "name": "Mines",
                "endpoint": "/games/mines",
                "description": "Reveal tiles and avoid mines for progressive multipliers",
                "rtp": "98.0%"
            },
            {
                "name": "Slots",
                "endpoint": "/games/slots",
                "description": "3x3 slot machine with multiple winning lines",
                "rtp": "96.0%"
            },
            {
                "name": "Crash",
                "endpoint": "/games/crash",
                "description": "Multiplayer crash game with provably fair crash points",
                "rtp": "99.0%"
            },
            {
                "name": "Fantasy Cricket",
                "endpoint": "/games/fantasy-cricket",
                "description": "Build teams and compete for prizes with delayed settlement",
                "rtp": "95.0%"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development"
    )