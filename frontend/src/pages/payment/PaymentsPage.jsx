// ZENO — Payment Feature: Pending Bookings & Pay Now
// Standalone page at /payments — does NOT modify BookingHistory.jsx

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

// Renders "Xm Ys" remaining until expiresAt, or "Expired" once the deadline
// has passed. `now` is passed in (ticking every second from a parent
// interval) so every row's countdown updates together.
function formatTimeRemaining(expiresAt, now) {
  if (!expiresAt) return "—";
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export default function PaymentsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(null);
  const [usingHours, setUsingHours] = useState(null); // bookingId being paid via hours
  const [subscription, setSubscription] = useState(null); // active subscription
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  // Ticks every second so the "Expires" countdown column stays live without
  // needing to refetch from the server.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingsRes, subRes] = await Promise.all([
        API.get("/payments/pending-bookings"),
        API.get("/subscriptions/my"),
      ]);
      setBookings(Array.isArray(bookingsRes.data?.bookings) ? bookingsRes.data.bookings : []);
      setSubscription(subRes.data?.subscription || null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load pending bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handlePayNow = async (bookingId) => {
    setPaying(bookingId);
    try {
      const res = await API.post("/payments/create-checkout-session", { bookingId });
      setBookings((prev) => prev.filter((b) => String(b._id) !== String(bookingId)));
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || "Could not initiate payment. Please try again.");
      setPaying(null);
    }
  };

  const handleUseHours = async (bookingId) => {
    setUsingHours(bookingId);
    try {
      const res = await API.post("/subscriptions/use-hours", { bookingId });
      // Optimistic removal + update remaining hours
      setBookings((prev) => prev.filter((b) => String(b._id) !== String(bookingId)));
      setSubscription((prev) =>
        prev ? { ...prev, hoursUsed: prev.hoursUsed + res.data.hoursDeducted } : prev
      );
    } catch (err) {
      alert(err.response?.data?.error || "Could not use subscription hours.");
    } finally {
      setUsingHours(null);
    }
  };

  // ── Auto-refresh when user returns to this tab after Stripe ────────────────
  // Covers the case where the user completes or cancels Stripe checkout and
  // lands back here via browser back button instead of the success/cancel page.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPending();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchPending]);

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <header className="border-b-4 border-black pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Feature — Payments
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          Pay Bookings
        </h1>
        <p className="mt-3 max-w-3xl font-mono text-sm">
          All your pending (unpaid) bookings are listed here. Click{" "}
          <strong>Pay Now</strong> to complete payment via Stripe.
        </p>
      </header>

      {/* Actions */}
      <section className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={fetchPending}
          className="border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => navigate("/bookings/history")}
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          All Bookings →
        </button>
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="border-2 border-black bg-white px-5 py-3 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          Invoices →
        </button>
      </section>

      {/* Subscription hours banner */}
      {!loading && subscription && [
        "active",
        "cancelling",
      ].includes(subscription.status) && (() => {
        const remaining = Math.max(0, subscription.hoursTotal - subscription.hoursUsed);
        return (
          <section className="mt-6 border-2 border-black bg-black text-white p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-gray-400">
                {subscription.planName} Plan
              </p>
              <p className="font-mono text-sm font-bold mt-1">
                {remaining.toFixed(1)}h remaining of {subscription.hoursTotal}h this month
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscriptions")}
              className="border-2 border-white px-4 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
            >
              Manage Plan →
            </button>
          </section>
        );
      })()}

      {/* Pending Bookings Table */}
      <section className="mt-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
            Pending Bookings
          </h2>
          {!loading && (
            <span className="font-mono text-xs font-bold uppercase">
              {bookings.length} unpaid
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center font-mono text-sm uppercase">
            Loading pending bookings…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-5 border-2 border-red-700 p-5 font-mono text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && bookings.length === 0 && (
          <div className="mt-5 border-2 border-dashed border-black p-10 text-center">
            <p className="font-mono text-sm font-bold uppercase">
              No pending bookings
            </p>
            <p className="mt-2 font-mono text-xs">
              All your bookings are paid, or there are none yet.
            </p>
            <button
              type="button"
              onClick={() => navigate("/invoices")}
              className="mt-5 border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
            >
              View Invoices →
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && bookings.length > 0 && (
          <div className="mt-5 overflow-x-auto border-2 border-black bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="bg-black font-mono text-xs uppercase text-white">
                <tr>
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="border-b border-black font-mono text-xs hover:bg-gray-50"
                  >
                    <td className="p-3 text-gray-500">
                      …{String(booking._id).slice(-8)}
                    </td>
                    <td className="p-3">
                      {booking.slotId ? `…${String(booking.slotId).slice(-6)}` : "—"}
                    </td>
                    <td className="p-3">{formatDateTime(booking.startTime)}</td>
                    <td className="p-3">{formatDateTime(booking.endTime)}</td>
                    <td className="p-3 font-bold">
                      {booking.startTime && booking.endTime
                        ? `${((new Date(booking.endTime) - new Date(booking.startTime)) / 3600000).toFixed(1)}h`
                        : "—"}
                    </td>
                    <td className="p-3 font-bold">{formatAmount(booking.totalAmount)}</td>
                    <td className="p-3 font-bold">
                      {(() => {
                        const msLeft = booking.expiresAt
                          ? new Date(booking.expiresAt).getTime() - now
                          : null;
                        const soon = msLeft !== null && msLeft > 0 && msLeft < 5 * 60 * 1000;
                        const gone = msLeft !== null && msLeft <= 0;
                        return (
                          <span className={gone || soon ? "text-red-700" : ""}>
                            {formatTimeRemaining(booking.expiresAt, now)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {/* Pay Now — always available */}
                        <button
                          type="button"
                          disabled={paying === booking._id || usingHours === booking._id}
                          onClick={() => handlePayNow(booking._id)}
                          className="border-2 border-black bg-black px-3 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {paying === booking._id ? "Redirecting…" : "Pay Now →"}
                        </button>

                        {/* Use Hours — only shown if subscription has enough hours */}
                        {(() => {
                          if (!subscription || !["active", "cancelling"].includes(subscription.status)) return null;
                          const durationH = booking.startTime && booking.endTime
                            ? (new Date(booking.endTime) - new Date(booking.startTime)) / 3600000
                            : 0;
                          const hoursRemaining = subscription.hoursTotal - subscription.hoursUsed;
                          if (hoursRemaining <= 0) return null;
                          return (
                            <button
                              type="button"
                              disabled={paying === booking._id || usingHours === booking._id || hoursRemaining < durationH}
                              onClick={() => handleUseHours(booking._id)}
                              title={hoursRemaining < durationH ? `Need ${durationH.toFixed(1)}h but only ${hoursRemaining.toFixed(1)}h left` : ""}
                              className="border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {usingHours === booking._id ? "Processing…" : "Use Hours →"}
                            </button>
                          );
                        })()}
                      </div>
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