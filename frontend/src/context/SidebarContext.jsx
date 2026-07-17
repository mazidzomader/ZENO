import { createContext, useState, useEffect } from "react";

export const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  // Collapse/Expand state (persist in localStorage)
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    const saved = localStorage.getItem("zeno_sidebar_collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const setIsCollapsed = (collapsed) => {
    setIsCollapsedState(collapsed);
    localStorage.setItem("zeno_sidebar_collapsed", JSON.stringify(collapsed));
  };

  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Theme mode: light, dark, system (persist in localStorage)
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("zeno_theme") || "system";
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("zeno_theme", newTheme);
  };

  // Sync theme to root classList (Tailwind dark mode support)
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      let isDark = false;
      if (theme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = theme === "dark";
      }

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    // Listen for system theme change if set to system
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = () => {
        applyTheme();
      };
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      };
    }
  }, [theme]);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        searchQuery,
        setSearchQuery,
        theme,
        setTheme,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
