import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { SidebarProvider } from "../context/SidebarContext";
import { useSidebar } from "../hooks/useSidebar";
import { Sidebar } from "../components/Sidebar";

function DashboardLayoutContent() {
  const { isCollapsed, setIsMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-bgBase text-ink font-sans flex flex-col md:flex-row relative">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area Wrapper */}
      <div
        className="flex-grow flex flex-col min-h-screen transition-[margin-left] duration-150 ease-linear"
        style={{
          marginLeft: typeof window !== "undefined" && window.innerWidth >= 768
            ? isCollapsed ? "4rem" : "16rem"
            : "0px"
        }}
      >
        {/* Mobile View Top Header Navbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-bgAlt border-b-2 border-ink sticky top-0 z-30 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1 border border-ink bg-bgBase text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline-none"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>
            <span className="font-display font-bold text-lg uppercase tracking-tighter text-ink">
              ZENO
            </span>
          </div>
        </header>

        {/* Scrollable Main Content Port */}
        <main className="flex-grow flex flex-col p-6 md:p-8 overflow-y-auto bg-bgBase">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardLayoutContent />
    </SidebarProvider>
  );
}
