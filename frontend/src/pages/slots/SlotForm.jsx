import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

const SLOT_TYPES = ["standard", "compact", "large", "handicap", "ev"];

function SlotForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [showNewBuilding, setShowNewBuilding] = useState(false);
  const [newBuilding, setNewBuilding] = useState({
    name: "",
    address: "",
    totalFloors: "",
  });
  const [buildingError, setBuildingError] = useState("");
  const [creatingBuilding, setCreatingBuilding] = useState(false);

  const [formData, setFormData] = useState({
    building: "",
    slotNumber: "",
    floor: "",
    type: "standard",
    length: "",
    width: "",
    pricePerHour: "",
    pricePerDay: "",
    pricePerMonth: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState(isEditMode);

  const fetchBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const res = await API.get("/buildings/mine");
      setBuildings(res.data.buildings);
    } catch (err) {
      setBuildingError(err.response?.data?.message || "Failed to load buildings.");
    } finally {
      setLoadingBuildings(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    const fetchSlot = async () => {
      if (!isEditMode) return;
      try {
        const res = await API.get(`/slots/${id}`);
        const s = res.data.slot;
        setFormData({
          building: s.building?._id || s.building,
          slotNumber: s.slotNumber,
          floor: s.floor,
          type: s.type,
          length: s.dimensions?.length ?? "",
          width: s.dimensions?.width ?? "",
          pricePerHour: s.pricePerHour,
          pricePerDay: s.pricePerDay ?? "",
          pricePerMonth: s.pricePerMonth ?? "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load slot.");
      } finally {
        setLoadingSlot(false);
      }
    };
    fetchSlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNewBuildingChange = (e) => {
    setNewBuilding({ ...newBuilding, [e.target.name]: e.target.value });
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    setBuildingError("");
    setCreatingBuilding(true);
    try {
      const res = await API.post("/buildings", {
        name: newBuilding.name,
        address: newBuilding.address,
        totalFloors: Number(newBuilding.totalFloors),
      });
      await fetchBuildings();
      setFormData((prev) => ({ ...prev, building: res.data.building._id }));
      setShowNewBuilding(false);
      setNewBuilding({ name: "", address: "", totalFloors: "" });
    } catch (err) {
      setBuildingError(err.response?.data?.message || "Failed to create building.");
    } finally {
      setCreatingBuilding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      building: formData.building,
      slotNumber: formData.slotNumber,
      floor: Number(formData.floor),
      type: formData.type,
      dimensions: {
        length: Number(formData.length),
        width: Number(formData.width),
      },
      pricePerHour: Number(formData.pricePerHour),
      pricePerDay: formData.pricePerDay ? Number(formData.pricePerDay) : undefined,
      pricePerMonth: formData.pricePerMonth ? Number(formData.pricePerMonth) : undefined,
    };

    try {
      if (isEditMode) {
        await API.put(`/slots/${id}`, payload);
      } else {
        await API.post("/slots", payload);
      }
      navigate("/slots/mine");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save slot.");
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
          [LOADING...]
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center bg-bgAlt py-16 px-4 min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-2xl border-4 border-ink bg-bgBase">
          <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between items-center">
            <span>{isEditMode ? "EDIT_SLOT" : "NEW_SLOT"}</span>
            <Link to="/slots/mine" className="underline">
              Cancel
            </Link>
          </div>

          <div className="p-8 md:p-10">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-8">
              {isEditMode ? "Edit Parking Slot" : "Create Parking Slot"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">Building</label>

                {loadingBuildings ? (
                  <p className="text-inkMuted uppercase text-xs">[LOADING_BUILDINGS...]</p>
                ) : (
                  <select
                    name="building"
                    value={formData.building}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">— Select a building —</option>
                    {buildings.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.totalFloors} floors)
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewBuilding((v) => !v)}
                  className="text-xs underline uppercase mt-2 self-start text-inkMuted"
                >
                  {showNewBuilding ? "Cancel new building" : "+ Add a new building"}
                </button>

                {showNewBuilding && (
                  <div className="mt-4 border-2 border-ink p-4 space-y-3 bg-bgAlt">
                    <input
                      type="text"
                      name="name"
                      placeholder="Building name"
                      value={newBuilding.name}
                      onChange={handleNewBuildingChange}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="address"
                      placeholder="Address"
                      value={newBuilding.address}
                      onChange={handleNewBuildingChange}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      name="totalFloors"
                      placeholder="Total floors"
                      min="1"
                      value={newBuilding.totalFloors}
                      onChange={handleNewBuildingChange}
                      className={inputClass}
                    />
                    {buildingError && (
                      <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                        [ERR] {buildingError}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={creatingBuilding}
                      onClick={handleCreateBuilding}
                      className="bg-ink text-bgBase font-bold uppercase px-4 py-2 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
                    >
                      {creatingBuilding ? "[SAVING...]" : "Save Building"}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Slot Number</label>
                  <input
                    type="text"
                    name="slotNumber"
                    placeholder="A-101"
                    value={formData.slotNumber}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Floor</label>
                  <input
                    type="number"
                    name="floor"
                    placeholder="1"
                    value={formData.floor}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">Slot Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {SLOT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Length (ft)</label>
                  <input
                    type="number"
                    name="length"
                    step="0.1"
                    value={formData.length}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Width (ft)</label>
                  <input
                    type="number"
                    name="width"
                    step="0.1"
                    value={formData.width}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Rate / Hour</label>
                  <input
                    type="number"
                    name="pricePerHour"
                    step="0.01"
                    value={formData.pricePerHour}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Rate / Day</label>
                  <input
                    type="number"
                    name="pricePerDay"
                    step="0.01"
                    value={formData.pricePerDay}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Rate / Month</label>
                  <input
                    type="number"
                    name="pricePerMonth"
                    step="0.01"
                    value={formData.pricePerMonth}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-3 py-2">
                  [ERR] {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ink text-bgBase font-bold uppercase p-4 hover:bg-highlight hover:text-ink transition-none border-2 border-ink mt-2 disabled:opacity-60"
              >
                {submitting
                  ? ">[SAVING...]"
                  : isEditMode
                  ? "Save Changes"
                  : "Create Slot"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SlotForm;