import api from "./axios";

// Blackjack
export const blackjackAPI = {
  startGame: async (betAmount) => {
    const response = await api.post("/games/blackjack/start", null, {
      params: { bet_amount: betAmount },
    });
    return response.data;
  },

  hit: async (sessionId) => {
    const response = await api.post(`/games/blackjack/${sessionId}/hit`);
    return response.data;
  },

  stand: async (sessionId) => {
    const response = await api.post(`/games/blackjack/${sessionId}/stand`);
    return response.data;
  },

  doubleDown: async (sessionId) => {
    const response = await api.post(`/games/blackjack/${sessionId}/double`);
    return response.data;
  },
};

// Roulette
export const rouletteAPI = {
  spin: async (bets) => {
    const response = await api.post("/games/roulette/spin", { bets });
    return response.data;
  },

  getTableInfo: async () => {
    const response = await api.get("/games/roulette/table-info");
    return response.data;
  },
};

// Dice
export const diceAPI = {
  roll: async (betAmount, target, rollOver, clientSeed, nonce) => {
    const response = await api.post("/games/dice/roll", {
      bet_amount: betAmount,
      target,
      roll_over: rollOver,
      client_seed: clientSeed,
      nonce,
    });
    return response.data;
  },

  verify: async (serverSeed, clientSeed, nonce, claimedResult) => {
    const response = await api.post("/games/dice/verify", {
      server_seed: serverSeed,
      client_seed: clientSeed,
      nonce,
      claimed_result: claimedResult,
    });
    return response.data;
  },

  calculateMultiplier: async (target, rollOver) => {
    const response = await api.get("/games/dice/calculate-multiplier", {
      params: { target, roll_over: rollOver },
    });
    return response.data;
  },
};

// Mines
export const minesAPI = {
  startGame: async (betAmount, numMines) => {
    const response = await api.post("/games/mines/start", {
      bet_amount: betAmount,
      num_mines: numMines,
    });
    return response.data;
  },

  revealTile: async (sessionId, position) => {
    const response = await api.post(`/games/mines/${sessionId}/reveal`, {
      position,
    });
    return response.data;
  },

  cashout: async (sessionId) => {
    const response = await api.post(`/games/mines/${sessionId}/cashout`);
    return response.data;
  },

  getState: async (sessionId) => {
    const response = await api.get(`/games/mines/${sessionId}/state`);
    return response.data;
  },
};

// Slots
export const slotsAPI = {
  spin: async (betAmount) => {
    const response = await api.post("/games/slots/spin", {
      bet_amount: betAmount,
    });
    return response.data;
  },

  getSymbols: async () => {
    const response = await api.get("/games/slots/symbols");
    return response.data;
  },
};

// Crash
export const crashAPI = {
  joinGame: async (betAmount, autoCashout = null) => {
    const response = await api.post("/games/crash/join", {
      bet_amount: betAmount,
      auto_cashout: autoCashout,
    });
    return response.data;
  },

  cashout: async (gameId) => {
    const response = await api.post(`/games/crash/${gameId}/cashout`);
    return response.data;
  },

  getGameState: async (gameId) => {
    const response = await api.get(`/games/crash/${gameId}/state`);
    return response.data;
  },

  getCurrentGame: async () => {
    const response = await api.get("/games/crash/current");
    return response.data;
  },
};

// Fantasy Cricket
export const fantasyCricketAPI = {
  getMatches: async () => {
    const response = await api.get("/games/fantasy-cricket/matches");
    return response.data;
  },

  getMatchPlayers: async (matchId) => {
    const response = await api.get(
      `/games/fantasy-cricket/matches/${matchId}/players`
    );
    return response.data;
  },

  createTeam: async (matchId, playerIds, captainId, viceCaptainId) => {
    const response = await api.post(
      `/games/fantasy-cricket/matches/${matchId}/teams`,
      {
        match_id: matchId,
        player_ids: playerIds,
        captain_id: captainId,
        vice_captain_id: viceCaptainId,
      }
    );
    return response.data;
  },

  getLeaderboard: async (matchId) => {
    const response = await api.get(
      `/games/fantasy-cricket/matches/${matchId}/leaderboard`
    );
    return response.data;
  },
};
