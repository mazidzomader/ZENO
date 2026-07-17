import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

const SLOT_TYPES = ["standard", "compact", "large", "handicap", "ev"];
const STATUSES = ["available", "occupied", "reserved", "inactive"];

function MySlots() {
  const [slots, setSlots] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [filters, setFilters] = useState({
    building: "",
    floor: "",
    type: "",
    status: "",
    search: "",
  });

  // Live, rule-adjusted hourly price per slot — keyed by slot id. Computed
  // client-side by calling the same /pricing-rules/calculate endpoint the
  // pricing preview uses, so this table always reflects active rules.
  const [livePrices, setLivePrices] = useState({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchBuildings = async () => {
    try {
      const res = await API.get("/buildings/mine");
      setBuildings(res.data.buildings);
    } catch {
      // non-critical — filter dropdown just won't populate
    }
  };

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.building) params.building = filters.building;
      if (filters.floor) params.floor = filters.floor;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const res = await API.get("/slots/mine", { params });
      setSlots(res.data.slots);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load slots.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchLivePrices = useCallback(async (slotList) => {
    if (!slotList || slotList.length === 0) {
      setLivePrices({});
      return;
    }
    setPricingLoading(true);
    try {
      const results = await Promise.allSettled(
        slotList.map((s) =>
          API.get(`/pricing-rules/calculate/${s._id}`, { params: { unit: "hour" } })
        )
      );
      const next = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          next[slotList[i]._id] = r.value.data;
        }
        // On failure (e.g. slot has no hourly rate) we just leave that slot
        // out — the table falls back to showing base price only.
      });
      setLivePrices(next);
      setLastRefreshed(new Date());
    } finally {
      setPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    // small debounce so the search box doesn't fire a request per keystroke
    const timeout = setTimeout(() => {
      fetchSlots();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchSlots]);

  useEffect(() => {
    fetchLivePrices(slots);
  }, [slots, fetchLivePrices]);

  // Prices depend on the clock (time-of-day rules) and on live occupancy
  // (demand rules), both of which can change even while the slot list
  // itself stays the same — so re-check periodically, not just on load.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLivePrices(slots);
    }, 30000);
    return () => clearInterval(interval);
  }, [slots, fetchLivePrices]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ building: "", floor: "", type: "", status: "", search: "" });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const handleToggleStatus = async (slot) => {
    setActionError("");
    try {
      const endpoint =
        slot.status === "inactive"
          ? `/slots/${slot._id}/activate`
          : `/slots/${slot._id}/deactivate`;
      await API.patch(endpoint);
      fetchSlots();
    } catch (err) {
      setActionError(err.response?.data?.message || "Action failed.");
    }
  };

  const handleDelete = async (slot) => {
    if (
      !window.confirm(
        `Permanently delete slot "${slot.slotNumber}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setActionError("");
    try {
      await API.delete(`/slots/${slot._id}`);
      fetchSlots();
    } catch (err) {
      setActionError(err.response?.data?.message || "Delete failed.");
    }
  };

  const statusColor = (status) => {
    if (status === "available") return "text-safe";
    if (status === "inactive") return "text-alert";
    return "text-highlight";
  };

  const filterInputClass =
    "border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            My Parking Slots
          </h1>
          <div className="flex gap-3">
            <Link
              to="/slots/bulk"
              className="bg-bgBase text-ink font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight"
            >
              + Bulk Generate
            </Link>
            <Link
              to="/slots/new"
              className="bg-ink text-bgBase font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink"
            >
              + New Slot
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="border-4 border-ink bg-bgAlt p-4 mb-4 flex flex-wrap gap-3 items-end font-mono text-xs">
          <div className="flex flex-col">
            <label className="uppercase font-bold mb-1">Search</label>
            <input
              type="text"
              name="search"
              placeholder="Slot number..."
              value={filters.search}
              onChange={handleFilterChange}
              className={`${filterInputClass} w-40`}
            />
          </div>

          <div className="flex flex-col">
            <label className="uppercase font-bold mb-1">Building</label>
            <select
              name="building"
              value={filters.building}
              onChange={handleFilterChange}
              className={`${filterInputClass} bg-bgBase`}
            >
              <option value="">All</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="uppercase font-bold mb-1">Floor</label>
            <input
              type="number"
              name="floor"
              value={filters.floor}
              onChange={handleFilterChange}
              className={`${filterInputClass} w-20`}
            />
          </div>

          <div className="flex flex-col">
            <label className="uppercase font-bold mb-1">Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className={`${filterInputClass} bg-bgBase`}
            >
              <option value="">All</option>
              {SLOT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="uppercase font-bold mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className={`${filterInputClass} bg-bgBase`}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="border-2 border-alert text-alert px-3 py-2 uppercase font-bold hover:bg-alert hover:text-bgBase"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <p className="font-mono text-xs text-inkMuted uppercase">
            {loading ? "[LOADING...]" : `Showing ${slots.length} slot${slots.length !== 1 ? "s" : ""}`}
            {lastRefreshed && (
              <span> — prices as of {lastRefreshed.toLocaleTimeString()}</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => fetchLivePrices(slots)}
            disabled={pricingLoading || slots.length === 0}
            className="border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase hover:bg-highlight disabled:opacity-60"
          >
            {pricingLoading ? "Refreshing..." : "Refresh Prices"}
          </button>
        </div>

        {actionError && (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            [ERR] {actionError}
          </div>
        )}

        {loading ? null : error ? (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
            [ERR] {error}
          </div>
        ) : slots.length === 0 ? (
          <div className="border-4 border-ink bg-bgAlt p-10 text-center font-mono uppercase text-sm text-inkMuted">
            {hasActiveFilters ? (
              "No slots match these filters."
            ) : (
              <>
                No slots yet.{" "}
                <Link to="/slots/new" className="text-ink font-bold underline">
                  Create your first one
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <div className="border-4 border-ink bg-bgBase overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="bg-ink text-bgBase uppercase text-left">
                  <th className="px-4 py-3">Slot #</th>
                  <th className="px-4 py-3">Building</th>
                  <th className="px-4 py-3">Floor</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">Base Rate/Hr</th>
                  <th className="px-4 py-3">Live Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id} className="border-t-2 border-ink">
                    <td className="px-4 py-3 font-bold">{slot.slotNumber}</td>
                    <td className="px-4 py-3">
                      {slot.building?.name || "—"}
                    </td>
                    <td className="px-4 py-3">{slot.floor}</td>
                    <td className="px-4 py-3 uppercase">{slot.type}</td>
                    <td className="px-4 py-3">
                      {slot.dimensions?.length}x{slot.dimensions?.width} ft
                    </td>
                    <td className="px-4 py-3">${slot.pricePerHour}</td>
                    <td className="px-4 py-3">
                      {pricingLoading && !livePrices[slot._id] ? (
                        <span className="text-inkMuted">...</span>
                      ) : livePrices[slot._id] ? (
                        <div className="flex flex-col gap-1">
                          {livePrices[slot._id].finalPrice !== livePrices[slot._id].basePrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-inkMuted line-through">
                                ${livePrices[slot._id].basePrice}
                              </span>
                              <span
                                className={`font-bold ${
                                  livePrices[slot._id].finalPrice > livePrices[slot._id].basePrice
                                    ? "text-safe"
                                    : "text-alert"
                                }`}
                              >
                                {livePrices[slot._id].finalPrice > livePrices[slot._id].basePrice
                                  ? "▲"
                                  : "▼"}{" "}
                                ${livePrices[slot._id].finalPrice}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold">${livePrices[slot._id].finalPrice}</span>
                          )}
                          {livePrices[slot._id].appliedRules.length > 0 && (
                            <Link
                              to={`/pricing-rules?slot=${slot._id}`}
                              className="underline text-[10px] text-inkMuted hover:text-ink normal-case"
                            >
                              {livePrices[slot._id].appliedRules.length} rule
                              {livePrices[slot._id].appliedRules.length !== 1 ? "s" : ""} active
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-inkMuted">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-bold uppercase ${statusColor(slot.status)}`}>
                      {slot.status}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/slots/${slot._id}/edit`}
                          className="border-2 border-ink px-3 py-1 hover:bg-ink hover:text-bgBase uppercase"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/pricing-rules?slot=${slot._id}`}
                          className="border-2 border-ink px-3 py-1 hover:bg-highlight uppercase"
                        >
                          Pricing
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(slot)}
                          className="border-2 border-ink px-3 py-1 hover:bg-highlight uppercase"
                        >
                          {slot.status === "inactive" ? "Activate" : "Deactivate"}
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          className="border-2 border-alert text-alert px-3 py-1 hover:bg-alert hover:text-bgBase uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default MySlots;