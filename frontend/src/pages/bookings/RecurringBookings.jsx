import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatPattern(series) {
  const days = (series.daysOfWeek || [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");
  const time =
    series.timeStart && series.timeEnd ? `${series.timeStart}–${series.timeEnd}` : "—";
  return `${days || "—"} · ${time}`;
}

// How many occurrences in this series are booked AND still unpaid — drives
// whether the "Pay All" button shows up, and its label.
function getPendingCount(series) {
  return (series.occurrences || []).filter(
    (o) => o.status === "booked" && o.bookingId?.status === "pending"
  ).length;
}

function RecurringBookings() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [payingSeriesId, setPayingSeriesId] = useState(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/recurring-bookings/my");
      setSeries(Array.isArray(res.data?.series) ? res.data.series : []);
    } catch (err) {
      setSeries([]);
      setError(err.response?.data?.message || "Failed to load recurring bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleCancelSeries = async (id) => {
    if (
      !window.confirm(
        "Cancel this entire recurring series? Every upcoming reservation still pending, confirmed, or active will be cancelled and its slot released."
      )
    ) {
      return;
    }
    setActionError("");
    setCancellingId(id);
    try {
      await API.patch(`/recurring-bookings/${id}/cancel`);
      fetchSeries();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cancel recurring series.");
    } finally {
      setCancellingId(null);
    }
  };

  // Bundles every unpaid occurrence in this series into ONE Stripe Checkout
  // session, instead of the renter paying each occurrence one by one from
  // the Payments page.
  const handlePaySeries = async (id) => {
    setActionError("");
    setPayingSeriesId(id);
    try {
      const res = await API.post("/payments/create-bulk-checkout-session", { seriesId: id });
      window.location.href = res.data.url;
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not start bulk payment. Please try again.");
      setPayingSeriesId(null);
    }
  };

  return (
    <main className="p-6 md:p-10">
      <header className="border-b-4 border-black pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Feature — Recurring Bookings
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          Repeating Reservations
        </h1>

        <p className="mt-3 max-w-3xl font-mono text-sm">
          Every recurring series you've created — the same slot, on the same
          days and time window, across a date range — along with how many
          dates were booked versus skipped due to conflicts.
        </p>
      </header>

      <section className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={fetchSeries}
          className="border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
        >
          Refresh
        </button>
        <Link
          to="/bookings/history"
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          All Bookings →
        </Link>
        <Link
          to="/payments"
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          Pay Bookings →
        </Link>
      </section>

      {actionError && (
        <div className="mt-6 border-2 border-red-700 p-3 font-mono text-xs font-bold uppercase text-red-700">
          {actionError}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
            Series
          </h2>
          {!loading && (
            <span className="font-mono text-xs font-bold uppercase">
              {series.length} result(s)
            </span>
          )}
        </div>

        {loading && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center font-mono text-sm uppercase">
            Loading recurring bookings...
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 border-2 border-red-700 p-5 font-mono text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {!loading && !error && series.length === 0 && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center">
            <p className="font-mono text-sm font-bold uppercase">
              No recurring bookings yet
            </p>
            <p className="mt-2 font-mono text-xs">
              Open any slot's booking page and switch to "Repeating Booking"
              to reserve the same slot on multiple days at once.
            </p>
          </div>
        )}

        {!loading && !error && series.length > 0 && (
          <div className="mt-5 overflow-x-auto border-2 border-black bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="bg-black font-mono text-xs uppercase text-white">
                <tr>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Pattern</th>
                  <th className="p-3">Date Range</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Booked</th>
                  <th className="p-3">Skipped</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => {
                  const isExpanded = expandedId === s._id;
                  const slot = s.slotId;
                  const pendingCount = getPendingCount(s);
                  return (
                    <>
                      <tr key={s._id} className="border-b border-black font-mono text-xs">
                        <td className="p-3 font-bold">
                          {slot?.slotNumber || "—"}
                          {slot?.building?.name ? (
                            <div className="text-gray-500 font-normal">{slot.building.name}</div>
                          ) : null}
                        </td>
                        <td className="p-3">{formatPattern(s)}</td>
                        <td className="p-3">
                          {formatDate(s.seriesStartDate)} → {formatDate(s.seriesEndDate)}
                        </td>
                        <td
                          className={`p-3 font-bold uppercase ${
                            s.status === "cancelled" ? "text-red-700" : "text-green-700"
                          }`}
                        >
                          {s.status}
                        </td>
                        <td className="p-3 font-bold">{s.bookedCount}</td>
                        <td className="p-3 font-bold">{s.skippedCount}</td>
                        <td className="p-3">{formatDateTime(s.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(s._id)}
                              className="border-2 border-black px-3 py-1 font-bold uppercase hover:bg-black hover:text-white"
                            >
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                            {s.status === "active" && pendingCount > 0 && (
                              <button
                                type="button"
                                onClick={() => handlePaySeries(s._id)}
                                disabled={payingSeriesId === s._id}
                                className="border-2 border-black bg-black px-3 py-1 font-bold uppercase text-white hover:bg-white hover:text-black disabled:opacity-60"
                              >
                                {payingSeriesId === s._id ? "Redirecting…" : `Pay All (${pendingCount}) →`}
                              </button>
                            )}
                            {s.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleCancelSeries(s._id)}
                                disabled={cancellingId === s._id}
                                className="border-2 border-red-700 px-3 py-1 font-bold uppercase text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-60"
                              >
                                {cancellingId === s._id ? "..." : "Cancel Series"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${s._id}-detail`} className="border-b border-black bg-gray-50">
                          <td colSpan={8} className="p-4 font-mono text-xs">
                            <p className="text-gray-500 uppercase text-[10px] mb-2">
                              Occurrence breakdown ({(s.occurrences || []).length} date(s))
                            </p>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                              {(s.occurrences || []).map((o, i) => {
                                const liveStatus =
                                  o.status === "booked" ? o.bookingId?.status || "unknown" : null;
                                return (
                                  <div
                                    key={i}
                                    className="flex flex-wrap items-center justify-between border-b border-gray-200 py-1 gap-2"
                                  >
                                    <span>
                                      {formatDateTime(o.startTime)} → {formatDateTime(o.endTime)}
                                    </span>
                                    <span
                                      className={`font-bold uppercase ${
                                        o.status === "booked"
                                          ? liveStatus === "cancelled"
                                            ? "text-red-700"
                                            : "text-green-700"
                                          : "text-red-700"
                                      }`}
                                    >
                                      {o.status === "booked"
                                        ? `Reserved — ${liveStatus}`
                                        : `Skipped${o.reason ? ` (${o.reason})` : ""}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default RecurringBookings;