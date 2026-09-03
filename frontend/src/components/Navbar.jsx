import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import API from '../services/api';

function Navbar() {
  const { user, logout } = useAuth();
  
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await API.get('/notifications/unread-count');
        setUnreadCount(res.data.unreadCount);
      } catch {
        // ignore
      }
    };
    fetchCount();
    // Optionally poll every 30s
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-bgBase border-b-4 border-ink">
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/notifications" className="relative p-2 border-2 border-ink hover:bg-highlight">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-alert text-bgBase rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-ink">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
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
