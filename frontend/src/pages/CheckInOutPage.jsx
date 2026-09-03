import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import API from '../services/api';

export default function CheckInOutPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      try {
        const res = await API.get('/bookings/history');
        const activeBookings = res.data.filter(
          (b) => ['confirmed', 'active'].includes(b.status)
        );
        const withStatus = await Promise.all(
          activeBookings.map(async (b) => {
            const statusRes = await API.get(`/checkinout/${b._id}/status`);
            return { ...b, checkStatus: statusRes.data };
          })
        );
        
        if (active) {
          setBookings(withStatus);
          setLoading(false);
        }
      } catch {
        if (active) {
          setMessage('Error loading bookings.');
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
      setMessage('Check-in successful.');
      setRefreshTrigger((prev) => prev + 1); 
    } catch (err) {
      setMessage(err.response?.data?.error || 'Check-in failed.');
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
        setMessage('Check-out successful. No overstay.');
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Check-out failed.');
    }
  };

  if (loading) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Check‑In / Check‑Out</h1>
        {message && <div className="mb-4 p-2 bg-highlight border-2 border-ink">{message}</div>}
        {bookings.length === 0 ? (
          <p>No active bookings to check in/out.</p>
        ) : (
          <ul className="space-y-4">
            {bookings.map((b) => (
              <li key={b._id} className="border-2 border-ink p-4 flex justify-between items-center">
                <div>
                  <div>
                    <strong>Slot:</strong> {b.slotNumber} – {b.buildingName}
                  </div>
                  <div className="text-sm">
                    {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}
                  </div>
                  <div className="text-sm">
                    Status: {b.status} | Check‑in:{' '}
                    {b.checkStatus?.checkInTime ? '✅' : '⏳'}
                    {b.checkStatus?.checkOutTime ? ' | Check‑out: ✅' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!b.checkStatus?.checkInTime ? (
                    <button
                      onClick={() => handleCheckIn(b._id)}
                      className="bg-ink text-bgBase px-4 py-2 border-2 border-ink hover:bg-highlight"
                    >
                      Check In
                    </button>
                  ) : !b.checkStatus?.checkOutTime ? (
                    <button
                      onClick={() => handleCheckOut(b._id)}
                      className="bg-ink text-bgBase px-4 py-2 border-2 border-ink hover:bg-highlight"
                    >
                      Check Out
                    </button>
                  ) : (
                    <span className="text-inkMuted">Done</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}