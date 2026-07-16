import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const onHome = location.pathname === "/";

  // On the homepage, section links scroll to in-page anchors.
  // On any other route, they route back to the homepage anchor.
  const anchor = (id) => (onHome ? `#${id}` : `/#${id}`);

  return (
    <header className="sticky top-0 w-full bg-bgBase border-b-4 border-ink z-50">
      <div className="ticker-wrap bg-bgAlt py-1 text-xs font-mono uppercase tracking-widest text-inkMuted">
        <div className="ticker-move">
          [LIVE_FEED] ACTIVE BAYS: 1,248 &nbsp;&nbsp;|&nbsp;&nbsp; SUPPORTED
          BUILDINGS: 42 &nbsp;&nbsp;|&nbsp;&nbsp; AVG BOOKING TIME: 32s
          &nbsp;&nbsp;|&nbsp;&nbsp; [LIVE_FEED] ACTIVE BAYS: 1,248
          &nbsp;&nbsp;|&nbsp;&nbsp; SUPPORTED BUILDINGS: 42
          &nbsp;&nbsp;|&nbsp;&nbsp; AVG BOOKING TIME: 32s
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-baseline space-x-4">
          <Link
            to="/"
            className="font-display font-bold text-3xl tracking-tighter text-ink uppercase"
          >
            ZENO<span className="text-alert">_</span>
          </Link>
          <span className="font-mono text-xs text-inkMuted tracking-wider hidden sm:inline-block border-l border-ink pl-4">
            PARKING, SIMPLIFIED
          </span>
        </div>

        <nav className="flex items-center space-x-6 font-mono text-xs font-bold uppercase tracking-widest">
          <a
            href={anchor("protocol")}
            className="hover:bg-ink hover:text-bgBase px-2 py-1 border border-transparent hover:border-ink"
          >
            Protocol
          </a>
          <a
            href={anchor("capabilities")}
            className="hidden sm:inline-block hover:bg-ink hover:text-bgBase px-2 py-1 border border-transparent hover:border-ink"
          >
            How It Works
          </a>

          {!user ? (
            <a
              href={anchor("auth")}
              className="bg-ink text-bgBase px-4 py-2 border-2 border-ink hover:bg-bgBase hover:text-ink flex items-center"
            >
              <span className="w-2 h-2 bg-safe mr-2 animate-blink-fast" />
              Sign In / Register
            </a>
          ) : (
            <div className="flex items-center">
              <span className="px-4 py-2 border-2 border-ink border-r-0 hidden sm:inline-block">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 border-2 border-ink bg-ink text-bgBase hover:bg-highlight hover:text-ink"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
