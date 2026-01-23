import React, { useState, useEffect } from "react";
import { rgAPI } from "../../api/responsibleGaming";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";

const SetLimitsModal = ({ user, onClose }) => {
  const [limits, setLimits] = useState({
    daily_bet_limit: "",
    daily_loss_limit: "",
    monthly_bet_limit: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) fetchLimits();
  }, [user]);

  const fetchLimits = async () => {
    try {
      const data = await rgAPI.getAdminUserLimits(user.user_id);
      setLimits({
        daily_bet_limit: data.daily_bet_limit || "",
        daily_loss_limit: data.daily_loss_limit || "",
        monthly_bet_limit: data.monthly_bet_limit || "",
      });
    } catch (err) {
      setError("Failed to fetch current limits");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Prepare payload (convert empty strings to null)
    const payload = {
      daily_bet_limit:
        limits.daily_bet_limit === ""
          ? null
          : parseFloat(limits.daily_bet_limit),
      daily_loss_limit:
        limits.daily_loss_limit === ""
          ? null
          : parseFloat(limits.daily_loss_limit),
      monthly_bet_limit:
        limits.monthly_bet_limit === ""
          ? null
          : parseFloat(limits.monthly_bet_limit),
    };

    try {
      await rgAPI.setAdminUserLimits(user.user_id, payload);
      setSuccess("Limits updated successfully");
      setTimeout(onClose, 1500);
    } catch (err) {
      setError("Failed to save limits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title={`Set Limits for ${user?.first_name}`}
    >
      {loading ? (
        <p className="text-center py-4">Loading user limits...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage message={error} onClose={() => setError("")} />
          <SuccessMessage message={success} />

          <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded">
            Leave fields blank to remove the limit. Limits apply immediately.
          </p>

          <Input
            label="Daily Wager Limit ($)"
            type="number"
            value={limits.daily_bet_limit}
            onChange={(e) =>
              setLimits({ ...limits, daily_bet_limit: e.target.value })
            }
            placeholder="No Limit"
            min="0"
          />

          <Input
            label="Daily Loss Limit ($)"
            type="number"
            value={limits.daily_loss_limit}
            onChange={(e) =>
              setLimits({ ...limits, daily_loss_limit: e.target.value })
            }
            placeholder="No Limit"
            min="0"
          />

          <Input
            label="Monthly Wager Limit ($)"
            type="number"
            value={limits.monthly_bet_limit}
            onChange={(e) =>
              setLimits({ ...limits, monthly_bet_limit: e.target.value })
            }
            placeholder="No Limit"
            min="0"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Limits"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SetLimitsModal;
