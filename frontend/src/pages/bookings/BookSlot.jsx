import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

// Recurring-booking day picker options (0 = Sunday .. 6 = Saturday, matches
// the daysOfWeek convention already used by PricingRule on the backend).
const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

// Must match MAX_OCCURRENCES_PER_SERIES in
// backend/controllers/recurringBookingController.js
const MAX_OCCURRENCES = 60;

function BookSlot() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [slot, setSlot] = useState(null);
  const [loadingSlot, setLoadingSlot] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [vehicles, setVehicles] = useState([]);

  // Upcoming maintenance / blackout windows for this slot, so the renter
  // knows why certain dates are unavailable before they even try to book.
  const [blackouts, setBlackouts] = useState([]);

  // "single" = book one time range. "recurring" = repeat on chosen days.
  const [mode, setMode] = useState("single");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Live dynamic-pricing estimate state (one-time booking only)
  const [priceResult, setPriceResult] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  // ── Recurring booking state ──
  const [repeatDays, setRepeatDays] = useState([]);
  const [seriesStartDate, setSeriesStartDate] = useState("");
  const [seriesEndDate, setSeriesEndDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);
  const [recurringError, setRecurringError] = useState("");
  const [recurringResult, setRecurringResult] = useState(null);

  // Switch between "single" and "recurring" mode, clearing any leftover
  // messages from the other mode so they don't linger on screen.
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setRecurringError("");
    setRecurringResult(null);
  };

  // Load the slot's details
  useEffect(() => {
    const fetchSlot = async () => {
      setLoadingSlot(true);
      setLoadError("");
      try {
        const res = await API.get(`/slots/${id}`);
        setSlot(res.data.slot);
      } catch (err) {
        setLoadError(err.response?.data?.message || "Failed to load slot.");
      } finally {
        setLoadingSlot(false);
      }
    };
    fetchSlot();
  }, [id]);

    // Load the renter's registered vehicles (optional selection)
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await API.get("/vehicles");
        setVehicles(Array.isArray(res.data) ? res.data : []);
      } catch {
        // Non-critical — vehicle selection is optional
      }
    };
    fetchVehicles();
  }, []);

  // Load this slot's upcoming scheduled blackout windows (maintenance /
  // reserved-for-tenant periods) so the renter can avoid picking those dates.
  useEffect(() => {
    const fetchBlackouts = async () => {
      try {
        const res = await API.get(`/slots/${id}/blackouts`);
        setBlackouts(res.data.blackouts || []);
      } catch {
        // Non-critical — booking will still be rejected server-side if the
        // chosen range overlaps a blackout.
      }
    };
    fetchBlackouts();
  }, [id]);


  // Basic client-side validity check for the chosen time range
  const rangeIsValid = useMemo(() => {
    if (!startTime || !endTime) return false;
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return start < end;
  }, [startTime, endTime]);

  const durationHours = useMemo(() => {
    if (!rangeIsValid) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.ceil((end - start) / (1000 * 60 * 60));
  }, [rangeIsValid, startTime, endTime]);

  // Fetch the live dynamic price whenever the slot or time range changes.
  // Debounced so we don't hammer the API on every keystroke.
  useEffect(() => {
    if (!id || !rangeIsValid) {
      setPriceResult(null);
      setPriceError("");
      return;
    }

    const start = new Date(startTime);
    let cancelled = false;

    const timer = setTimeout(async () => {
      setPriceLoading(true);
      setPriceError("");
      try {
        const res = await API.get(`/pricing-rules/calculate/${id}`, {
          params: { unit: "hour", datetime: start.toISOString() },
        });
        if (!cancelled) setPriceResult(res.data);
      } catch (err) {
        if (!cancelled) {
          setPriceResult(null);
          setPriceError(
            err.response?.data?.message || "Could not calculate live price."
          );
        }
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, rangeIsValid, startTime]);

  // Final estimate: effective hourly rate (after dynamic pricing rules) x hours
  const estimate = useMemo(() => {
    if (!priceResult || !durationHours) return null;
    const total = Math.round(durationHours * priceResult.finalPrice * 100) / 100;
    return { hours: durationHours, total, perHour: priceResult.finalPrice };
  }, [priceResult, durationHours]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!startTime || !endTime) {
      setError("Please choose a start and end time.");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post("/bookings", {
        slotId: id,
        vehicleId: vehicleId || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      const total = res.data?.booking?.totalAmount;
      setSuccess(
        `Slot reserved successfully${
          total !== undefined ? ` — total $${total}` : ""
        }! Redirecting to your bookings...`
      );
      setTimeout(() => navigate("/bookings/history"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to book this slot.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Recurring booking helpers ──

  const toggleRepeatDay = (value) => {
    setRepeatDays((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value].sort((a, b) => a - b)
    );
  };

  const applyDayPreset = (preset) => {
    if (preset === "weekdays") setRepeatDays([1, 2, 3, 4, 5]);
    else if (preset === "weekends") setRepeatDays([0, 6]);
    else if (preset === "everyday") setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
    else setRepeatDays([]);
  };

  const recurringDailyRangeIsValid = useMemo(() => {
    if (!timeStart || !timeEnd) return false;
    const [startH, startM] = timeStart.split(":").map(Number);
    const [endH, endM] = timeEnd.split(":").map(Number);
    return startH * 60 + startM < endH * 60 + endM;
  }, [timeStart, timeEnd]);

  const recurringDailyHours = useMemo(() => {
    if (!recurringDailyRangeIsValid) return 0;
    const [startH, startM] = timeStart.split(":").map(Number);
    const [endH, endM] = timeEnd.split(":").map(Number);
    return Math.ceil((endH * 60 + endM - (startH * 60 + startM)) / 60);
  }, [recurringDailyRangeIsValid, timeStart, timeEnd]);

  // Expands the chosen pattern into actual {date, start, end} occurrences,
  // entirely in the browser's local timezone — the same interpretation the
  // one-time datetime-local input above already uses — so "9:00" means
  // 9am wherever the renter actually is.
  const occurrences = useMemo(() => {
    if (
      repeatDays.length === 0 ||
      !seriesStartDate ||
      !seriesEndDate ||
      !recurringDailyRangeIsValid
    ) {
      return [];
    }

    const [startH, startM] = timeStart.split(":").map(Number);
    const [endH, endM] = timeEnd.split(":").map(Number);

    const rangeStart = new Date(`${seriesStartDate}T00:00:00`);
    const rangeEnd = new Date(`${seriesEndDate}T00:00:00`);

    if (
      Number.isNaN(rangeStart.getTime()) ||
      Number.isNaN(rangeEnd.getTime()) ||
      rangeStart > rangeEnd
    ) {
      return [];
    }

    const result = [];
    const cursor = new Date(rangeStart);

    // Cap iteration purely so an accidental huge date range can't freeze the
    // tab — the real limit is enforced below and again by the server.
    while (cursor <= rangeEnd && result.length <= MAX_OCCURRENCES) {
      if (repeatDays.includes(cursor.getDay())) {
        const start = new Date(cursor);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(cursor);
        end.setHours(endH, endM, 0, 0);
        result.push({ date: new Date(cursor), start, end });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }, [repeatDays, seriesStartDate, seriesEndDate, recurringDailyRangeIsValid, timeStart, timeEnd]);

  // Rough estimate only — uses the slot's flat base hourly rate. The exact
  // price for each date is computed by the same dynamic pricing engine the
  // one-time booking form uses, at the moment each occurrence is created.
  const recurringEstimate = useMemo(() => {
    if (!slot || occurrences.length === 0 || !recurringDailyHours) return null;
    const total =
      Math.round(occurrences.length * recurringDailyHours * slot.pricePerHour * 100) / 100;
    return {
      count: occurrences.length,
      perOccurrence: Math.round(recurringDailyHours * slot.pricePerHour * 100) / 100,
      total,
    };
  }, [slot, occurrences, recurringDailyHours]);

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    setRecurringError("");
    setRecurringResult(null);

    if (repeatDays.length === 0) {
      setRecurringError("Please select at least one day of the week.");
      return;
    }
    if (!recurringDailyRangeIsValid) {
      setRecurringError("Daily end time must be after daily start time.");
      return;
    }
    if (!seriesStartDate || !seriesEndDate) {
      setRecurringError("Please choose a start date and end date for the series.");
      return;
    }
    if (occurrences.length === 0) {
      setRecurringError("No matching dates fall in that range with the selected days.");
      return;
    }
    if (occurrences.length > MAX_OCCURRENCES) {
      setRecurringError(
        `That range produces ${occurrences.length} bookings, which is above the limit of ${MAX_OCCURRENCES}. Please shorten the date range or select fewer days.`
      );
      return;
    }

    setRecurringSubmitting(true);
    try {
      const res = await API.post("/recurring-bookings", {
        slotId: id,
        vehicleId: vehicleId || undefined,
        daysOfWeek: repeatDays,
        timeStart,
        timeEnd,
        seriesStartDate,
        seriesEndDate,
        occurrences: occurrences.map((o) => ({
          startTime: o.start.toISOString(),
          endTime: o.end.toISOString(),
        })),
      });

      setRecurringResult(res.data);
    } catch (err) {
      setRecurringError(
        err.response?.data?.message || "Failed to create recurring booking."
      );
    } finally {
      setRecurringSubmitting(false);
    }
  };

  const inputClass =
    "border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted w-full";

  if (loadingSlot) {
    return (
      <Layout>
        <p className="font-mono text-sm text-inkMuted uppercase text-center py-16">
          [LOADING SLOT...]
        </p>
      </Layout>
    );
  }

  if (loadError || !slot) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-sm px-4 py-3 mb-6">
            [ERR] {loadError || "Slot not found."}
          </div>
          <Link to="/slots/browse" className="underline font-mono text-sm">
            &larr; Back to browse
          </Link>
        </div>
      </Layout>
    );
  }

  const buildingName = slot.building?.name || "Building information unavailable";
  const buildingAddress = slot.building?.address || "";
  const owner = slot.owner && typeof slot.owner === "object" ? slot.owner : null;

  return (
    <Layout>
      <div className="flex items-center justify-center bg-bgAlt py-16 px-4 min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-2xl border-4 border-ink bg-bgBase">
          <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between items-center">
            <span>BOOK_SLOT</span>
            <Link to="/slots/browse" className="underline">
              Cancel
            </Link>
          </div>

          <div className="p-8 md:p-10">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-2">
              Reserve Slot {slot.slotNumber}
            </h1>
            <p className="font-mono text-sm text-inkMuted mb-8">
              {buildingName}
              {buildingAddress ? ` — ${buildingAddress}` : ""}
            </p>

            {/* Slot summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs mb-8">
              <div className="border-2 border-ink p-3">
                <p className="text-inkMuted uppercase">Floor</p>
                <p className="font-bold text-base mt-1">{slot.floor}</p>
              </div>
              <div className="border-2 border-ink p-3">
                <p className="text-inkMuted uppercase">Type</p>
                <p className="font-bold text-base mt-1 uppercase">{slot.type}</p>
              </div>
              <div className="border-2 border-ink p-3">
                <p className="text-inkMuted uppercase">Base rate / hr</p>
                <p className="font-bold text-base mt-1">${slot.pricePerHour}</p>
              </div>
              <div className="border-2 border-ink p-3">
                <p className="text-inkMuted uppercase">Status</p>
                <p className="font-bold text-base mt-1 uppercase">{slot.status}</p>
              </div>
            </div>

            {owner && (
              <div className="border-2 border-ink bg-bgAlt p-4 mb-8 font-mono text-xs">
                <p className="font-bold uppercase tracking-widest text-inkMuted">
                  Slot Owner
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-inkMuted uppercase text-[10px]">Name</p>
                    <p className="font-bold mt-0.5">{owner.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-inkMuted uppercase text-[10px]">Email</p>
                    <p className="font-bold mt-0.5 break-all">{owner.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-inkMuted uppercase text-[10px]">Phone</p>
                    <p className="font-bold mt-0.5">{owner.phone || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {blackouts.length > 0 && (
              <div className="border-2 border-alert bg-bgAlt p-4 mb-8 font-mono text-xs">
                <p className="font-bold uppercase tracking-widest text-alert">
                  Scheduled Maintenance / Unavailable Windows
                </p>
                <ul className="mt-2 space-y-1">
                  {blackouts.map((b) => (
                    <li key={b._id}>
                      {new Date(b.startDate).toLocaleString()} &rarr;{" "}
                      {new Date(b.endDate).toLocaleString()}
                      {b.reason ? ` — ${b.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {slot.status !== "available" ? (
              <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-4 py-3">
                This slot is currently "{slot.status}" and cannot be booked right now.
              </div>
            ) : (
              <>
                {/* Mode toggle: one-time vs repeating booking */}
                <div className="flex gap-2 mb-8 font-mono text-xs uppercase font-bold">
                  <button
                    type="button"
                    onClick={() => switchMode("single")}
                    className={`flex-1 border-2 border-ink px-4 py-3 ${
                      mode === "single" ? "bg-ink text-bgBase" : "bg-transparent hover:bg-bgAlt"
                    }`}
                  >
                    One-Time Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("recurring")}
                    className={`flex-1 border-2 border-ink px-4 py-3 ${
                      mode === "recurring" ? "bg-ink text-bgBase" : "bg-transparent hover:bg-bgAlt"
                    }`}
                  >
                    Repeating Booking
                  </button>
                </div>

                {mode === "single" ? (
                  <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">Start Time</label>
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">End Time</label>
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="uppercase font-bold mb-2">
                        Vehicle <span className="text-inkMuted normal-case">(optional)</span>
                      </label>
                      <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        className={`${inputClass} bg-bgBase`}
                      >
                        <option value="">No vehicle selected</option>
                        {vehicles.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.plateNumber} — {v.type}
                          </option>
                        ))}
                      </select>
                      {vehicles.length === 0 && (
                        <p className="text-inkMuted text-xs mt-2">
                          No vehicles on file.{" "}
                          <Link to="/profile/vehicles" className="underline">
                            Add one
                          </Link>{" "}
                          or continue without selecting one.
                        </p>
                      )}
                    </div>

                    {rangeIsValid && priceLoading && (
                      <div className="border-2 border-ink bg-bgAlt p-4 font-mono text-xs uppercase text-inkMuted">
                        [CALCULATING LIVE PRICE...]
                      </div>
                    )}

                    {priceError && (
                      <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
                        [ERR] {priceError}
                      </div>
                    )}

                    {estimate && !priceLoading && (
                      <div className="border-2 border-ink bg-bgAlt p-4 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="uppercase text-inkMuted">
                            Effective rate / hr (after dynamic pricing)
                          </span>
                          <span className="font-bold">${estimate.perHour}</span>
                        </div>

                        {priceResult?.appliedRules?.length > 0 && (
                          <div className="space-y-1 border-t border-ink/30 pt-2">
                            {priceResult.appliedRules.map((r) => (
                              <div key={r.ruleId} className="flex justify-between text-inkMuted">
                                <span>{r.name}</span>
                                <span>
                                  {r.adjustmentType === "percentage"
                                    ? `${r.adjustmentValue > 0 ? "+" : ""}${r.adjustmentValue}%`
                                    : `${r.adjustmentValue > 0 ? "+$" : "-$"}${Math.abs(
                                        r.adjustmentValue
                                      )}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t-2 border-ink pt-3">
                          <span className="uppercase font-bold text-xs">
                            Estimated Total ({estimate.hours} hr{estimate.hours !== 1 ? "s" : ""})
                          </span>
                          <span className="text-xl font-bold">${estimate.total}</span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                        [ERR] {error}
                      </div>
                    )}

                    {success && (
                      <div className="border-2 border-safe text-safe font-bold uppercase text-xs px-3 py-2">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-ink text-bgBase font-bold uppercase px-4 py-3 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
                    >
                      {submitting ? "[BOOKING...]" : "Confirm Booking"}
                    </button>
                  </form>
                ) : recurringResult ? (
                  <div className="space-y-5 font-mono text-sm">
                    <div
                      className={`border-2 font-bold uppercase text-xs px-4 py-3 ${
                        recurringResult.series?.bookedCount > 0
                          ? "border-safe text-safe"
                          : "border-alert text-alert"
                      }`}
                    >
                      {recurringResult.message}
                    </div>

                    <div className="border-2 border-ink bg-bgAlt p-4 text-xs space-y-1 max-h-64 overflow-y-auto">
                      {recurringResult.series?.occurrences?.map((o, i) => (
                        <div
                          key={i}
                          className="flex justify-between border-b border-ink/20 py-1 gap-3"
                        >
                          <span>{new Date(o.startTime).toLocaleString()}</span>
                          <span
                            className={
                              o.status === "booked"
                                ? "text-safe font-bold"
                                : "text-alert font-bold"
                            }
                          >
                            {o.status === "booked"
                              ? "BOOKED"
                              : `SKIPPED (${o.reason || "conflict"})`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/payments")}
                        className="flex-1 bg-ink text-bgBase font-bold uppercase px-4 py-3 border-2 border-ink hover:bg-highlight hover:text-ink"
                      >
                        Go To Payments &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/bookings/recurring")}
                        className="flex-1 bg-transparent font-bold uppercase px-4 py-3 border-2 border-ink hover:bg-ink hover:text-bgBase"
                      >
                        View Recurring Bookings &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRecurringSubmit} className="space-y-5 font-mono text-sm">
                    <div>
                      <label className="uppercase font-bold mb-2 block">Repeat On</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => applyDayPreset("weekdays")}
                          className="border-2 border-ink px-3 py-1 text-xs uppercase font-bold hover:bg-ink hover:text-bgBase"
                        >
                          Every Weekday (Mon&ndash;Fri)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDayPreset("weekends")}
                          className="border-2 border-ink px-3 py-1 text-xs uppercase font-bold hover:bg-ink hover:text-bgBase"
                        >
                          Weekends
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDayPreset("everyday")}
                          className="border-2 border-ink px-3 py-1 text-xs uppercase font-bold hover:bg-ink hover:text-bgBase"
                        >
                          Every Day
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDayPreset("clear")}
                          className="border-2 border-ink px-3 py-1 text-xs uppercase font-bold hover:bg-ink hover:text-bgBase"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DAY_OPTIONS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleRepeatDay(day.value)}
                            className={`border-2 border-ink w-14 py-2 text-xs uppercase font-bold ${
                              repeatDays.includes(day.value)
                                ? "bg-ink text-bgBase"
                                : "bg-transparent hover:bg-bgAlt"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">Series Start Date</label>
                        <input
                          type="date"
                          value={seriesStartDate}
                          onChange={(e) => setSeriesStartDate(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">Series End Date</label>
                        <input
                          type="date"
                          value={seriesEndDate}
                          onChange={(e) => setSeriesEndDate(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">Daily Start Time</label>
                        <input
                          type="time"
                          value={timeStart}
                          onChange={(e) => setTimeStart(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="uppercase font-bold mb-2">Daily End Time</label>
                        <input
                          type="time"
                          value={timeEnd}
                          onChange={(e) => setTimeEnd(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="uppercase font-bold mb-2">
                        Vehicle <span className="text-inkMuted normal-case">(optional)</span>
                      </label>
                      <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        className={`${inputClass} bg-bgBase`}
                      >
                        <option value="">No vehicle selected</option>
                        {vehicles.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.plateNumber} — {v.type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {repeatDays.length > 0 &&
                      seriesStartDate &&
                      seriesEndDate &&
                      recurringDailyRangeIsValid && (
                        <div className="border-2 border-ink bg-bgAlt p-4 font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="uppercase text-inkMuted">Matching dates</span>
                            <span className="font-bold">{occurrences.length}</span>
                          </div>

                          {occurrences.length > 0 && (
                            <div className="max-h-32 overflow-y-auto border-t border-ink/30 pt-2 space-y-1">
                              {occurrences.slice(0, 8).map((o, i) => (
                                <div key={i} className="flex justify-between text-inkMuted">
                                  <span>{o.date.toLocaleDateString()}</span>
                                  <span>
                                    {o.start.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    &ndash;{" "}
                                    {o.end.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              ))}
                              {occurrences.length > 8 && (
                                <div className="text-inkMuted">
                                  &hellip;and {occurrences.length - 8} more
                                </div>
                              )}
                            </div>
                          )}

                          {recurringEstimate && (
                            <div className="flex items-center justify-between border-t-2 border-ink pt-3">
                              <span className="uppercase font-bold text-xs">
                                Rough Estimate ({recurringEstimate.count} &times;{" "}
                                {recurringDailyHours}hr @ base rate)
                              </span>
                              <span className="text-xl font-bold">
                                ${recurringEstimate.total}
                              </span>
                            </div>
                          )}

                          <p className="text-inkMuted normal-case text-[11px]">
                            Final price per date is calculated by dynamic pricing at booking
                            time and may differ from this estimate. Any date that conflicts
                            with an existing booking or blackout will be automatically skipped.
                          </p>

                          {occurrences.length > MAX_OCCURRENCES && (
                            <p className="text-alert font-bold uppercase text-[11px]">
                              This range produces more than {MAX_OCCURRENCES} bookings — please
                              shorten it.
                            </p>
                          )}
                        </div>
                      )}

                    {recurringError && (
                      <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                        [ERR] {recurringError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        recurringSubmitting ||
                        occurrences.length === 0 ||
                        occurrences.length > MAX_OCCURRENCES
                      }
                      className="w-full bg-ink text-bgBase font-bold uppercase px-4 py-3 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
                    >
                      {recurringSubmitting
                        ? "[CREATING BOOKINGS...]"
                        : occurrences.length > 0
                        ? `Create ${occurrences.length} Booking${
                            occurrences.length !== 1 ? "s" : ""
                          }`
                        : "Select Days & Dates"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default BookSlot;