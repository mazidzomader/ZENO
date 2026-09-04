import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";
import { sidebarItems } from "../data/sidebarItems";
import { SidebarLogo } from "./SidebarLogo";
import { SearchBar } from "./SearchBar";
import { SidebarItem } from "./SidebarItem";
import { SidebarGroup } from "./SidebarGroup";
import { UserProfile } from "./UserProfile";
import { useAuth } from "../context/AuthContext";

export function Sidebar() {
  const { isCollapsed, isMobileOpen, setIsMobileOpen, searchQuery } = useSidebar();
  const { user } = useAuth();

  // Filter items based on user role
  const visibleItems = sidebarItems.filter((item) => { // <-- CHANGE 3
    if (item.roles) {return user && item.roles.includes(user.role);}
    return true;});
    
  // Helper to filter sidebar items recursively
  const getFilteredItems = (items, query) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items.reduce((acc, item) => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);

      if (item.children) {
        const matchingChildren = item.children.filter((child) =>
          child.title.toLowerCase().includes(lowerQuery)
        );

        if (matchingChildren.length > 0 || titleMatch) {
          acc.push({
            ...item,
            // Keep matching children if any exist, otherwise render all children if parent matched
            children: matchingChildren.length > 0 ? matchingChildren : item.children,
          });
        }
      } else if (titleMatch) {
        acc.push(item);
      }

      return acc;
    }, []);
  };

  const filteredItems = getFilteredItems(visibleItems, searchQuery);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bgBase text-ink font-mono">
      {/* Brand Header */}
      <SidebarLogo />

      {/* Real-time filtering Search Bar */}
      <SearchBar />

      {/* Scrollable Navigation Area */}
      <nav
        className="flex-grow overflow-y-auto overflow-x-hidden border-b border-ink scrollbar-thin"
        role="menu"
        aria-label="Sidebar navigation"
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item) =>
            item.children ? (
              <SidebarGroup key={item.id} group={item} />
            ) : (
              <SidebarItem key={item.id} item={item} />
            )
          )
        ) : (
          <div className="p-4 text-center text-xs font-bold text-inkMuted uppercase">
            [No matches]
          </div>
        )}
      </nav>

      {/* Footer User Area */}
      <UserProfile />
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP/TABLET SIDEBAR */}
      <motion.aside
        className="hidden md:block sidebar-container fixed top-0 bottom-0 left-0 z-40 border-r-4 border-ink bg-bgBase select-none"
        animate={{ width: isCollapsed ? "4rem" : "16rem" }}
        transition={{ duration: 0.15, ease: "linear" }}
      >
        {sidebarContent}
      </motion.aside>

      {/* 2. MOBILE SIDEBAR OVERLAY DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-ink"
            />

            {/* Sliding Drawer Body */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.18, ease: "linear" }}
              className="relative sidebar-container w-64 max-w-xs h-full border-r-4 border-ink bg-bgBase z-50"
            >
              {/* Close Button Float for Mobile */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-[-3rem] p-1.5 border-2 border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline-none"
                aria-label="Close sidebar menu"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
