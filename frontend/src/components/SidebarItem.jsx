import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";

export function SidebarItem({ item, isSubmenuItem = false }) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const location = useLocation();

  // Check if current path matches the item path
  // If item is dashboard (/) it should be exact, else it can match prefix
  const isActive =
    item.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.path);

  // Resolve Lucide Icon dynamically
  const IconComponent = Icons[item.icon] || Icons.HelpCircle;

  return (
    <Link
      to={item.path}
      className={`relative flex items-center gap-3 p-3 transition-colors outline-none select-none font-mono text-xs font-bold uppercase tracking-wider group ${
        isSubmenuItem ? "pl-11 py-2 bg-bgAlt/30 border-b border-ink/10 last:border-b-0" : "border-b border-ink"
      } ${
        isActive
          ? "text-ink"
          : "text-ink hover:bg-bgAlt focus-visible:bg-bgAlt"
      }`}
      aria-label={`${item.title} navigation Link`}
      role="menuitem"
    >
      {/* Active Indicator sliding background block */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 bg-highlight -z-10 border-l-4 border-ink"
          transition={{ duration: 0.12, ease: "linear" }}
        />
      )}

      {/* Focus Indicator box */}
      <span className="absolute inset-0 border-2 border-transparent group-focus-visible:border-ink pointer-events-none" />

      {/* Item Icon */}
      {!isSubmenuItem && (
        <div className={`flex-shrink-0 flex items-center justify-center ${isActive ? "text-ink" : "text-ink"}`}>
          <IconComponent className="w-4 h-4 stroke-[2.5]" />
        </div>
      )}

      {/* Title (hidden when collapsed and not in submenu list) */}
      {(!isCollapsed || isSubmenuItem) ? (
        <span className="flex-grow text-left whitespace-nowrap truncate">
          {item.title}
        </span>
      ) : (
        <span className="sr-only">{item.title}</span>
      )}

      {/* Badge / Count indicator in bracket, e.g. [5] (hidden when collapsed and not in submenu) */}
      {item.badge !== undefined && (!isCollapsed || isSubmenuItem) && (
        <span
          className={`font-mono text-[10px] px-1 font-bold ${
            isActive ? "text-ink" : "text-highlight"
          }`}
        >
          [{item.badge}]
        </span>
      )}

      {/* Tooltip for collapsed mode icon */}
      {isCollapsed && !isSubmenuItem && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-ink text-bgBase font-mono text-[10px] uppercase font-bold tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 border border-ink z-50 rounded-none shadow-none">
          {item.title} {item.badge !== undefined && `[${item.badge}]`}
        </div>
      )}
    </Link>
  );
}
