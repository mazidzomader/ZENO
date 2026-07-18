import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import Layout from "../../components/Layout";

function getBuildingDetails(slot) {
  const building = slot.building || slot.buildingId;

  if (building && typeof building === "object") {
    return {
      name: building.name || "Building information unavailable",
      address: building.address || "Address unavailable",
    };
  }

  return {
    name: slot.buildingName || "Building information unavailable",
    address: slot.address || "Address unavailable",
  };
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

function BrowseSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");

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
              Browse available parking spaces by building, address, floor,
              vehicle size and parking type.
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

          <div className="mt-6 flex items-center justify-between border-b-2 border-black pb-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
              Available spaces
            </h2>

            <span className="font-mono text-xs uppercase">
              {filteredSlots.length} result(s)
            </span>
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

          {!loading && !error && filteredSlots.length === 0 && (
            <div className="mt-8 border-2 border-black bg-white p-8 text-center">
              <p className="font-mono font-bold uppercase">
                No available spaces found
              </p>
              <p className="mt-2 font-mono text-sm">
                Change the search text or filter settings.
              </p>
            </div>
          )}

          {!loading && !error && filteredSlots.length > 0 && (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSlots.map((slot) => {
                const building = getBuildingDetails(slot);
                const slotId =
                  slot._id ||
                  slot.id ||
                  `${slot.slotNumber}-${slot.floor}`;

                const hourlyRate =
                  slot.rateHour ?? slot.ratehour ?? slot.hourlyRate ?? "—";

                const dailyRate =
                  slot.rateDay ?? slot.rateday ?? slot.dailyRate ?? "—";

                const monthlyRate =
                  slot.rateMonth ?? slot.ratemonth ?? slot.monthlyRate ?? "—";

                return (
                  <article
                    key={slotId}
                    className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_#111111]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest">
                          Parking slot
                        </p>

                        <h3 className="mt-1 text-3xl font-black uppercase">
                          {slot.slotNumber || "Unnamed"}
                        </h3>
                      </div>

                      <span className="border border-black bg-green-100 px-3 py-1 font-mono text-xs font-bold uppercase">
                        {slot.status || "Available"}
                      </span>
                    </div>

                    <div className="mt-5 border-t-2 border-black pt-4">
                      <h4 className="text-xl font-bold">{building.name}</h4>
                      <p className="mt-1 font-mono text-sm">
                        {building.address}
                      </p>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-sm">
                      <div className="border border-black p-3">
                        <dt className="text-xs uppercase text-gray-600">
                          Floor
                        </dt>
                        <dd className="mt-1 font-bold">
                          {slot.floor ?? "—"}
                        </dd>
                      </div>

                      <div className="border border-black p-3">
                        <dt className="text-xs uppercase text-gray-600">
                          Type
                        </dt>
                        <dd className="mt-1 font-bold uppercase">
                          {slot.type || "—"}
                        </dd>
                      </div>

                      <div className="border border-black p-3">
                        <dt className="text-xs uppercase text-gray-600">
                          Vehicle size
                        </dt>
                        <dd className="mt-1 font-bold uppercase">
                          {slot.sizeClass || slot.size || "—"}
                        </dd>
                      </div>

                      <div className="border border-black p-3">
                        <dt className="text-xs uppercase text-gray-600">
                          Dimensions
                        </dt>
                        <dd className="mt-1 font-bold">
                          {slot.dimensions || "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 border-t-2 border-black pt-4">
                      <p className="font-mono text-xs font-bold uppercase tracking-widest">
                        Rental rates
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="border border-black p-2">
                          <p className="text-xs uppercase">Hour</p>
                          <p className="mt-1 font-bold">৳{hourlyRate}</p>
                        </div>

                        <div className="border border-black p-2">
                          <p className="text-xs uppercase">Day</p>
                          <p className="mt-1 font-bold">৳{dailyRate}</p>
                        </div>

                        <div className="border border-black p-2">
                          <p className="text-xs uppercase">Month</p>
                          <p className="mt-1 font-bold">৳{monthlyRate}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default BrowseSlots;