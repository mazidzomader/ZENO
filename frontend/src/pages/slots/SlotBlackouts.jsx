import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

function SlotBlackouts() {
  const { id } = useParams();

  const [slot, setSlot] = useState(null);
  const [blackouts, setBlackouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const fetchSlot = useCallback(async () => {
    try {
      const res = await API.get(`/slots/${id}`);
      setSlot(res.data.slot);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load slot.");
    }
  }, [id]);

  const fetchBlackouts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/slots/${id}/blackouts`, {
        params: { includePast: "true" },
      });
      setBlackouts(res.data.blackouts);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load blackouts.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSlot();
    fetchBlackouts();
  }, [fetchSlot, fetchBlackouts]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!form.startDate || !form.endDate) {
      setCreateError("Please provide a start and end date/time.");
      return;
    }

    if (new Date(form.startDate) >= new Date(form.endDate)) {
      setCreateError("End date/time must be after start date/time.");
      return;
    }

    setCreating(true);
    try {
      await API.post(`/slots/${id}/blackouts`, {
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason,
      });
      setForm({ startDate: "", endDate: "", reason: "" });
      setCreateSuccess("Blackout window scheduled successfully.");
      fetchBlackouts();
    } catch (err) {
      setCreateError(
        err.response?.data?.message || "Failed to schedule blackout."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (blackout) => {
    if (
      !window.confirm(
        `Remove this blackout window (${new Date(
          blackout.startDate
        ).toLocaleString()} — ${new Date(blackout.endDate).toLocaleString()})?`
      )
    ) {
      return;
    }
    setActionError("");
    setDeletingId(blackout._id);
    try {
      await API.delete(`/blackouts/${blackout._id}`);
      fetchBlackouts();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove blackout.");
    } finally {
      setDeletingId(null);
    }
  };

  const isPast = (blackout) => new Date(blackout.endDate) < new Date();

  const inputClass =
    "border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted w-full";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
              Slot Blackouts
            </h1>
            {slot && (
              <p className="font-mono text-sm text-inkMuted mt-1">
                {slot.slotNumber} — {slot.building?.name || "Unknown building"}
              </p>
            )}
          </div>
          <Link
            to="/slots/mine"
            className="border-2 border-ink px-5 py-3 font-mono font-bold uppercase text-xs hover:bg-highlight"
          >
            &larr; Back to My Slots
          </Link>
        </div>

        <div className="border-4 border-ink bg-bgAlt p-6 mb-8">
          <h2 className="font-mono font-bold uppercase text-sm mb-1">
            Schedule a new blackout
          </h2>
          <p className="font-mono text-xs text-inkMuted mb-4">
            The slot stays bookable outside this window — it is NOT
            deactivated entirely, just blocked during this date range
            (e.g. repainting, repairs, or reserved for a specific tenant).
          </p>

          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs"
          >
            <div className="flex flex-col">
              <label className="uppercase font-bold mb-2">Start</label>
              <input
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col">
              <label className="uppercase font-bold mb-2">End</label>
              <input
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="uppercase font-bold mb-2">
                Reason{" "}
                <span className="text-inkMuted normal-case">(optional)</span>
              </label>
              <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="e.g. Repainting, reserved for tenant, repairs"
                className={inputClass}
              />
            </div>

            {createError && (
              <div className="md:col-span-2 border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                [ERR] {createError}
              </div>
            )}
            {createSuccess && (
              <div className="md:col-span-2 border-2 border-safe text-safe font-bold uppercase text-xs px-3 py-2">
                {createSuccess}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-ink text-bgBase font-bold uppercase p-3 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
              >
                {creating ? "[SCHEDULING...]" : "Schedule Blackout"}
              </button>
            </div>
          </form>
        </div>

        {actionError && (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            [ERR] {actionError}
          </div>
        )}

        <h2 className="font-mono font-bold uppercase text-sm mb-4">
          Scheduled Blackouts
        </h2>

        {loading ? (
          <p className="font-mono text-sm text-inkMuted uppercase">
            [LOADING...]
          </p>
        ) : error ? (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
            [ERR] {error}
          </div>
        ) : blackouts.length === 0 ? (
          <div className="border-4 border-ink bg-bgAlt p-10 text-center font-mono uppercase text-sm text-inkMuted">
            No blackout windows scheduled for this slot.
          </div>
        ) : (
          <div className="border-4 border-ink bg-bgBase overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="bg-ink text-bgBase uppercase text-left">
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blackouts.map((b) => (
                  <tr key={b._id} className="border-t-2 border-ink">
                    <td className="px-4 py-3">
                      {new Date(b.startDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(b.endDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{b.reason || "—"}</td>
                    <td className="px-4 py-3 font-bold uppercase">
                      {isPast(b) ? (
                        <span className="text-inkMuted">Past</span>
                      ) : (
                        <span className="text-highlight">Upcoming</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(b)}
                        disabled={deletingId === b._id}
                        className="border-2 border-alert text-alert px-3 py-1 hover:bg-alert hover:text-bgBase uppercase disabled:opacity-60"
                      >
                        {deletingId === b._id ? "..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default SlotBlackouts;