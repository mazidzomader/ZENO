import { useCallback, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../../services/api";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString()}`;
}

const statusColor = (status) => {
  if (status === "completed") return "text-green-700";
  if (status === "cancelled") return "text-red-700";
  if (status === "active") return "text-purple-700";
  if (status === "pending") return "text-yellow-700";
  return "text-black";
};

function OwnerBookings() {
  const [searchParams] = useSearchParams();
  const slotIdFromUrl = searchParams.get("slot") || "";

  const [bookings, setBookings] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [buildingFilter, setBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState(slotIdFromUrl);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await API.get("/buildings/mine");
      setBuildings(res.data.buildings || []);
    } catch {
      // non-critical — filter dropdown just won't populate
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (buildingFilter) params.building = buildingFilter;
      if (statusFilter) params.status = statusFilter;
      if (slotFilter) params.slot = slotFilter;

      const res = await API.get("/bookings/owner", { params });
      setBookings(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
    } catch (err) {
      setBookings([]);
      setError(err.response?.data?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [buildingFilter, statusFilter, slotFilter]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const clearFilters = () => {
    setBuildingFilter("");
    setStatusFilter("");
    setSlotFilter("");
  };

  const hasActiveFilters = buildingFilter || statusFilter || slotFilter;

  return (
    <main className="p-6 md:p-10">
      <header className="border-b-4 border-black pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Owner // Slot Bookings
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          Who's Renting My Slots
        </h1>

        <p className="mt-3 max-w-3xl font-mono text-sm">
          See every renter currently or previously booked into your slots —
          name, contact info, vehicle, and time range — across all your
          buildings.
        </p>
      </header>

      <section className="mt-8 border-2 border-black bg-white p-5">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
          Filter records
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="font-mono text-xs font-bold uppercase">
            Building
            <select
              className="mt-2 w-full border-2 border-black bg-white p-3"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="font-mono text-xs font-bold uppercase">
            Status
            <select
              className="mt-2 w-full border-2 border-black bg-white p-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="font-mono text-xs font-bold uppercase">
            Slot ID{" "}
            <span className="normal-case text-gray-500">(optional, exact match)</span>
            <input
              className="mt-2 w-full border-2 border-black bg-white p-3"
              type="text"
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              placeholder="Leave blank for all slots"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase text-white"
            onClick={fetchBookings}
          >
            Refresh
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
            Bookings
          </h2>
          <span className="font-mono text-xs font-bold uppercase">
            {bookings.length} result(s)
          </span>
        </div>

        {loading && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center font-mono text-sm uppercase">
            Loading bookings...
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 border-2 border-red-700 p-5 font-mono text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center">
            <p className="font-mono text-sm font-bold uppercase">
              No bookings found
            </p>
            <p className="mt-2 font-mono text-xs">
              No renters have booked into these slots yet, or none match your filters.
            </p>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="mt-5 overflow-x-auto border-2 border-black bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="bg-black font-mono text-xs uppercase text-white">
                <tr>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Building</th>
                  <th className="p-3">Renter</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const slot = booking.slotId;
                  const renter = booking.renterId;
                  const vehicle = booking.vehicleId;

                  return (
                    <tr
                      key={booking._id}
                      className="border-b border-black font-mono text-xs"
                    >
                      <td className="p-3 font-bold">
                        {slot?.slotNumber || "—"}
                      </td>

                      <td className="p-3">
                        {slot?.building?.name || "—"}
                      </td>

                      <td className="p-3 font-bold">
                        {renter?.name || "Unknown renter"}
                      </td>

                      <td className="p-3">
                        <div>{renter?.email || "—"}</div>
                        <div className="text-gray-500">{renter?.phone || "—"}</div>
                      </td>

                      <td className="p-3">
                        {vehicle
                          ? `${vehicle.plateNumber} (${vehicle.type})`
                          : "—"}
                      </td>

                      <td className="p-3">{formatDateTime(booking.startTime)}</td>
                      <td className="p-3">{formatDateTime(booking.endTime)}</td>

                      <td className={`p-3 font-bold uppercase ${statusColor(booking.status)}`}>
                        {booking.status || "Unknown"}
                      </td>

                      <td className="p-3 font-bold">
                        {formatAmount(booking.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8">
        <Link to="/slots/mine" className="underline font-mono text-sm">
          &larr; Back to My Slots
        </Link>
      </div>
    </main>
  );
}

export default OwnerBookings;