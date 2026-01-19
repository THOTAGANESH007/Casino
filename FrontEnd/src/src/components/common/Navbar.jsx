import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import { formatCurrency } from "../../utils/helpers";

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { getCashBalance } = useWallet();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-linear-to-r from-casino-dark to-casino-accent text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-3xl">🎰</span>
            <span className="text-xl font-bold">Casino Platform</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="px-4 py-2 rounded-lg hover:bg-pink-300 text-amber-600 transition-colors"
                  >
                    Admin Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/games"
                      className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      Games
                    </Link>
                    <Link
                      to="/wallet"
                      className="px-4 py-2 rounded-lg bg-pink-300 transition-colors"
                    >
                      Wallet
                    </Link>
                    <div className="bg-green-600 px-4 py-2 rounded-lg font-semibold">
                      💰 {formatCurrency(getCashBalance())}
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2 px-4 py-2 bg-pink-300 rounded-lg">
                  <span className="text-2xl">👤</span>
                  <span>{user?.first_name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
