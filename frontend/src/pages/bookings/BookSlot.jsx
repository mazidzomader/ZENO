import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

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

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Live dynamic-pricing estimate state
  const [priceResult, setPriceResult] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

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
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default BookSlot;