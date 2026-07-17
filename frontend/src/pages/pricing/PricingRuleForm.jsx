import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import API from "../../services/api";
import Layout from "../../components/Layout";

const SLOT_TYPES = ["all", "standard", "compact", "large", "handicap", "ev"];
const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Quick-start presets offered on the pricing rules list. Selecting one links
// here with ?template=<key>, which just seeds the form below — everything
// stays editable before saving, nothing is created until submit.
const TEMPLATES = {
  rushHour: {
    name: "Weekday Rush Hour Surge",
    daysOfWeek: [1, 2, 3, 4, 5],
    timeStart: "08:00",
    timeEnd: "10:00",
    adjustmentType: "percentage",
    adjustmentValue: 15,
  },
  weekend: {
    name: "Weekend Rate",
    daysOfWeek: [0, 6],
    adjustmentType: "percentage",
    adjustmentValue: 10,
  },
  highDemand: {
    name: "High Demand Surge",
    demandThreshold: 80,
    adjustmentType: "percentage",
    adjustmentValue: 20,
  },
  evDiscount: {
    name: "EV Slot Discount",
    slotType: "ev",
    adjustmentType: "percentage",
    adjustmentValue: -10,
  },
};

function PricingRuleForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // When arriving from a slot's "Pricing" link (via /pricing-rules -> +New
  // Rule), these prefill the form to that slot's building/type/floor, and
  // returnSlot sends the user back to the filtered pricing view on save.
  const prefillBuilding = searchParams.get("building") || "";
  const prefillSlotType = searchParams.get("slotType") || "";
  const prefillFloor = searchParams.get("floor") || "";
  const returnSlot = searchParams.get("returnSlot") || "";
  const templateKey = searchParams.get("template") || "";
  const template = !isEditMode ? TEMPLATES[templateKey] : null;

  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [contextSlot, setContextSlot] = useState(null);

  const [formData, setFormData] = useState({
    building: !isEditMode ? prefillBuilding : "",
    name: template?.name || "",
    slotType: !isEditMode && prefillSlotType ? prefillSlotType : template?.slotType || "all",
    floorFrom: !isEditMode ? prefillFloor : "",
    floorTo: !isEditMode ? prefillFloor : "",
    daysOfWeek: template?.daysOfWeek || [],
    timeStart: template?.timeStart || "",
    timeEnd: template?.timeEnd || "",
    demandThreshold: template?.demandThreshold ?? "",
    adjustmentType: template?.adjustmentType || "percentage",
    adjustmentValue: template?.adjustmentValue ?? "",
    priority: 0,
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingRule, setLoadingRule] = useState(isEditMode);

  useEffect(() => {
    const fetchContextSlot = async () => {
      if (!returnSlot) return;
      try {
        const res = await API.get(`/slots/${returnSlot}`);
        setContextSlot(res.data.slot);
      } catch {
        // Non-critical — the form still works without the banner
      }
    };
    fetchContextSlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      setLoadingBuildings(true);
      try {
        const res = await API.get("/buildings/mine");
        setBuildings(res.data.buildings);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load buildings.");
      } finally {
        setLoadingBuildings(false);
      }
    };
    fetchBuildings();
  }, []);

  useEffect(() => {
    const fetchRule = async () => {
      if (!isEditMode) return;
      try {
        const res = await API.get(`/pricing-rules/${id}`);
        const r = res.data.rule;
        setFormData({
          building: r.building?._id || r.building || "",
          name: r.name,
          slotType: r.slotType,
          floorFrom: r.floorFrom ?? "",
          floorTo: r.floorTo ?? "",
          daysOfWeek: r.daysOfWeek || [],
          timeStart: r.timeStart ?? "",
          timeEnd: r.timeEnd ?? "",
          demandThreshold: r.demandThreshold ?? "",
          adjustmentType: r.adjustmentType,
          adjustmentValue: r.adjustmentValue,
          priority: r.priority,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load pricing rule.");
      } finally {
        setLoadingRule(false);
      }
    };
    fetchRule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleDay = (day) => {
    setFormData((prev) => {
      const has = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: has
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day].sort(),
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      building: formData.building || null,
      name: formData.name,
      slotType: formData.slotType,
      floorFrom: formData.floorFrom === "" ? null : Number(formData.floorFrom),
      floorTo: formData.floorTo === "" ? null : Number(formData.floorTo),
      daysOfWeek: formData.daysOfWeek,
      timeStart: formData.timeStart === "" ? null : formData.timeStart,
      timeEnd: formData.timeEnd === "" ? null : formData.timeEnd,
      demandThreshold:
        formData.demandThreshold === "" ? null : Number(formData.demandThreshold),
      adjustmentType: formData.adjustmentType,
      adjustmentValue: Number(formData.adjustmentValue),
      priority: Number(formData.priority) || 0,
    };

    try {
      if (isEditMode) {
        await API.put(`/pricing-rules/${id}`, payload);
      } else {
        await API.post("/pricing-rules", payload);
      }
      navigate(returnSlot ? `/pricing-rules?slot=${returnSlot}` : "/pricing-rules");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pricing rule.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "border-2 border-ink bg-transparent p-3 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none placeholder-inkMuted w-full";

  if (loadingRule) {
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
            <span>{isEditMode ? "EDIT_PRICING_RULE" : "NEW_PRICING_RULE"}</span>
            <Link
              to={returnSlot ? `/pricing-rules?slot=${returnSlot}` : "/pricing-rules"}
              className="underline"
            >
              Cancel
            </Link>
          </div>

          <div className="p-8 md:p-10">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight mb-2">
              {isEditMode ? "Edit Pricing Rule" : "Create Pricing Rule"}
            </h1>
            <p className="font-mono text-xs text-inkMuted uppercase mb-6">
              Rules adjust the base slot price by type, floor, time, and demand.
            </p>

            {contextSlot && !isEditMode && (
              <div className="border-2 border-ink bg-highlight text-ink px-3 py-2 mb-6 font-mono text-xs uppercase">
                Prefilled for slot <strong>{contextSlot.slotNumber}</strong> —{" "}
                {contextSlot.building?.name || "?"}, floor {contextSlot.floor},{" "}
                {contextSlot.type}. Adjust or broaden the fields below as needed.
              </div>
            )}

            {template && !isEditMode && (
              <div className="border-2 border-ink bg-highlight text-ink px-3 py-2 mb-6 font-mono text-xs uppercase">
                Started from the "{template.name}" quick-start template. Every field below is
                still editable before you save.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">Rule Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Weekday Rush Hour Surge"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">
                  Building{" "}
                  <span className="text-inkMuted normal-case font-normal">
                    (blank = all your buildings)
                  </span>
                </label>
                {loadingBuildings ? (
                  <p className="text-inkMuted uppercase text-xs">[LOADING_BUILDINGS...]</p>
                ) : (
                  <select
                    name="building"
                    value={formData.building}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">— All buildings —</option>
                    {buildings.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.totalFloors} floors)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Slot Type</label>
                  <select
                    name="slotType"
                    value={formData.slotType}
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
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Floor From</label>
                  <input
                    type="number"
                    name="floorFrom"
                    placeholder="Any"
                    value={formData.floorFrom}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Floor To</label>
                  <input
                    type="number"
                    name="floorTo"
                    placeholder="Any"
                    value={formData.floorTo}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">
                  Days of Week{" "}
                  <span className="text-inkMuted normal-case font-normal">
                    (none selected = every day)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleDay(d.value)}
                      className={`border-2 border-ink px-3 py-2 uppercase text-xs font-bold ${
                        formData.daysOfWeek.includes(d.value)
                          ? "bg-ink text-bgBase"
                          : "hover:bg-bgAlt"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Time Start</label>
                  <input
                    type="time"
                    name="timeStart"
                    value={formData.timeStart}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Time End</label>
                  <input
                    type="time"
                    name="timeEnd"
                    value={formData.timeEnd}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-2">
                  Demand Threshold (% occupancy){" "}
                  <span className="text-inkMuted normal-case font-normal">
                    (blank = ignore demand)
                  </span>
                </label>
                <input
                  type="number"
                  name="demandThreshold"
                  placeholder="e.g. 80"
                  min="0"
                  max="100"
                  value={formData.demandThreshold}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">Adjustment Type</label>
                  <select
                    name="adjustmentType"
                    value={formData.adjustmentType}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">
                    Value{" "}
                    <span className="text-inkMuted normal-case font-normal">
                      (+surcharge / -discount)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="adjustmentValue"
                    step="0.01"
                    placeholder="15"
                    value={formData.adjustmentValue}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2">
                    Priority{" "}
                    <span className="text-inkMuted normal-case font-normal">
                      (applied last wins)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
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
                  : "Create Rule"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default PricingRuleForm;