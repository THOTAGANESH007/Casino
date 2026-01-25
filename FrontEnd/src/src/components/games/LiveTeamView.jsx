export const LiveTeamView = ({ team, match }) => {
  if (!team)
    return <div className="text-center py-10">You didn't join this match.</div>;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      {/* Team Summary Header */}
      <div className="bg-linear-to-r from-gray-900 to-indigo-900 rounded-2xl p-6 text-white shadow-2xl border-b-4 border-indigo-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-3 rounded-xl shadow-inner">
              <span className="text-3xl">🛡️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Team #{team.team_id}</h3>
              <p className="text-indigo-300 text-sm">
                {match.team1} vs {match.team2}
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">
                Rank
              </p>
              <p className="text-3xl font-black text-yellow-400">
                #{team.rank || "-"}
              </p>
            </div>
            <div className="text-center border-l border-white/10 pl-8">
              <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">
                Total Points
              </p>
              <p className="text-3xl font-black text-green-400">
                {team.total_points.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {team.players_breakdown?.map((player, idx) => (
          <div
            key={idx}
            className={`relative group bg-white rounded-xl p-4 shadow-md border-t-4 transition-all hover:shadow-xl hover:-translate-y-1 
              ${player.is_captain ? "border-yellow-400" : player.is_vice_captain ? "border-orange-400" : "border-indigo-100"}`}
          >
            {/* C/VC Badges */}
            {player.is_captain && (
              <span className="absolute -top-3 -right-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-10">
                CAPTAIN 2x
              </span>
            )}
            {player.is_vice_captain && (
              <span className="absolute -top-3 -right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-10">
                V-CAPT 1.5x
              </span>
            )}

            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner">
                {player.role === "batsman"
                  ? "🏏"
                  : player.role === "bowler"
                    ? "⚡"
                    : player.role === "all_rounder"
                      ? "⭐"
                      : "🧤"}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 leading-tight">
                  {player.name}
                </h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                  {player.team} • {player.role.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-3 gap-1 bg-gray-50 rounded-lg p-2 mb-3">
              <div className="text-center border-r border-gray-200">
                <p className="text-[8px] text-gray-400 uppercase">Runs</p>
                <p className="text-xs font-bold">{player.stats.runs || 0}</p>
              </div>
              <div className="text-center border-r border-gray-200">
                <p className="text-[8px] text-gray-400 uppercase">Wkts</p>
                <p className="text-xs font-bold">{player.stats.wickets || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-gray-400 uppercase">Field</p>
                <p className="text-xs font-bold">
                  {(player.stats.catches || 0) + (player.stats.run_outs || 0)}
                </p>
              </div>
            </div>

            {/* Pts Breakdown */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">Contribution</span>
              <span
                className={`font-mono font-bold ${player.total_points > 0 ? "text-indigo-600" : "text-gray-400"}`}
              >
                {player.total_points.toFixed(1)}{" "}
                <span className="text-[9px]">pts</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
