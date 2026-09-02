import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

function getBuildingDetails(slot) {
  const building = slot.building || slot.buildingId;

  if (building && typeof building === "object") {
    return {
      id: building._id || building.id || null,
      name: building.name || "Building information unavailable",
      address: building.address || "Address unavailable",
    };
  }

  return {
    id: typeof building === "string" ? building : null,
    name: slot.buildingName || "Building information unavailable",
    address: slot.address || "Address unavailable",
  };
}

function getOwnerDetails(slot) {
  const owner = slot.owner;

  if (owner && typeof owner === "object") {
    return {
      name: owner.name || "Owner information unavailable",
      email: owner.email || "",
      phone: owner.phone || "",
    };
  }

  return null;
}

function normalizeSlots(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.slots)) {
    return responseData.slots;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function formatDimensions(dimensions) {
  if (!dimensions) return "—";

  if (typeof dimensions === "string") {
    return dimensions;
  }

  if (typeof dimensions === "object") {
    const { length, width } = dimensions;

    if (length !== undefined && width !== undefined) {
      return `${length ?? "—"} × ${width ?? "—"}`;
    }
  }

  return "—";
}

function SlotCard({ slot }) {
  const slotId = slot._id || slot.id || `${slot.slotNumber}-${slot.floor}`;

  const hourlyRate = slot.pricePerHour ?? "—";
  const dailyRate = slot.pricePerDay ?? "—";
  const monthlyRate = slot.pricePerMonth ?? "—";

  const isAvailable =
    String(slot.status || "available").toLowerCase() === "available";

  return (
    <article className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#111111] flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Slot
          </p>
          <h3 className="mt-0.5 text-2xl font-black uppercase">
            {slot.slotNumber || "Unnamed"}
          </h3>
        </div>

        <span className="border border-black bg-green-100 px-2 py-1 font-mono text-[10px] font-bold uppercase">
          {slot.status || "Available"}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="border border-black p-2">
          <dt className="text-[10px] uppercase text-gray-600">Floor</dt>
          <dd className="mt-0.5 font-bold">{slot.floor ?? "—"}</dd>
        </div>

        <div className="border border-black p-2">
          <dt className="text-[10px] uppercase text-gray-600">Type</dt>
          <dd className="mt-0.5 font-bold uppercase">{slot.type || "—"}</dd>
        </div>

        <div className="border border-black p-2">
          <dt className="text-[10px] uppercase text-gray-600">Vehicle size</dt>
          <dd className="mt-0.5 font-bold uppercase">
            {slot.sizeClass || slot.size || "—"}
          </dd>
        </div>

        <div className="border border-black p-2">
          <dt className="text-[10px] uppercase text-gray-600">Dimensions</dt>
          <dd className="mt-0.5 font-bold">{formatDimensions(slot.dimensions)}</dd>
        </div>
      </dl>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
        <div className="border border-black p-1.5">
          <p className="text-[9px] uppercase">Hour</p>
          <p className="mt-0.5 font-bold text-xs">৳{hourlyRate}</p>
        </div>
        <div className="border border-black p-1.5">
          <p className="text-[9px] uppercase">Day</p>
          <p className="mt-0.5 font-bold text-xs">৳{dailyRate}</p>
        </div>
        <div className="border border-black p-1.5">
          <p className="text-[9px] uppercase">Month</p>
          <p className="mt-0.5 font-bold text-xs">৳{monthlyRate}</p>
        </div>
      </div>

      <div className="mt-3 mt-auto pt-3">
        {isAvailable ? (
          <Link
            to={`/slots/${slotId}/book`}
            className="block w-full border-2 border-black bg-black py-2.5 text-center font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-none"
          >
            Book Now
          </Link>
        ) : (
          <div className="block w-full border-2 border-black bg-gray-200 py-2.5 text-center font-mono text-xs font-bold uppercase text-gray-500">
            Not Available
          </div>
        )}
      </div>
    </article>
  );
}

function BuildingGroup({ group, isOpen, onToggle }) {
  const { building, owner, slots } = group;
  const availableCount = slots.filter(
    (s) => String(s.status || "available").toLowerCase() === "available"
  ).length;

  return (
    <div className="border-2 border-black bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#f4f2ed] transition-none"
      >
        <div>
          <h3 className="text-2xl font-black uppercase">{building.name}</h3>
          <p className="mt-1 font-mono text-sm text-gray-600">
            {building.address}
          </p>

          {owner && (
            <p className="mt-2 font-mono text-xs text-gray-500">
              Managed by{" "}
              <span className="font-bold text-gray-700">{owner.name}</span>
              {owner.phone ? ` · ${owner.phone}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right font-mono">
            <p className="text-xs uppercase text-gray-600">
              {slots.length} slot{slots.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs font-bold uppercase text-green-700">
              {availableCount} available
            </p>
          </div>

          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black font-mono text-lg font-bold transition-transform ${
              isOpen ? "rotate-45" : ""
            }`}
            aria-hidden="true"
          >
            +
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t-2 border-black p-5">
          {owner && (
            <div className="mb-5 border-2 border-black bg-[#f4f2ed] p-4 font-mono text-xs">
              <p className="font-bold uppercase tracking-widest text-gray-600">
                Building owner
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Name</p>
                  <p className="font-bold">{owner.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Email</p>
                  <p className="font-bold break-all">{owner.email || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Phone</p>
                  <p className="font-bold">{owner.phone || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => (
              <SlotCard key={slot._id || slot.id || `${slot.slotNumber}-${slot.floor}`} slot={slot} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BrowseSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [openBuildings, setOpenBuildings] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadSlots() {
      try {
        setLoading(true);
        setError("");

        const response = await API.get("/slots");

        if (isMounted) {
          setSlots(normalizeSlots(response.data));
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load parking spaces. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSlots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return slots.filter((slot) => {
      const building = getBuildingDetails(slot);
      const status = String(slot.status || "").toLowerCase();
      const type = String(slot.type || "").toLowerCase();
      const size = String(slot.sizeClass || slot.size || "").toLowerCase();

      // Feature 01 shows available parking spaces only.
      if (status && status !== "available") {
        return false;
      }

      if (typeFilter && type !== typeFilter.toLowerCase()) {
        return false;
      }

      if (sizeFilter && size !== sizeFilter.toLowerCase()) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableValues = [
        building.name,
        building.address,
        slot.slotNumber,
        slot.floor,
        slot.type,
        slot.sizeClass,
        slot.dimensions,
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [slots, search, typeFilter, sizeFilter]);

  // Group the filtered slots by building so each building appears once.
  const buildingGroups = useMemo(() => {
    const map = new Map();

    filteredSlots.forEach((slot) => {
      const building = getBuildingDetails(slot);
      const key = building.id || `${building.name}__${building.address}`;

      if (!map.has(key)) {
        map.set(key, { key, building, owner: getOwnerDetails(slot), slots: [] });
      }

      const group = map.get(key);

      // Fill in owner details if this group didn't have them yet
      // (in case the first slot processed had no populated owner).
      if (!group.owner) {
        group.owner = getOwnerDetails(slot);
      }

      group.slots.push(slot);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.building.name.localeCompare(b.building.name)
    );
  }, [filteredSlots]);

  const toggleBuilding = (key) => {
    setOpenBuildings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const next = {};
    buildingGroups.forEach((group) => {
      next[group.key] = true;
    });
    setOpenBuildings(next);
  };

  const collapseAll = () => setOpenBuildings({});

  return (
    <Layout>
      <main className="min-h-screen bg-[#eceae5] px-6 py-10 text-[#111111]">
        <section className="mx-auto max-w-7xl">
          <div className="border-b-4 border-black pb-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em]">
              Feature 01 // Listing & Browsing
            </p>

            <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
              Find a Parking Space
            </h1>

            <p className="mt-4 max-w-3xl font-mono text-sm leading-6">
              Browse available parking spaces grouped by building. Expand a
              building to see and book its individual slots.
            </p>
          </div>

          <section className="mt-8 border-2 border-black bg-white p-5">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
              Search and filter
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="slot-search"
                  className="mb-2 block font-mono text-xs font-bold uppercase"
                >
                  Search
                </label>

                <input
                  id="slot-search"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Building, address or slot number"
                  className="w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="type-filter"
                  className="mb-2 block font-mono text-xs font-bold uppercase"
                >
                  Parking type
                </label>

                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm outline-none"
                >
                  <option value="">All types</option>
                  <option value="covered">Covered</option>
                  <option value="open">Open</option>
                  <option value="standard">Standard</option>
                  <option value="compact">Compact</option>
                  <option value="large">Large</option>
                  <option value="handicap">Handicap</option>
                  <option value="ev">EV</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="size-filter"
                  className="mb-2 block font-mono text-xs font-bold uppercase"
                >
                  Vehicle size
                </label>

                <select
                  id="size-filter"
                  value={sizeFilter}
                  onChange={(event) => setSizeFilter(event.target.value)}
                  className="w-full border-2 border-black bg-white px-4 py-3 font-mono text-sm outline-none"
                >
                  <option value="">All sizes</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="compact">Compact</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="large">Large vehicle</option>
                </select>
              </div>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
              Buildings
            </h2>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase">
                {buildingGroups.length} building(s) · {filteredSlots.length} slot(s)
              </span>

              {buildingGroups.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="border-2 border-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase hover:bg-black hover:text-white"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="border-2 border-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase hover:bg-black hover:text-white"
                  >
                    Collapse all
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="mt-8 border-2 border-black bg-white p-8 text-center font-mono">
              Loading available parking spaces...
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 border-2 border-red-700 bg-white p-6 font-mono text-red-700">
              <p className="font-bold uppercase">Unable to load spaces</p>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && buildingGroups.length === 0 && (
            <div className="mt-8 border-2 border-black bg-white p-8 text-center">
              <p className="font-mono font-bold uppercase">
                No available spaces found
              </p>
              <p className="mt-2 font-mono text-sm">
                Change the search text or filter settings.
              </p>
            </div>
          )}

          {!loading && !error && buildingGroups.length > 0 && (
            <div className="mt-6 space-y-4">
              {buildingGroups.map((group) => (
                <BuildingGroup
                  key={group.key}
                  group={group}
                  isOpen={!!openBuildings[group.key]}
                  onToggle={() => toggleBuilding(group.key)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default BrowseSlots;