import { useEffect, useMemo, useState } from "react";
import API from "../services/api";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Short label for inside each hour cell, e.g. 0 -> "12AM", 9 -> "9AM", 13 -> "1PM".
function formatHourShort(hour) {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

// Full clock label, e.g. 0 -> "12:00 AM", 13 -> "1:00 PM". Used in tooltips
// and the "Selected" readout so it's unambiguous.
function formatClock(hour) {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

/**
 * Visual hour-by-hour availability timeline for a single parking slot.
 *
 * - Red   = already booked (from /bookings/slot/:id/schedule)
 * - Gray  = owner-scheduled blackout/maintenance window
 * - Faint = hour already in the past
 * - White = open / bookable
 *
 * Renters can click a free hour to start a selection, then click a later
 * free hour on the same day to complete the range, then hit "Use This
 * Time" to push that range up into the booking form via onPickRange.
 */
export default function SlotAvailabilityTimeline({ slotId, blackouts = [], onPickRange }) {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rangeStartHour, setRangeStartHour] = useState(null);
  const [rangeEndHour, setRangeEndHour] = useState(null);

  // Fetch this slot's booked time ranges for the day currently being viewed.
  useEffect(() => {
    if (!slotId) return;
    let cancelled = false;

    const fetchSchedule = async () => {
      setLoading(true);
      setError("");
      try {
        const from = startOfDay(day);
        const to = addDays(from, 1);
        const res = await API.get(`/bookings/slot/${slotId}/schedule`, {
          params: { from: from.toISOString(), to: to.toISOString() },
        });
        if (!cancelled) setBookings(res.data?.bookings || []);
      } catch {
        if (!cancelled) setError("Could not load this slot's schedule.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSchedule();
    return () => {
      cancelled = true;
    };
  }, [slotId, day]);

  // Reset any in-progress hour selection whenever the viewed day changes.
  useEffect(() => {
    setRangeStartHour(null);
    setRangeEndHour(null);
  }, [day]);

  // Classify every hour of the viewed day as booked / blackout / past / available.
  const hourStates = useMemo(() => {
    const now = new Date();
    return HOURS.map((hour) => {
      const hourStart = new Date(day);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(day);
      hourEnd.setHours(hour + 1, 0, 0, 0);

      const isBooked = bookings.some(
        (b) => new Date(b.startTime) < hourEnd && new Date(b.endTime) > hourStart
      );
      if (isBooked) return "booked";

      const isBlackout = blackouts.some(
        (b) => new Date(b.startDate) < hourEnd && new Date(b.endDate) > hourStart
      );
      if (isBlackout) return "blackout";

      if (hourEnd <= now) return "past";

      return "available";
    });
  }, [bookings, blackouts, day]);

  const handleCellClick = (hour, state) => {
    if (state !== "available") return;

    // No selection yet, or a full range was already picked — start fresh.
    if (rangeStartHour === null || rangeEndHour !== null) {
      setRangeStartHour(hour);
      setRangeEndHour(null);
      return;
    }

    // Clicked at/before the current start — treat it as a new start instead.
    if (hour <= rangeStartHour) {
      setRangeStartHour(hour);
      setRangeEndHour(null);
      return;
    }

    // Make sure every hour between start and this click is actually free.
    for (let h = rangeStartHour; h < hour; h++) {
      if (hourStates[h] !== "available") {
        setRangeStartHour(hour);
        setRangeEndHour(null);
        return;
      }
    }

    setRangeEndHour(hour);
  };

  const applyRange = () => {
    if (rangeStartHour === null || rangeEndHour === null || !onPickRange) return;
    const start = new Date(day);
    start.setHours(rangeStartHour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(rangeEndHour, 0, 0, 0);
    onPickRange(start, end);
  };

  const cellClass = (state, hour) => {
    const inSelectedRange =
      rangeStartHour !== null &&
      hour >= rangeStartHour &&
      (rangeEndHour !== null ? hour < rangeEndHour : hour === rangeStartHour);

    if (inSelectedRange) return "bg-highlight text-ink border-ink";
    if (state === "booked") return "bg-alert text-bgBase border-ink cursor-not-allowed";
    if (state === "blackout") return "bg-inkMuted text-bgBase border-ink cursor-not-allowed";
    if (state === "past") return "bg-bgAlt text-inkMuted border-ink cursor-not-allowed";
    return "bg-bgBase text-ink border-ink hover:bg-highlight/40 cursor-pointer";
  };

  return (
    <div className="border-2 border-ink bg-bgBase p-4 mb-8 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="font-bold uppercase tracking-widest">Slot Availability</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, -1))}
            className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-bgBase"
            aria-label="Previous day"
          >
            &larr;
          </button>
          <input
            type="date"
            value={toDateInputValue(day)}
            onChange={(e) => {
              if (!e.target.value) return;
              setDay(startOfDay(new Date(`${e.target.value}T00:00:00`)));
            }}
            className="border-2 border-ink px-2 py-1 bg-transparent"
          />
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, 1))}
            className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-bgBase"
            aria-label="Next day"
          >
            &rarr;
          </button>
        </div>
      </div>

      {loading ? (
        <p className="uppercase text-inkMuted py-4 text-center">[LOADING SCHEDULE...]</p>
      ) : error ? (
        <p className="uppercase text-alert py-2">{error}</p>
      ) : (
        <>

            <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(38px, 1fr))" }}
          >
            {HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                title={`${formatClock(hour)} - ${formatClock(hour + 1 === 24 ? 0 : hour + 1)} (${
                  hourStates[hour]
                })`}
                onClick={() => handleCellClick(hour, hourStates[hour])}
                disabled={hourStates[hour] !== "available"}
                className={`h-11 border text-[10px] sm:text-xs font-bold flex items-center justify-center ${cellClass(
                  hourStates[hour],
                  hour
                )}`}
              >
                {formatHourShort(hour)}
              </button>
            ))}
          </div>
          

          <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] uppercase text-inkMuted">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-bgBase border border-ink" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-alert" /> Booked
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-inkMuted" /> Blackout
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-bgAlt border border-ink" /> Past
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-highlight" /> Your selection
            </span>
          </div>

          {rangeStartHour !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink mt-3 pt-3">
              <span className="uppercase font-bold">
                Selected: {formatClock(rangeStartHour)} &rarr;{" "}
                {rangeEndHour !== null ? formatClock(rangeEndHour) : "pick an end hour"}
              </span>
              {rangeEndHour !== null && onPickRange && (
                <button
                  type="button"
                  onClick={applyRange}
                  className="border-2 border-ink bg-ink text-bgBase px-3 py-1.5 font-bold hover:bg-highlight hover:text-ink"
                >
                  Use This Time
                </button>
              )}
            </div>
          )}

          <p className="text-inkMuted normal-case text-[10px] mt-3">
            Click an open hour to start a selection, then click a later open hour the same day to
            set the end time. Times are shown in your local timezone. Availability is re-checked
            on the server before your booking is confirmed.
          </p>
        </>
      )}
    </div>
  );
}