import { useRef } from "react";
import { Search, X } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar";

export function SearchBar() {
  const { isCollapsed, setIsCollapsed, searchQuery, setSearchQuery } = useSidebar();
  const inputRef = useRef(null);

  const handleIconClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      // Give the layout time to animate open before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="p-3 border-b border-ink bg-bgBase select-none">
      {isCollapsed ? (
        // Collapsed search icon button
        <button
          onClick={handleIconClick}
          className="w-full flex items-center justify-center p-2 border border-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline focus:outline-2 focus:outline-ink"
          title="Search Navigation"
          aria-label="Search Navigation"
        >
          <Search className="w-4 h-4 text-ink stroke-[2]" />
        </button>
      ) : (
        // Expanded input element
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 w-4 h-4 text-inkMuted pointer-events-none stroke-[2]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="FILTER NAV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 border-2 border-ink bg-bgBase font-mono text-xs font-bold uppercase tracking-wider text-ink focus:outline-none focus:border-highlight placeholder-inkMuted"
            aria-label="Search navigation items"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 p-0.5 hover:bg-ink hover:text-bgBase text-ink transition-colors focus:outline focus:outline-1 focus:outline-ink"
              title="Clear Search"
              aria-label="Clear Search"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
