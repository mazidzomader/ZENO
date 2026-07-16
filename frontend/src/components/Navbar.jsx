import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-bgBase border-b-4 border-ink">
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="font-display font-bold text-2xl tracking-tighter uppercase"
        >
          ZENO<span className="text-alert">_</span>
        </Link>

        <nav className="flex items-center font-mono text-xs font-bold uppercase tracking-widest">
          {!user ? (
            <>
              <Link
                to="/login"
                className="px-4 py-2 border-2 border-ink border-r-0 hover:bg-ink hover:text-bgBase"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 border-2 border-ink hover:bg-ink hover:text-bgBase"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              {(user.role === "owner" || user.role === "admin") && (
                <Link
                  to="/slots/mine"
                  className="px-4 py-2 border-2 border-ink border-r-0 hover:bg-ink hover:text-bgBase"
                >
                  My Slots
                </Link>
              )}
              <span className="px-4 py-2 border-2 border-ink border-r-0">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 border-2 border-ink bg-ink text-bgBase hover:bg-highlight hover:text-ink"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
