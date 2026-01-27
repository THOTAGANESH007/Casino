import { useState, useEffect } from "react";
import { statsAPI } from "../../api/stats";
import { formatCurrency } from "../../utils/helpers";
import Loading from "../common/Loading";

const AdminProfile = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await statsAPI.getAdminProfile();
        setData(stats);
        console.log(stats);
      } catch (err) {
        console.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;
  const maxDailyRevenue =
    data.revenue_7d.length > 0
      ? Math.max(
          ...data.revenue_7d.map((d) => Math.abs(parseFloat(d.revenue))),
          100,
        )
      : 100;

  return (
    <div className="space-y-6">
      {/* Row 1: Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-indigo-600">
          <p className="text-sm text-gray-500 font-bold uppercase">Total NGR</p>
          <p
            className={`text-2xl font-black ${data.ngr >= 0 ? "text-indigo-900" : "text-red-600"}`}
          >
            {formatCurrency(data.ngr)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-bold uppercase">
            Players LTV (Avg)
          </p>
          <p className="text-2xl font-black text-green-900">
            {formatCurrency(data.avg_ltv)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 font-bold uppercase">DAU (24h)</p>
          <p className="text-2xl font-black text-orange-900">
            {data.active_users_24h}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-bold uppercase">MAU (30d)</p>
          <p className="text-2xl font-black text-blue-900">
            {data.active_users_30d}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Popularity Table */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-bold mb-4">🔥 Game Popularity</h3>
          <div className="space-y-4">
            {data.game_popularity.length > 0 ? (
              data.game_popularity.map((game, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{game.game_name}</span>
                    <span className="font-bold">{game.play_count} plays</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{
                        width: `${(game.play_count / data.game_popularity[0].play_count) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-10">
                No data available yet
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="text-xl">📈</span> Daily Revenue (Last 7 Days)
          </h3>

          <div className="relative h-64 flex items-end justify-between px-2 pt-10 pb-6 border-b border-l border-gray-100">
            {/* Grid Line for Zero */}
            <div
              className="absolute left-0 right-0 border-t border-gray-200 border-dashed"
              style={{ bottom: "24px" }}
            ></div>

            {data.revenue_7d.map((day, idx) => {
              const val = parseFloat(day.revenue);
              const heightPercentage = (Math.abs(val) / maxDailyRevenue) * 100;

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 group relative h-full justify-end"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 transition-all">
                    <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap">
                      {day.date}: {formatCurrency(val)}
                    </div>
                  </div>

                  {/* The Bar */}
                  <div
                    className={`w-2/5 rounded-t transition-all duration-500 ${val >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                    style={{
                      height: `${Math.max(heightPercentage, 2)}%`,
                      marginBottom: "1px",
                    }}
                  ></div>

                  {/* Date Label */}
                  <span className="absolute top-full mt-1 text-[9px] text-gray-400 font-medium transform rotate-45 origin-left">
                    {day.date.split("-").slice(1).join("/")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>{" "}
              Profit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-rose-400 rounded-full"></span> Loss
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Top 5 Users */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            🏆 Top 5 Players (This Week)
          </h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                Total Wagered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.top_5_users_weekly.length > 0 ? data.top_5_users_weekly.map((user, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{user.name}</td>
                <td className="px-6 py-4 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-sm text-right font-mono font-bold text-green-600">
                  {formatCurrency(user.total_wagered)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="2" className="px-6 py-10 text-center text-gray-400 italic">No betting activity this week</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProfile;
