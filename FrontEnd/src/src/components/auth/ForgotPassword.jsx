import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../../api/auth";
import Input from "../common/Input";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Step 1: Send OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await authAPI.forgotPassword(email);
      setSuccess("OTP sent! Please check your email.");
      setStep(2);
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;

    if (!passwordRegex.test(formData.newPassword)) {
      setError(
        "Password must be at least 8 characters and include a letter, number, and special character",
      );
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({
        email: email,
        otp: formData.otp,
        new_password: formData.newPassword,
      });
      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to reset password. Invalid OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 to-purple-600 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold text-gray-900">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 1
              ? "Enter your email to receive a code"
              : `Enter the code sent to ${email}`}
          </p>
        </div>

        <ErrorMessage message={error} onClose={() => setError("")} />
        <SuccessMessage message={success} onClose={() => setSuccess("")} />

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="OTP Code"
              type="text"
              value={formData.otp}
              onChange={(e) =>
                setFormData({ ...formData, otp: e.target.value })
              }
              required
              placeholder="123456"
            />
            <Input
              label="New Password"
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              minLength={8}
              required
              placeholder="******"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              minLength={8}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              placeholder="******"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-gray-600 hover:text-primary-600"
            >
              Wrong email? Go back
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
