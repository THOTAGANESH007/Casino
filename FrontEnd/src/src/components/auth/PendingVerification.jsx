import React from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";

const PendingVerification = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
        <div className="text-8xl mb-6 animate-pulse">⏳</div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Verification Pending
        </h2>

        <p className="text-gray-600 mb-6">
          Your KYC documents are under review. You'll receive an email once
          approved.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Processing Time:</strong> 24-48 hours
          </p>
          <p className="text-sm text-yellow-800 mt-2">
            You can check back later or wait for our email notification.
          </p>
        </div>

        <Link to="/login">
          <Button variant="secondary" size="lg" className="w-full">
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PendingVerification;
