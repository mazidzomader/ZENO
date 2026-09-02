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

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // Live estimate of total price based on the selected time range
  const estimate = useMemo(() => {
    if (!slot || !startTime || !endTime) return null;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (start >= end) return null;

    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const total = hours * (slot.pricePerHour || 0);

    return { hours, total };
  }, [slot, startTime, endTime]);

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
      await API.post("/bookings", {
        slotId: id,
        vehicleId: vehicleId || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      setSuccess("Slot booked successfully! Redirecting to your bookings...");
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
                <p className="text-inkMuted uppercase">Rate / hr</p>
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

                {estimate && (
                  <div className="border-2 border-ink bg-bgAlt p-4 flex items-center justify-between">
                    <span className="uppercase font-bold text-xs">
                      Estimated Total ({estimate.hours} hr{estimate.hours !== 1 ? "s" : ""})
                    </span>
                    <span className="text-xl font-bold">${estimate.total}</span>
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