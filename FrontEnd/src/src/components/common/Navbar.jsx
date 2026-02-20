import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import { formatCurrency } from "../../utils/helpers";
import { useMemo } from "react";

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin, isCasinoOwner, currency } =
    useAuth();
  const { getCashBalance, wallets } = useWallet();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formattedBalance = useMemo(() => {
    return formatCurrency(getCashBalance(), currency);
  }, [wallets, currency, getCashBalance]);

  const location = useLocation();
  const restrictedRoutes = [
    "/select-region",
    "/submit-kyc",
    "/pending-verification",
    "/suspended-account",
  ];

  // Check if current path is restricted
  const isRestrictedView = restrictedRoutes.includes(location.pathname);

  return (
    <nav className="bg-linear-to-r from-casino-dark to-casino-accent text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-3xl">
              <img
                src="/msd.webp"
                alt="MSD Logo"
                className="w-12.5 h-12.5 rounded-full object-cover border-2 border-gray-200"
              />{" "}
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && !isRestrictedView ? (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin-profile"
                    className="px-4 py-2 bg-pink-500 rounded-lg"
                  >
                    Profile
                  </Link>
                ) : isCasinoOwner ? (
                  <Link
                    to="/owner-profile"
                    className="px-4 py-2 bg-pink-500 rounded-lg"
                  >
                    Profile
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/games"
                      className="px-4 py-2 rounded-lg bg-pink-500 transition-colors"
                    >
                      Games
                    </Link>
                    <Link
                      to="/wallet"
                      className="px-4 py-2 rounded-lg bg-pink-500 transition-colors"
                    >
                      Wallet
                    </Link>
                    <div className="bg-green-600 px-4 py-2 rounded-lg font-semibold">
                      💰 {formattedBalance}
                    </div>
                    <Link
                      to="/profile"
                      className="px-4 py-2 bg-pink-500 rounded-lg"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/responsible-gaming"
                      className="px-4 py-2 bg-pink-500 rounded-lg"
                    >
                      Your Limits
                    </Link>
                  </>
                )}

                <div className="flex items-center space-x-2 px-4 py-2 bg-pink-500 rounded-lg">
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
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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
