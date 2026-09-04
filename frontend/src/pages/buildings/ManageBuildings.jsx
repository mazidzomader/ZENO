import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import Layout from "../../components/Layout";

function ManageBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // --- New building form ---
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", address: "", totalFloors: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // --- Inline edit state ---
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", totalFloors: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/buildings/mine");
      setBuildings(res.data.buildings);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load buildings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await API.get("/slots/mine");
      setSlots(res.data.slots);
    } catch {
      // non-critical — just means slot counts / lock badges won't populate
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
    fetchSlots();
  }, [fetchBuildings, fetchSlots]);

  const buildingId = (b) => b?._id || b;

  const slotsFor = (building) =>
    slots.filter((s) => buildingId(s.building) === building._id);

  const activeBookingSlot = (building) =>
    slotsFor(building).find((s) => ["reserved", "occupied"].includes(s.status));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!newForm.name || !newForm.address || !newForm.totalFloors) {
      setCreateError("Please fill in name, address, and total floors.");
      return;
    }
    setCreating(true);
    try {
      await API.post("/buildings", {
        name: newForm.name,
        address: newForm.address,
        totalFloors: Number(newForm.totalFloors),
      });
      setNewForm({ name: "", address: "", totalFloors: "" });
      setShowNewForm(false);
      fetchBuildings();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create building.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (building) => {
    setActionError("");
    setActionSuccess("");
    setEditError("");
    setEditingId(building._id);
    setEditForm({
      name: building.name,
      address: building.address,
      totalFloors: building.totalFloors,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
  };

  const saveEdit = async (building) => {
    setEditError("");
    setSavingEdit(true);
    try {
      await API.put(`/buildings/${building._id}`, {
        name: editForm.name,
        address: editForm.address,
        totalFloors: Number(editForm.totalFloors),
      });
      setEditingId(null);
      setActionSuccess(`"${editForm.name}" updated successfully.`);
      fetchBuildings();
      fetchSlots();
    } catch (err) {
      setEditError(err.response?.data?.message || "Update failed.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (building) => {
    if (
      !window.confirm(
        `Permanently delete building "${building.name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setActionError("");
    setActionSuccess("");
    try {
      await API.delete(`/buildings/${building._id}`);
      setActionSuccess(`"${building.name}" deleted successfully.`);
      fetchBuildings();
    } catch (err) {
      setActionError(err.response?.data?.message || "Delete failed.");
    }
  };

  const inputClass =
    "border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted w-full";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Buildings
          </h1>
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="bg-ink text-bgBase font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink"
          >
            {showNewForm ? "Cancel" : "+ New Building"}
          </button>
        </div>

        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="border-4 border-ink bg-bgAlt p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end font-mono text-xs"
          >
            <div className="flex flex-col md:col-span-2">
              <label className="uppercase font-bold mb-1">Name</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                className={inputClass}
                placeholder="Sunset Towers"
              />
            </div>
            <div className="flex flex-col">
              <label className="uppercase font-bold mb-1">Total Floors</label>
              <input
                type="number"
                min="1"
                value={newForm.totalFloors}
                onChange={(e) => setNewForm({ ...newForm, totalFloors: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-ink text-bgBase font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
              >
                {creating ? "..." : "Create"}
              </button>
            </div>
            <div className="flex flex-col md:col-span-4">
              <label className="uppercase font-bold mb-1">Address</label>
              <input
                type="text"
                value={newForm.address}
                onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
                className={inputClass}
                placeholder="123 Main St, City"
              />
            </div>
            {createError && (
              <div className="md:col-span-4 border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                [ERR] {createError}
              </div>
            )}
          </form>
        )}

        {actionError && (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            [ERR] {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="border-2 border-safe text-safe font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            {actionSuccess}
          </div>
        )}

        {loading ? (
          <p className="font-mono text-sm text-inkMuted uppercase">[LOADING...]</p>
        ) : error ? (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
            [ERR] {error}
          </div>
        ) : buildings.length === 0 ? (
          <div className="border-4 border-ink bg-bgAlt p-10 text-center font-mono uppercase text-sm text-inkMuted">
            No buildings yet. Use "+ New Building" above to create your first one.
          </div>
        ) : (
          <div className="border-4 border-ink bg-bgBase overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="bg-ink text-bgBase uppercase text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Floors</th>
                  <th className="px-4 py-3">Slots</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building) => {
                  const isEditing = editingId === building._id;
                  const buildingSlots = slotsFor(building);
                  const activeSlot = activeBookingSlot(building);
                  const locked = !!activeSlot;
                  const hasSlots = buildingSlots.length > 0;

                  return (
                    <tr key={building._id} className="border-t-2 border-ink align-top">
                      {isEditing ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className={inputClass}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.address}
                              onChange={(e) =>
                                setEditForm({ ...editForm, address: e.target.value })
                              }
                              className={inputClass}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={editForm.totalFloors}
                              onChange={(e) =>
                                setEditForm({ ...editForm, totalFloors: e.target.value })
                              }
                              className={`${inputClass} w-20`}
                            />
                          </td>
                          <td className="px-4 py-3">{buildingSlots.length}</td>
                          <td className="px-4 py-3">—</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              {editError && (
                                <div className="border-2 border-alert text-alert font-bold uppercase text-[10px] px-2 py-1">
                                  [ERR] {editError}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(building)}
                                  disabled={savingEdit}
                                  className="border-2 border-ink px-3 py-1 hover:bg-ink hover:text-bgBase uppercase disabled:opacity-60"
                                >
                                  {savingEdit ? "..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="border-2 border-ink px-3 py-1 hover:bg-highlight uppercase"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-bold">{building.name}</td>
                          <td className="px-4 py-3">{building.address}</td>
                          <td className="px-4 py-3">{building.totalFloors}</td>
                          <td className="px-4 py-3">{buildingSlots.length}</td>
                          <td className="px-4 py-3">
                            {locked ? (
                              <span className="font-bold uppercase text-highlight">
                                Active booking ({activeSlot.slotNumber})
                              </span>
                            ) : hasSlots ? (
                              <span className="font-bold uppercase text-inkMuted">
                                Has slots
                              </span>
                            ) : (
                              <span className="font-bold uppercase text-safe">Empty</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => startEdit(building)}
                                className="border-2 border-ink px-3 py-1 hover:bg-ink hover:text-bgBase uppercase"
                              >
                                Edit
                              </button>
                              {locked ? (
                                <span
                                  className="border-2 border-inkMuted text-inkMuted px-3 py-1 uppercase cursor-not-allowed"
                                  title={`Slot "${activeSlot.slotNumber}" has an active booking. Delete is disabled until it ends or is cancelled.`}
                                >
                                  Locked
                                </span>
                              ) : hasSlots ? (
                                <span
                                  className="border-2 border-inkMuted text-inkMuted px-3 py-1 uppercase cursor-not-allowed"
                                  title="This building still has slots. Delete or reassign them first."
                                >
                                  Has Slots
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleDelete(building)}
                                  className="border-2 border-alert text-alert px-3 py-1 hover:bg-alert hover:text-bgBase uppercase"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ManageBuildings;