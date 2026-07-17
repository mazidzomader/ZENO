import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Sun, Moon, Monitor, LogOut, ChevronUp, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../hooks/useSidebar";

export function UserProfile() {
  const { user, logout } = useAuth();
  const { isCollapsed, theme, setTheme } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Handle click outside to close dropdown
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

  // Safe fallback values
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
      {/* Profile Trigger Area */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center gap-3 p-1.5 border border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
        aria-label="User Profile menu"
      >
        {/* Avatar Box */}
        <div className="relative w-8 h-8 flex items-center justify-center border-2 border-ink bg-bgAlt text-ink font-mono text-xs font-bold shrink-0">
          {userInitials}
          {/* Online Indicator Green Dot */}
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-600 border border-ink animate-pulse" />
        </div>

        {/* User Info (hidden when collapsed) */}
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

        {/* Chevron Up Indicator (hidden when collapsed) */}
        {!isCollapsed && (
          <ChevronUp
            className={`w-3.5 h-3.5 text-ink shrink-0 stroke-[2.5] transition-transform duration-100 ease-linear ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* User Dropdown Menu */}
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
            {/* Online Status Readout */}
            <div className="px-2 py-1.5 border-b border-ink/20 text-inkMuted text-[9px] flex items-center justify-between">
              <span>STATUS:</span>
              <span className="text-emerald-600 font-bold">[ONLINE]</span>
            </div>

            {/* Profile Route Link */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                navigate("/profile");
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-ink hover:bg-bgAlt transition-colors outline-none focus-visible:bg-bgAlt"
              role="menuitem"
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              Profile
            </button>

            {/* Account Route Link */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                navigate("/settings");
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-ink hover:bg-bgAlt transition-colors outline-none focus-visible:bg-bgAlt"
              role="menuitem"
            >
              <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
              Account
            </button>

            {/* Theme Selection Section */}
            <div className="border-t border-b border-ink/20 my-1 py-1 bg-bgAlt/30">
              <div className="px-2 py-1 text-[8px] text-inkMuted">SELECT THEME:</div>
              
              {/* Light Mode Button */}
              <button
                onClick={() => setTheme("light")}
                className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                  theme === "light" ? "text-highlight" : "text-ink hover:bg-bgAlt"
                }`}
                role="menuitemradio"
                aria-checked={theme === "light"}
              >
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3 h-3 stroke-[2.5]" />
                  LIGHT
                </span>
                {theme === "light" && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              {/* Dark Mode Button */}
              <button
                onClick={() => setTheme("dark")}
                className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                  theme === "dark" ? "text-highlight" : "text-ink hover:bg-bgAlt"
                }`}
                role="menuitemradio"
                aria-checked={theme === "dark"}
              >
                <span className="flex items-center gap-1.5">
                  <Moon className="w-3 h-3 stroke-[2.5]" />
                  DARK
                </span>
                {theme === "dark" && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              {/* System Mode Button */}
              <button
                onClick={() => setTheme("system")}
                className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                  theme === "system" ? "text-highlight" : "text-ink hover:bg-bgAlt"
                }`}
                role="menuitemradio"
                aria-checked={theme === "system"}
              >
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 stroke-[2.5]" />
                  SYSTEM
                </span>
                {theme === "system" && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            </div>

            {/* Logout Button */}
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
