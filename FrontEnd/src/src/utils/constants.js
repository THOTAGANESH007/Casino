export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const USER_ROLES = {
  ADMIN: "admin",
  PLAYER: "player",
  AFFILIATE: "affiliate",
};

export const WALLET_TYPES = {
  CASH: "cash",
  BONUS: "bonus",
  POINTS: "points",
};

export const DOCUMENT_TYPES = {
  AADHAR: "aadhar",
  PAN: "pan",
};

export const BET_STATUS = {
  PLACED: "placed",
  WON: "won",
  LOST: "lost",
  CANCELLED: "cancelled",
};

export const GAMES = [
  {
    id: "blackjack",
    name: "Blackjack",
    icon: "🃏",
    description: "Classic 21 card game with hit, stand, and double down",
    rtp: "99.5%",
    route: "/games/blackjack",
    color: "from-red-500 to-pink-600",
  },
  {
    id: "roulette",
    name: "Roulette",
    icon: "🎰",
    description: "European roulette with all bet types",
    rtp: "97.3%",
    route: "/games/roulette",
    color: "from-purple-500 to-indigo-600",
  },
  {
    id: "dice",
    name: "Dice",
    icon: "🎲",
    description: "Provably fair dice game with verifiable results",
    rtp: "99.0%",
    route: "/games/dice",
    color: "from-blue-500 to-cyan-600",
  },
  {
    id: "mines",
    name: "Mines",
    icon: "💣",
    description: "Reveal tiles and avoid mines for progressive multipliers",
    rtp: "98.0%",
    route: "/games/mines",
    color: "from-yellow-500 to-orange-600",
  },
  {
    id: "slots",
    name: "Slots",
    icon: "🎰",
    description: "3x3 slot machine with multiple winning lines",
    rtp: "96.0%",
    route: "/games/slots",
    color: "from-green-500 to-teal-600",
  },
  {
    id: "crash",
    name: "Crash",
    icon: "🚀",
    description: "Multiplayer crash game with provably fair crash points",
    rtp: "99.0%",
    route: "/games/crash",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "fantasy-cricket",
    name: "Fantasy Cricket",
    icon: "🏏",
    description: "Build your dream team and compete for prizes",
    rtp: "95.0%",
    route: "/games/fantasy-cricket",
    color: "from-indigo-500 to-purple-600",
  },
];
