import React, { useState, useEffect } from "react";
import { rgAPI } from "../../api/responsibleGaming";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import { formatCurrency } from "../../utils/helpers";

const ResponsibleGaming = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [data, setData] = useState({
    current_daily_bet: 0,
    current_daily_loss: 0,
    daily_bet_limit: null,
    daily_loss_limit: null,
    monthly_bet_limit: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await rgAPI.getLimits();
      setData(result);
    } catch (err) {
      setError("Failed to fetch limits");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading limits..." />;

  const getProgress = (current, limit) => {
    if (!limit) return 0;
    const pct = (current / limit) * 100;
    return Math.min(pct, 100);
  };

  const LimitCard = ({ title, current, limit, isLoss = false }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${limit ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}`}
        >
          Limit: {limit ? formatCurrency(limit) : "Unrestricted"}
        </span>
      </div>

      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Current Usage</span>
        <span
          className={
            isLoss && current > 0 ? "text-red-600 font-bold" : "font-mono"
          }
        >
          {formatCurrency(current)}
        </span>
      </div>

      {limit && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className={`h-2.5 rounded-full ${getProgress(current, limit) >= 90 ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${getProgress(current, limit)}%` }}
          ></div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {limit
          ? `You have ${formatCurrency(Math.max(0, limit - current))} remaining.`
          : "You have no restrictions set by the admin for this category."}
      </p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🛡️ Responsible Gaming Limits
          </h2>
          <p className="text-gray-500 mt-1">
            These limits are set by your casino administrator to ensure a safe
            gaming environment.
          </p>
        </div>

        <ErrorMessage message={error} />

        <div className="space-y-6">
          <LimitCard
            title="Daily Wager Limit"
            current={data.current_daily_bet}
            limit={data.daily_bet_limit}
          />

          <LimitCard
            title="Daily Loss Limit"
            current={Math.max(0, data.current_daily_loss)}
            limit={data.daily_loss_limit}
            isLoss={true}
          />

          <LimitCard
            title="Monthly Wager Limit"
            current={data.current_monthly_bet}
            limit={data.monthly_bet_limit}
          />
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          Need to change these limits? Please contact support or your account
          manager.
        </div>
      </div>
    </div>
  );
};

export default ResponsibleGaming;
