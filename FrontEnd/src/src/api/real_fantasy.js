import api from "./axios";

export const realFantasyAPI = {
  // --- PLAYER ENDPOINTS ---
  getMatches: () => api.get(`/games/real-fantasy/matches`),

  getPlayersForMatch: (matchId) =>
    api.get(`/games/real-fantasy/matches/${matchId}/players`),

  createTeam: (teamData) => api.post(`/teams/create`, teamData),

  getUserTeams: (userId, matchId) =>
    api.get(`/teams/user/${userId}/match/${matchId}`),

  getTeamDetails: (teamId) => api.get(`/teams/${teamId}`),

  // --- ADMIN ENDPOINTS ---
  getAdminMatches: () => api.get(`/admin/matches`),

  scrapeAdminMatches: () => api.post(`/admin/matches/fetch-upcoming`, {}),

  activateMatch: (matchId) =>
    api.post(`/admin/matches/${matchId}/activate`, {}),

  lockMatch: (matchId) => api.post(`/admin/matches/${matchId}/lock`, {}),

  startMatch: (matchId) => api.post(`/admin/matches/${matchId}/start`, {}),

  updateScoringRules: (matchId, rules) =>
    api.put(`/admin/matches/${matchId}/scoring-rules`, rules),
};
