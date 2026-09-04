import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Sun, Moon, Monitor, LogOut, ChevronUp, Check, Grid, Tag, Calendar, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../hooks/useSidebar";

export function UserProfile() {
  const { user, logout } = useAuth();
  const { isCollapsed, theme, setTheme } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    if (logout) {
      await logout();
    }
    navigate("/login");
  };

  const userName = user?.name || "SYS_OPERATOR";
  const userRole = user?.role || "GUEST";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div ref={dropdownRef} className="relative border-t-2 border-ink bg-bgAlt p-3 select-none">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center gap-3 p-1.5 border border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
        aria-label="User Profile menu"
      >
        <div className="relative w-8 h-8 flex items-center justify-center border-2 border-ink bg-bgAlt text-ink font-mono text-xs font-bold shrink-0">
          {userInitials}
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-600 border border-ink animate-pulse" />
        </div>

        {!isCollapsed && (
          <div className="flex-grow text-left overflow-hidden">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider truncate text-ink">
              {userName}
            </div>
            <div className="font-mono text-[9px] font-bold text-inkMuted uppercase tracking-tight flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
              {userRole}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <ChevronUp
            className={`w-3.5 h-3.5 text-ink shrink-0 stroke-[2.5] transition-transform duration-100 ease-linear ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1, ease: "linear" }}
            className={`absolute bottom-full left-3 right-3 mb-2 border-2 border-ink bg-bgBase z-50 p-1 font-mono text-[10px] uppercase font-bold tracking-wider ${
              isCollapsed ? "w-48 left-0 -ml-1 border-2 border-ink" : ""
            }`}
            role="menu"
          >
            <div className="px-2 py-1.5 border-b border-ink/20 text-inkMuted text-[9px] flex items-center justify-between">
              <span>STATUS:</span>
              <span className="text-emerald-600 font-bold">[ONLINE]</span>
            </div>

            {(userRole === "owner" || userRole === "admin") && (
              <div className="border-t border-b border-ink/20 my-1 py-1">
                <div className="px-2 py-1 text-[8px] text-inkMuted">MANAGE:</div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/slots/mine");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-ink hover:bg-bgAlt transition-colors outline-none focus-visible:bg-bgAlt"
                  role="menuitem"
                >
                  <Grid className="w-3.5 h-3.5 stroke-[2.5]" />
                  My Slots
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/pricing-rules");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-ink hover:bg-bgAlt transition-colors outline-none focus-visible:bg-bgAlt"
                  role="menuitem"
                >
                  <Tag className="w-3.5 h-3.5 stroke-[2.5]" />
                  Pricing Rules
                </button>
              </div>
            )}

                       

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-alert hover:bg-alert hover:text-bgBase transition-colors outline-none focus-visible:bg-alert focus-visible:text-bgBase"
              role="menuitem"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}