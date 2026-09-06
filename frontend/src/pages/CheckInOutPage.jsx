import { useEffect, useState } from "react";
import API from "../services/api";

export default function CheckInOutPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await API.get("/bookings/history");

        // /bookings/history returns { count, bookings }, not a raw array.
        const allBookings = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.bookings)
            ? res.data.bookings
            : [];

        const activeBookings = allBookings.filter((booking) =>
          ["confirmed", "active"].includes(booking.status)
        );

        const withStatus = await Promise.all(
          activeBookings.map(async (booking) => {
            const statusRes = await API.get(`/checkinout/${booking._id}/status`);
            return { ...booking, checkStatus: statusRes.data };
          })
        );

        if (active) {
          setBookings(withStatus);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setMessage(
            err.response?.data?.error ||
              err.response?.data?.message ||
              "Error loading bookings."
          );
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const handleCheckIn = async (bookingId) => {
    try {
      await API.post(`/checkinout/${bookingId}/checkin`);
      setMessage("Check-in successful.");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setMessage(err.response?.data?.error || "Check-in failed.");
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      const res = await API.post(`/checkinout/${bookingId}/checkout`);
      if (res.data.overstay) {
        setMessage(
          `Check-out successful. Overstay detected: ${res.data.overstay.durationMinutes} min, penalty: $${res.data.overstay.penaltyAmount}`
        );
      } else {
        setMessage("Check-out successful. No overstay.");
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setMessage(err.response?.data?.error || "Check-out failed.");
    }
  };

  if (loading) {
    return (
      <div className="border-2 border-dashed border-ink p-10 text-center font-mono text-sm uppercase">
        Loading check-in / check-out data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b-4 border-ink pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">
          Feature 09 // Slot Check-In & Check-Out Tracking
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">
          Check-In / Check-Out
        </h1>
        <p className="mt-3 max-w-3xl font-mono text-sm">
          Confirm arrival and departure. Actual timestamps are recorded for each booking.
        </p>
      </header>

      {message && (
        <div className="border-2 border-ink bg-highlight p-3 font-mono text-xs font-bold uppercase">
          {message}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="border-2 border-dashed border-ink p-10 text-center">
          <p className="font-mono text-sm font-bold uppercase">No active bookings</p>
          <p className="mt-2 font-mono text-xs">
            Create a booking first, then return here to check in.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => {
            const slot =
              booking.slotId && typeof booking.slotId === "object"
                ? booking.slotId
                : null;
            const building =
              slot?.building && typeof slot.building === "object"
                ? slot.building
                : null;

            return (
              <article
                key={booking._id}
                className="border-2 border-ink bg-bgBase p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="font-mono text-xs">
                  <p className="text-sm font-bold uppercase">
                    Slot {slot?.slotNumber || String(booking.slotId || "—")}
                    {building?.name ? ` — ${building.name}` : ""}
                  </p>
                  <p className="mt-2">
                    {new Date(booking.startTime).toLocaleString()} →{" "}
                    {new Date(booking.endTime).toLocaleString()}
                  </p>
                  <p className="mt-2 uppercase">
                    Booking: <b>{booking.status}</b> | Check-In:{" "}
                    <b>{booking.checkStatus?.checkInTime ? "DONE" : "PENDING"}</b>
                    {booking.checkStatus?.checkOutTime ? " | Check-Out: DONE" : ""}
                  </p>
                  {booking.checkStatus?.checkInTime && (
                    <p className="mt-1">
                      Arrival: {new Date(booking.checkStatus.checkInTime).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!booking.checkStatus?.checkInTime ? (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(booking._id)}
                      className="border-2 border-ink bg-ink px-5 py-3 font-mono text-xs font-bold uppercase text-bgBase hover:bg-highlight hover:text-ink"
                    >
                      Check In
                    </button>
                  ) : !booking.checkStatus?.checkOutTime ? (
                    <button
                      type="button"
                      onClick={() => handleCheckOut(booking._id)}
                      className="border-2 border-ink bg-ink px-5 py-3 font-mono text-xs font-bold uppercase text-bgBase hover:bg-highlight hover:text-ink"
                    >
                      Check Out
                    </button>
                  ) : (
                    <span className="border-2 border-ink px-5 py-3 font-mono text-xs font-bold uppercase">
                      Completed
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
