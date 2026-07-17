import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";
import { SidebarItem } from "./SidebarItem";

export function SidebarGroup({ group }) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const location = useLocation();

  // Check if any child route is active
  const isAnyChildActive = group.children?.some((child) =>
    location.pathname.startsWith(child.path)
  );

  // Submenu open state
  const [isOpen, setIsOpen] = useState(isAnyChildActive);

  // Automatically expand group if child becomes active (e.g. programmatically changed)
  useEffect(() => {
    if (isAnyChildActive) {
      setIsOpen(true);
    }
  }, [isAnyChildActive, location.pathname]);

  // Keep group closed when sidebar collapses to prevent awkward rendering
  useEffect(() => {
    if (isCollapsed) {
      setIsOpen(false);
    } else if (isAnyChildActive) {
      setIsOpen(true);
    }
  }, [isCollapsed, isAnyChildActive]);

  const handleToggle = () => {
    if (isCollapsed) {
      // Expand sidebar first, then open submenu
      setIsCollapsed(false);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const IconComponent = Icons[group.icon] || Icons.HelpCircle;

  return (
    <div className="border-b border-ink">
      {/* Group header button */}
      <button
        onClick={handleToggle}
        className={`w-full relative flex items-center gap-3 p-3 transition-colors outline-none select-none font-mono text-xs font-bold uppercase tracking-wider group ${
          isAnyChildActive && !isOpen ? "bg-bgAlt/50" : ""
        } hover:bg-bgAlt focus-visible:bg-bgAlt`}
        aria-expanded={isOpen}
        aria-label={`${group.title} submenu group`}
      >
        {/* Active group left border bar */}
        {isAnyChildActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-highlight" />
        )}

        {/* Focus Indicator box */}
        <span className="absolute inset-0 border-2 border-transparent group-focus-visible:border-ink pointer-events-none" />

        {/* Group Icon */}
        <div className="flex-shrink-0 flex items-center justify-center text-ink">
          <IconComponent className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Title (hidden when collapsed) */}
        {!isCollapsed ? (
          <span className="flex-grow text-left whitespace-nowrap truncate text-ink">
            {group.title}
          </span>
        ) : (
          <span className="sr-only">{group.title}</span>
        )}

        {/* Dropdown Chevron (hidden when collapsed) */}
        {!isCollapsed && (
          <Icons.ChevronDown
            className={`w-4 h-4 text-ink transition-transform duration-150 ease-linear stroke-[2.5] ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}

        {/* Collapsed Tooltip */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-ink text-bgBase font-mono text-[10px] uppercase font-bold tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 border border-ink z-50 rounded-none shadow-none">
            {group.title}
          </div>
        )}
      </button>

      {/* Submenu child links container */}
      <AnimatePresence initial={false}>
        {isOpen && !isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15, ease: "linear" }}
            className="overflow-hidden bg-bgAlt/20 border-t border-ink/10"
            role="menu"
          >
            {group.children.map((child) => (
              <SidebarItem key={child.id} item={child} isSubmenuItem={true} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
