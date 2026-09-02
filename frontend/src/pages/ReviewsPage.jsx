// ZENO — Ratings & Reviews (Feature: Booking Reviews)
// Renders user-exclusive bookings, review status, and dropdown forms to submit 0.25 star reviews.

import { useEffect, useState } from "react";
import { Star, MessageSquare, Calendar, ShieldAlert, Loader } from "lucide-react";
import API from "../services/api";

// ─── Formatting Helpers ──────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── 0.25 Dynamic Star Renderer ──────────────────────────────────────────────

function StarRating({ rating }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((index) => {
        // Calculate the percentage of fill for this star (0 to 100)
        const fillPercent = Math.max(0, Math.min(100, (rating - (index - 1)) * 100));

        return (
          <div key={index} className="relative w-5 h-5 text-bgAlt shrink-0 select-none">
            {/* Gray Empty Background Star */}
            <Star className="w-5 h-5 fill-ink/10 stroke-[2] text-ink/20" />
            {/* Gold Filled Star overlay with dynamic width clip */}
            <div
              className="absolute inset-0 text-highlight overflow-hidden pointer-events-none"
              style={{ width: `${fillPercent}%` }}
            >
              <Star className="w-5 h-5 fill-current text-highlight stroke-[2] stroke-ink" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Individual Booking Review Form Row ──────────────────────────────────────

function BookingRow({ booking, onReviewAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5.0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await API.post("/reviews", {
        bookingId: booking._id,
        rating,
        comment,
      });
      onReviewAdded(booking._id, res.data.review);
      setIsOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-ink bg-bgBase flex flex-col font-mono text-xs text-ink select-none">
      {/* Main Info Row */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 last:border-b-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
          <div>
            <span className="text-[9px] text-inkMuted block uppercase">Building</span>
            <span className="font-bold font-display text-sm">{booking.buildingName}</span>
          </div>
          <div>
            <span className="text-[9px] text-inkMuted block uppercase">Slot</span>
            <span className="font-bold">{booking.slotNumber}</span>
          </div>
          <div>
            <span className="text-[9px] text-inkMuted block uppercase">Date</span>
            <span>{fmtDate(booking.startTime)}</span>
          </div>
          <div>
            <span className="text-[9px] text-inkMuted block uppercase">Total Paid</span>
            <span className="font-bold">${booking.totalAmount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Action / Review Display Status */}
        <div className="flex items-center gap-3 shrink-0">
          {booking.review ? (
            <div className="flex flex-col gap-1 items-start md:items-end">
              <StarRating rating={booking.review.rating} />
              <span className="text-[9px] text-inkMuted uppercase">Finalized</span>
            </div>
          ) : (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1.5 border-2 border-ink bg-bgBase hover:bg-highlight hover:text-bgBase font-bold uppercase transition-colors"
            >
              {isOpen ? "Close" : "Rate Booking"}
            </button>
          )}
        </div>
      </div>

      {/* Review Read-only Comment Block */}
      {booking.review?.comment && (
        <div className="bg-bgAlt/20 p-3 px-4 border-b border-ink/10 flex gap-2 items-start">
          <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-inkMuted shrink-0" />
          <p className="italic text-inkMuted">"{booking.review.comment}"</p>
        </div>
      )}

      {/* Dropdown Form Block */}
      {isOpen && !booking.review && (
        <form onSubmit={handleSubmit} className="border-t-2 border-ink p-4 bg-bgAlt/20 flex flex-col gap-4 animate-fadeIn">
          {error && (
            <div className="border border-alert bg-alert/10 p-3 text-[10px] text-alert font-bold uppercase flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rating Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                Select Rating:
              </label>
              <div className="flex items-center gap-4 border border-ink p-3 bg-bgBase">
                {/* Custom range slider with 0.25 increments */}
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.25"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className="flex-grow accent-ink cursor-pointer h-2 bg-bgAlt rounded-lg appearance-none"
                />
                {/* Visual stars preview */}
                <div className="flex flex-col items-end shrink-0">
                  <StarRating rating={rating} />
                  <span className="text-[9px] text-inkMuted font-bold mt-1">
                    {rating.toFixed(2)} STARS
                  </span>
                </div>
              </div>
            </div>

            {/* Comment Box */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                Written Review:
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this slot and building..."
                maxLength={500}
                rows={2}
                className="border border-ink bg-bgBase p-2 outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 border-2 border-ink bg-bgBase hover:bg-bgAlt font-bold uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 border-2 border-ink bg-ink text-bgBase hover:bg-highlight hover:border-highlight hover:text-ink font-bold uppercase transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Done"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── ReviewsPage Component ───────────────────────────────────────────────────

export default function ReviewsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/reviews/bookings");
      setBookings(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Ratings & Reviews · ZENO";
    fetchBookings();
    return () => {
      document.title = "ZENO";
    };
  }, []);

  const handleReviewAdded = (bookingId, newReview) => {
    setBookings((prev) =>
      prev.map((bk) => (bk._id === bookingId ? { ...bk, review: newReview } : bk))
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="border-b-4 border-ink pb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink">
            Ratings & Reviews
          </h1>
          <p className="font-mono text-xs text-inkMuted mt-1 uppercase">
            Manage your feedback · [{bookings.length} BOOKINGS]
          </p>
        </div>
        <Star className="w-7 h-7 stroke-[2] text-inkMuted fill-inkMuted/15" />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
          <Loader className="w-5 h-5 mx-auto mb-3 animate-spin" />
          [FETCHING_BOOKINGS...]
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase flex items-center gap-3">
          <ShieldAlert className="w-4 h-4" />
          ERROR // {error}
        </div>
      )}

      {/* Bookings View List */}
      {!loading && !error && bookings.length === 0 && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs text-inkMuted uppercase tracking-widest">
          [EMPTY // NO BOOKINGS IN HISTORY]
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="flex flex-col gap-4">
          {bookings.map((bk) => (
            <BookingRow key={String(bk._id)} booking={bk} onReviewAdded={handleReviewAdded} />
          ))}
        </div>
      )}
    </div>
  );
}
