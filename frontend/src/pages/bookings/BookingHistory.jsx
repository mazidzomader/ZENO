import { useCallback, useEffect, useState } from "react";
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

  return `৳${amount.toLocaleString()}`;
}

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                  <th className="p-3">Slot ID</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="border-b border-black font-mono text-xs"
                  >
                    <td className="p-3">
                      {String(booking._id || "—")}
                    </td>

                    <td className="p-3">
                      {String(booking.slotId || "—")}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default BookingHistory;

