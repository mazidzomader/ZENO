import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

const SLOT_TYPES = ["standard", "compact", "large", "handicap", "ev"];

function BulkSlotForm() {
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
    floor: "",
    prefix: "",
    startNumber: "",
    endNumber: "",
    type: "standard",
    length: "",
    width: "",
    pricePerHour: "",
    pricePerDay: "",
    pricePerMonth: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { createdCount, skipped, message }

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

  // Builds a preview list of slot numbers from the current form state
  const buildPreview = () => {
    const start = Number(formData.startNumber);
    const end = Number(formData.endNumber);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      return [];
    }
    const numbers = [];
    for (let n = start; n <= Math.min(end, start + 9); n++) {
      numbers.push(`${formData.prefix}${n}`);
    }
    return numbers;
  };

  const totalCount = () => {
    const start = Number(formData.startNumber);
    const end = Number(formData.endNumber);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      return 0;
    }
    return end - start + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (totalCount() === 0) {
      setError("End number must be greater than or equal to start number.");
      return;
    }
    if (totalCount() > 200) {
      setError("Cannot generate more than 200 slots at once.");
      return;
    }

    setSubmitting(true);

    const payload = {
      building: formData.building,
      floor: Number(formData.floor),
      prefix: formData.prefix,
      startNumber: Number(formData.startNumber),
      endNumber: Number(formData.endNumber),
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
      const res = await API.post("/slots/bulk", payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate slots.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted w-full";

  const preview = buildPreview();
  const total = totalCount();

  return (
    <Layout>
      <div className="flex items-center justify-center bg-bgAlt py-16 px-4 min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-2xl border-4 border-ink bg-bgBase">
          <div className="bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase font-bold flex justify-between items-center">
            <span>BULK_GENERATE_SLOTS</span>
            <Link to="/slots/mine" className="underline">
              Cancel
            </Link>
          </div>

          <div className="p-8 md:p-10">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-2">
              Bulk Generate Slots
            </h1>
            <p className="font-mono text-xs text-inkMuted uppercase mb-8">
              Creates a range of identical slots at once, e.g. A-1 ... A-20.
            </p>

            {result ? (
              <div className="space-y-4">
                <div className="border-4 border-safe p-4 font-mono text-sm">
                  <p className="font-bold uppercase mb-2">{result.message}</p>
                  {result.skipped?.length > 0 && (
                    <div className="mt-3">
                      <p className="uppercase text-xs font-bold text-alert mb-1">
                        Skipped (already exist):
                      </p>
                      <p className="text-xs text-inkMuted break-words">
                        {result.skipped.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/slots/mine")}
                    className="bg-ink text-bgBase font-bold uppercase px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink"
                  >
                    Go to My Slots
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="border-2 border-ink font-bold uppercase px-5 py-3 hover:bg-highlight"
                  >
                    Generate More
                  </button>
                </div>
              </div>
            ) : (
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="uppercase font-bold mb-2">Prefix</label>
                    <input
                      type="text"
                      name="prefix"
                      placeholder="A-"
                      value={formData.prefix}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase font-bold mb-2">Start #</label>
                    <input
                      type="number"
                      name="startNumber"
                      placeholder="1"
                      value={formData.startNumber}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase font-bold mb-2">End #</label>
                    <input
                      type="number"
                      name="endNumber"
                      placeholder="20"
                      value={formData.endNumber}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                {total > 0 && (
                  <div className="border-2 border-ink bg-bgAlt p-3 text-xs">
                    <p className="uppercase font-bold mb-1">
                      Will generate {total} slot{total !== 1 ? "s" : ""}:
                    </p>
                    <p className="text-inkMuted">
                      {preview.join(", ")}
                      {total > preview.length ? ` ... and ${total - preview.length} more` : ""}
                    </p>
                  </div>
                )}

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
                  {submitting ? ">[GENERATING...]" : `Generate ${total || ""} Slot${total !== 1 ? "s" : ""}`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default BulkSlotForm;