import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import Loading from '../common/Loading';
import { statsAPI } from '../../api/stats';

const OwnerProfile = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const stats = await statsAPI.getOwnerProfile();
      setData(stats);
    } catch (err) {
      console.error("Owner stats failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8 bg-slate-50 min-h-screen">
      {/* 1. High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg text-white">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1">Global Turnover</p>
          <p className="text-2xl font-black text-yellow-500">{formatCurrency(data.global_turnover)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-b-4 border-emerald-500">
          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Net Revenue</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(data.global_net_revenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-b-4 border-indigo-500">
          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Active Tenants</p>
          <p className="text-2xl font-black text-indigo-900">{data.active_tenants_count}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-b-4 border-blue-500">
          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Global DAU (24h)</p>
          <p className="text-2xl font-black text-blue-900">{data.global_active_users_24h}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-xl shadow border-b-4 border-red-500">
          <p className="text-xs text-red-600 font-bold uppercase mb-1">System Risk (Liq.)</p>
          <p className="text-2xl font-black text-red-700">{formatCurrency(data.system_liquidity)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Tenant Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white">
            <h3 className="font-bold text-lg">🏢 Tenant Performance Ranking</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Players</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Turnover</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tenant_leaderboard.map((tenant, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{tenant.tenant_name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{tenant.user_count}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">{formatCurrency(tenant.total_turnover)}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(tenant.revenue_contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Global Game Revenue Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <span className="text-xl">🏆</span> Top Games (Global)
          </h3>
          <div className="space-y-6">
            {data.top_performing_games.map((game, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700">{game.game_name}</span>
                  <span className="text-emerald-600 font-bold">{formatCurrency(game.total_revenue)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div 
                    className="bg-linear-to-r from-indigo-500 to-purple-600 h-4 rounded-full" 
                    style={{ width: `${(game.total_revenue / data.top_performing_games[0].total_revenue) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{game.play_count} total sessions across all tenants</p>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Insights</h4>
             <p className="text-xs text-slate-600 italic">
               "{data.top_performing_games[0]?.game_name}" is currently driving {( (data.top_performing_games[0]?.total_revenue / data.global_net_revenue) * 100 ).toFixed(1)}% of total platform profit.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;