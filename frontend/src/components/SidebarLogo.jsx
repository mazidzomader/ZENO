import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import zenoLogo from "../assets/ZENO.png";
import { useSidebar } from "../hooks/useSidebar";

export function SidebarLogo() {
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <div className="flex items-center justify-between p-4 border-b-2 border-ink h-16 bg-bgAlt select-none">
      <div className="flex items-center gap-3">
        {/* Logo Image */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-ink p-1 bg-bgBase">
          <img
            src={zenoLogo}
            alt="ZENO logo"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Project Name (Hidden when collapsed) */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: "linear" }}
            className="flex items-baseline gap-1"
          >
            <span className="font-display font-bold text-xl tracking-tighter uppercase text-ink">
              ZENO
            </span>
            <span className="w-1.5 h-1.5 bg-highlight inline-block animate-pulse" />
          </motion.div>
        )}
      </div>

      {/* Collapse/Expand Button (Hidden when collapsed, or rendered differently) */}
      {!isCollapsed && (
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 border border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline focus:outline-2 focus:outline-ink focus:outline-offset-1 hidden md:block"
          aria-label="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* When collapsed, we can show a subtle indicator or expand button on hover, or render an expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-4 z-50 p-1 border border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline focus:outline-2 focus:outline-ink hidden md:block"
          aria-label="Expand Sidebar"
        >
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
