import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function formatAmount(value) {
  const amount = Number(value || 0);

  return `$${amount.toLocaleString()}`;
}

// Statuses a renter/admin is still allowed to cancel from, per the backend's
// cancelBooking guard (only "cancelled" and "completed" are blocked).
const CANCELLABLE_STATUSES = ["pending", "confirmed", "active"];

// Only a booking that's actually live right now (paid, or checked in) can
// be extended — matches the guard in paymentRoutes.js's create-extend-session.
const EXTENDABLE_STATUSES = ["confirmed", "active"];

// How many hours a renter can pick from in the extend dropdown.
// Keep this <= MAX_EXTEND_HOURS in backend/routes/paymentRoutes.js.
const EXTEND_HOUR_OPTIONS = [1, 2, 3, 4, 5, 6];

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [extendingId, setExtendingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Tracks the currently-selected "hours to extend by" per booking row.
  // Defaults to 1 hour for any booking not yet touched.
  const [extendHoursById, setExtendHoursById] = useState({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (status !== "all") {
        params.status = status;
      }

      if (fromDate) {
        params.from = fromDate;
      }

      if (toDate) {
        params.to = toDate;
      }

      const response = await API.get("/bookings/history", {
        params,
      });

      setBookings(
        Array.isArray(response.data?.bookings)
          ? response.data.bookings
          : []
      );
    } catch (requestError) {
      setBookings([]);

      setError(
        requestError.response?.data?.message ||
          "Failed to load booking history."
      );
    } finally {
      setLoading(false);
    }
  }, [status, fromDate, toDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const clearFilters = () => {
    setStatus("all");
    setFromDate("");
    setToDate("");
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel this booking? The slot will become available again.")) {
      return;
    }
    setActionError("");
    setCancellingId(bookingId);
    try {
      await API.patch(`/bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const getExtendHours = (bookingId) => extendHoursById[bookingId] || 1;

  const setExtendHours = (bookingId, hours) => {
    setExtendHoursById((current) => ({ ...current, [bookingId]: hours }));
  };

  // "Extend my stay" — renter picks how many hours from the dropdown, we ask
  // the backend for a quote + Stripe checkout session for that many hours,
  // confirm the price, then redirect to Stripe. No full booking form needed.
  const handleExtend = async (bookingId) => {
    const hours = getExtendHours(bookingId);

    setActionError("");
    setExtendingId(bookingId);
    try {
      const res = await API.post("/payments/create-extend-session", {
        bookingId,
        hours,
      });

      const { url, extraAmount, newEndTime, hours: confirmedHours } = res.data;

      const confirmed = window.confirm(
        `Extend this booking by ${confirmedHours} hour(s) (until ${new Date(
          newEndTime
        ).toLocaleString()}) for $${extraAmount}?\n\nYou'll be redirected to Stripe to pay.`
      );

      if (!confirmed) {
        setExtendingId(null);
        return;
      }

      window.location.href = url;
    } catch (err) {
      setActionError(
        err.response?.data?.error ||
          "Could not extend this booking. That many hours may already be booked on this slot."
      );
      setExtendingId(null);
    }
  };

  const toggleExpanded = (bookingId) => {
    setExpandedId((current) => (current === bookingId ? null : bookingId));
  };

  return (
    <main className="p-6 md:p-10">
      <header className="border-b-4 border-black pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Feature 06 // Booking History
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          My Bookings
        </h1>

        <p className="mt-3 max-w-3xl font-mono text-sm">
          Review current and previous parking reservations by date,
          status, slot and total amount.
        </p>
      </header>

      <section className="mt-8 border-2 border-black bg-white p-5">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
          Filter records
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="font-mono text-xs font-bold uppercase">
            Status
            <select
              className="mt-2 w-full border-2 border-black bg-white p-3"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="font-mono text-xs font-bold uppercase">
            From date
            <input
              className="mt-2 w-full border-2 border-black bg-white p-3"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label className="font-mono text-xs font-bold uppercase">
            To date
            <input
              className="mt-2 w-full border-2 border-black bg-white p-3"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase text-white"
            onClick={fetchBookings}
          >
            Refresh records
          </button>

          <button
            type="button"
            className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
            Booking records
          </h2>

          <span className="font-mono text-xs font-bold uppercase">
            {bookings.length} result(s)
          </span>
        </div>

        {loading && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center font-mono text-sm uppercase">
            Loading booking history...
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 border-2 border-red-700 p-5 font-mono text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {actionError && (
          <div className="mt-5 border-2 border-red-700 p-3 font-mono text-xs font-bold uppercase text-red-700">
            {actionError}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center">
            <p className="font-mono text-sm font-bold uppercase">
              No booking records found
            </p>

            <p className="mt-2 font-mono text-xs">
              Your new renter account does not currently have any
              bookings.
            </p>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="mt-5 overflow-x-auto border-2 border-black bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="bg-black font-mono text-xs uppercase text-white">
                <tr>
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Series</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Pricing</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => {
                  const snapshot = booking.pricingSnapshot;
                  const isExpanded = expandedId === booking._id;
                  const canExtend = EXTENDABLE_STATUSES.includes(booking.status);

                  return (
                    <>
                      <tr
                        key={booking._id}
                        className="border-b border-black font-mono text-xs"
                      >
                        <td className="p-3">
                          {String(booking._id || "—")}
                        </td>

                        <td className="p-3">
                          <div className="font-bold">
                            {booking.slotId?.slotNumber || "—"}
                          </div>
                          <div className="text-gray-500">
                            {booking.slotId?.building?.name || "—"}
                          </div>
                        </td>

                      

                        <td className="p-3">
                          {booking.seriesId ? (
                            <Link
                              to="/bookings/recurring"
                              className="underline font-bold uppercase text-purple-700"
                              title="Part of a recurring booking series"
                            >
                              Recurring
                            </Link>
                          ) : (
                            <span className="text-gray-400">One-time</span>
                          )}
                        </td>

                        <td className="p-3">
                          {formatDateTime(booking.startTime)}
                        </td>

                        <td className="p-3">
                          {formatDateTime(booking.endTime)}
                        </td>

                        <td className="p-3 font-bold uppercase">
                          {booking.status || "Unknown"}
                        </td>

                        <td className="p-3 font-bold">
                          {formatAmount(booking.totalAmount)}
                        </td>

                        <td className="p-3">
                          {snapshot ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(booking._id)}
                              className="underline font-bold uppercase"
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {canExtend && (
                              <>
                                <select
                                  value={getExtendHours(booking._id)}
                                  onChange={(event) =>
                                    setExtendHours(booking._id, Number(event.target.value))
                                  }
                                  disabled={extendingId === booking._id}
                                  className="border-2 border-black p-1 font-bold uppercase disabled:opacity-60"
                                  title="Hours to extend by"
                                >
                                  {EXTEND_HOUR_OPTIONS.map((h) => (
                                    <option key={h} value={h}>
                                      {h}hr
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleExtend(booking._id)}
                                  disabled={extendingId === booking._id}
                                  className="border-2 border-black px-3 py-1 font-bold uppercase hover:bg-black hover:text-white disabled:opacity-60"
                                >
                                  {extendingId === booking._id ? "..." : "Extend"}
                                </button>
                              </>
                            )}

                            {CANCELLABLE_STATUSES.includes(booking.status) ? (
                              <button
                                type="button"
                                onClick={() => handleCancel(booking._id)}
                                disabled={cancellingId === booking._id}
                                className="border-2 border-red-700 px-3 py-1 font-bold uppercase text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-60"
                              >
                                {cancellingId === booking._id ? "..." : "Cancel"}
                              </button>
                            ) : (
                              !canExtend && <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && snapshot && (
                        <tr key={`${booking._id}-detail`} className="border-b border-black bg-gray-50">
                          <td colSpan={9} className="p-4 font-mono text-xs">
                            <div className="flex flex-wrap gap-6">
                              <div>
                                <p className="text-gray-500 uppercase text-[10px]">Base rate / hr</p>
                                <p className="font-bold">${snapshot.basePrice}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 uppercase text-[10px]">
                                  Effective rate / hr
                                </p>
                                <p className="font-bold">${snapshot.effectiveHourlyRate}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 uppercase text-[10px]">Duration</p>
                                <p className="font-bold">{snapshot.durationHours} hr(s)</p>
                              </div>
                            </div>

                            {snapshot.appliedRules?.length > 0 ? (
                              <div className="mt-3 space-y-1">
                                <p className="text-gray-500 uppercase text-[10px] mb-1">
                                  Applied pricing rules
                                </p>
                                {snapshot.appliedRules.map((r) => (
                                  <div key={r.ruleId} className="flex justify-between max-w-md">
                                    <span>{r.name}</span>
                                    <span>
                                      {r.adjustmentType === "percentage"
                                        ? `${r.adjustmentValue > 0 ? "+" : ""}${r.adjustmentValue}%`
                                        : `${r.adjustmentValue > 0 ? "+$" : "-$"}${Math.abs(
                                            r.adjustmentValue
                                          )}`}
                                      {" "}(${r.priceBefore} &rarr; ${r.priceAfter})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-gray-500 uppercase text-[10px]">
                                No dynamic pricing rules applied — base rate charged.
                              </p>
                            )}

                            {snapshot.extensions?.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <p className="text-gray-500 uppercase text-[10px] mb-1">
                                  Extensions
                                </p>
                                {snapshot.extensions.map((ext, i) => (
                                  <div key={i} className="flex justify-between max-w-md">
                                    <span>
                                      +{ext.hours}hr until {formatDateTime(ext.extendedTo)}
                                    </span>
                                    <span>${ext.extraAmount}</span>
                                  </div>
                                ))}
                              </div>
                            )}
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

export default BookingHistory;