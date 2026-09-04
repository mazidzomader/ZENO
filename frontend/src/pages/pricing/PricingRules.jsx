import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Clock,
  CalendarDays,
  Zap,
  Leaf,
  Calculator,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import API from "../../services/api";
import Layout from "../../components/Layout";

// Quick-start cards on this page just deep-link into the rule form with a
// ?template= key — see TEMPLATES in PricingRuleForm.jsx for the seeded values.
const QUICK_START = [
  { key: "rushHour", label: "Rush hour surge", icon: Clock },
  { key: "weekend", label: "Weekend rate", icon: CalendarDays },
  { key: "highDemand", label: "High demand", icon: Zap },
  { key: "evDiscount", label: "EV discount", icon: Leaf },
];

// Mirrors the structural part of the backend's matching logic in
// utils/pricingEngine.js (building + slotType + floor). Day/time/demand
// are left out here on purpose — this is "could this rule ever apply to
// this slot", not "does it apply right now".
function ruleAppliesToSlot(rule, slot) {
  if (!slot) return true;
  const ruleBuildingId = rule.building?._id || rule.building || null;
  const slotBuildingId = slot.building?._id || slot.building || null;
  if (ruleBuildingId && ruleBuildingId !== slotBuildingId) return false;
  if (rule.slotType !== "all" && rule.slotType !== slot.type) return false;
  if (rule.floorFrom !== null && rule.floorFrom !== undefined && slot.floor < rule.floorFrom) {
    return false;
  }
  if (rule.floorTo !== null && rule.floorTo !== undefined && slot.floor > rule.floorTo) {
    return false;
  }
  return true;
}

// A rule is "locked" (edit/pause/delete disabled) only when it's active AND
// it reaches at least one slot that currently has an active booking. Mirrors
// the backend's findActiveBookingConflict check in pricingRuleController.js.
function ruleIsLocked(rule, slots) {
  if (!rule.active) return false;
  return slots.some(
    (s) =>
      ["reserved", "occupied"].includes(s.status) && ruleAppliesToSlot(rule, s)
  );
}

// Returns the rule's conditions as an array of short tags, for rendering as
// pills on the rule card (rather than one long joined string).
function describeTags(rule) {
  const tags = [rule.building?.name || "All buildings"];

  if (rule.slotType && rule.slotType !== "all") {
    tags.push(rule.slotType.toUpperCase());
  }
  if (rule.floorFrom !== null || rule.floorTo !== null) {
    const from = rule.floorFrom ?? "any";
    const to = rule.floorTo ?? "any";
    tags.push(`Floor ${from}-${to}`);
  }
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    tags.push(rule.daysOfWeek.map((d) => labels[d]).join("/"));
  }
  if (rule.timeStart && rule.timeEnd) {
    tags.push(`${rule.timeStart}-${rule.timeEnd}`);
  }
  if (rule.demandThreshold !== null && rule.demandThreshold !== undefined) {
    tags.push(`Demand >= ${rule.demandThreshold}%`);
  }

  return tags;
}

function formatAdjustment(rule) {
  if (rule.adjustmentType === "percentage") {
    return `${rule.adjustmentValue > 0 ? "+" : ""}${rule.adjustmentValue}%`;
  }
  return `${rule.adjustmentValue > 0 ? "+$" : "-$"}${Math.abs(rule.adjustmentValue)}`;
}

function PricingRules() {
  const [searchParams] = useSearchParams();
  const contextSlotId = searchParams.get("slot") || "";

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // --- Slot context (set when arriving via "Pricing" from a slot row) ---
  const [contextSlot, setContextSlot] = useState(null);
  const [contextError, setContextError] = useState("");

  // --- Live price calculator state ---
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [calcSlot, setCalcSlot] = useState("");
  const [calcUnit, setCalcUnit] = useState("hour");
  const [calcDatetime, setCalcDatetime] = useState("");
  const [calcResult, setCalcResult] = useState(null);
  const [calcError, setCalcError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/pricing-rules/mine");
      setRules(res.data.rules);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await API.get("/slots/mine");
      setSlots(res.data.slots);
      // Preselect the slot we arrived with, if any; otherwise the first slot.
      if (contextSlotId) {
        setCalcSlot(contextSlotId);
      } else if (res.data.slots.length > 0) {
        setCalcSlot(res.data.slots[0]._id);
      }
    } catch {
      // Calculator is a bonus tool — fail silently if slots can't load
    }
  };

  const fetchContextSlot = async () => {
    if (!contextSlotId) {
      setContextSlot(null);
      return;
    }
    setContextError("");
    try {
      const res = await API.get(`/slots/${contextSlotId}`);
      setContextSlot(res.data.slot);
    } catch (err) {
      setContextSlot(null);
      setContextError(err.response?.data?.message || "Could not load that slot.");
    }
  };

  useEffect(() => {
    fetchRules();
    fetchSlots();
    fetchContextSlot();
    if (contextSlotId) setPreviewOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSlotId]);

  const visibleRules = contextSlot
    ? rules.filter((r) => ruleAppliesToSlot(r, contextSlot))
    : rules;

  const newRuleLink = contextSlot
    ? `/pricing-rules/new?building=${contextSlot.building?._id || contextSlot.building}&slotType=${contextSlot.type}&floor=${contextSlot.floor}&returnSlot=${contextSlot._id}`
    : "/pricing-rules/new";

  const handleToggle = async (rule) => {
    setActionError("");
    try {
      await API.patch(`/pricing-rules/${rule._id}/toggle`);
      fetchRules();
    } catch (err) {
      setActionError(err.response?.data?.message || "Action failed.");
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Permanently delete pricing rule "${rule.name}"?`)) return;
    setActionError("");
    try {
      await API.delete(`/pricing-rules/${rule._id}`);
      fetchRules();
    } catch (err) {
      setActionError(err.response?.data?.message || "Delete failed.");
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setCalcError("");
    setCalcResult(null);
    if (!calcSlot) {
      setCalcError("Select a slot first.");
      return;
    }
    setCalculating(true);
    try {
      const params = { unit: calcUnit };
      if (calcDatetime) params.datetime = new Date(calcDatetime).toISOString();

      const res = await API.get(`/pricing-rules/calculate/${calcSlot}`, { params });
      setCalcResult(res.data);
    } catch (err) {
      setCalcError(err.response?.data?.message || "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  };

  const inputClass =
    "border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase transition-none rounded-none w-full font-mono text-xs";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Dynamic Pricing
          </h1>
          <Link
            to={newRuleLink}
            className="bg-ink text-bgBase font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink"
          >
            + New Rule
          </Link>
        </div>

        {contextError && (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            [ERR] {contextError}
          </div>
        )}

        {contextSlot && (
          <div className="border-4 border-ink bg-highlight text-ink mb-8 px-4 py-3 flex items-center justify-between flex-wrap gap-3 font-mono text-xs uppercase">
            <span>
              Showing rules relevant to slot <strong>{contextSlot.slotNumber}</strong> —{" "}
              {contextSlot.building?.name || "?"}, floor {contextSlot.floor}, {contextSlot.type}
            </span>
            <Link to="/pricing-rules" className="underline font-bold">
              View all rules
            </Link>
          </div>
        )}

        {/* Quick-start templates */}
        <div className="mb-8">
          <p className="font-mono text-xs uppercase text-inkMuted font-bold mb-3">Quick start</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_START.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                to={`/pricing-rules/new?template=${key}`}
                className="border-2 border-ink bg-bgBase p-4 flex flex-col gap-3 hover:bg-ink hover:text-bgBase group transition-none"
              >
                <Icon size={20} strokeWidth={2} />
                <span className="font-mono text-xs font-bold uppercase leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Live price calculator, collapsed by default */}
        <div className="border-4 border-ink bg-bgAlt mb-10">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="w-full bg-ink text-bgBase px-4 py-3 font-mono text-xs uppercase font-bold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Calculator size={14} /> Preview a price
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${previewOpen ? "rotate-180" : ""}`}
              style={{ transition: "transform 0.15s linear" }}
            />
          </button>

          {previewOpen && (
            <>
              <form
                onSubmit={handleCalculate}
                className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
              >
                <div className="flex flex-col md:col-span-2">
                  <label className="uppercase font-bold mb-2 font-mono text-xs">Slot</label>
                  <select
                    value={calcSlot}
                    onChange={(e) => setCalcSlot(e.target.value)}
                    className={inputClass}
                  >
                    {slots.length === 0 && <option value="">No slots yet</option>}
                    {slots.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.slotNumber} — {s.building?.name || "?"} (Floor {s.floor}, {s.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2 font-mono text-xs">Rate Unit</label>
                  <select
                    value={calcUnit}
                    onChange={(e) => setCalcUnit(e.target.value)}
                    className={inputClass}
                  >
                    <option value="hour">Hourly</option>
                    <option value="day">Daily</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="uppercase font-bold mb-2 font-mono text-xs">
                    Date/Time <span className="text-inkMuted normal-case">(blank = now)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={calcDatetime}
                    onChange={(e) => setCalcDatetime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-4">
                  <button
                    type="submit"
                    disabled={calculating}
                    className="bg-ink text-bgBase font-mono font-bold uppercase text-xs px-5 py-3 border-2 border-ink hover:bg-highlight hover:text-ink disabled:opacity-60"
                  >
                    {calculating ? "[CALCULATING...]" : "Calculate Price"}
                  </button>
                </div>
              </form>

              {calcError && (
                <div className="mx-6 mb-6 border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
                  [ERR] {calcError}
                </div>
              )}

              {calcResult && (
                <div className="mx-6 mb-6 border-2 border-ink bg-bgBase p-4 font-mono text-xs">
                  <div className="flex justify-between flex-wrap gap-2 mb-3">
                    <span className="uppercase text-inkMuted">
                      Base price ({calcResult.unit}ly)
                    </span>
                    <span className="font-bold">${calcResult.basePrice}</span>
                  </div>

                  {calcResult.appliedRules.length === 0 ? (
                    <p className="text-inkMuted uppercase">No rules matched — base price stands.</p>
                  ) : (
                    <div className="space-y-1 mb-3">
                      {calcResult.appliedRules.map((r) => (
                        <div key={r.ruleId} className="flex justify-between">
                          <span>
                            {r.name} (
                            {r.adjustmentType === "percentage"
                              ? `${r.adjustmentValue > 0 ? "+" : ""}${r.adjustmentValue}%`
                              : `${r.adjustmentValue > 0 ? "+$" : "-$"}${Math.abs(
                                  r.adjustmentValue
                                )}`}
                            )
                          </span>
                          <span>
                            ${r.priceBefore} &rarr; ${r.priceAfter}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between border-t-2 border-ink pt-3 font-bold text-base">
                    <span className="uppercase">Final Price</span>
                    <span className="text-highlight">${calcResult.finalPrice}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {actionError && (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2 mb-6">
            [ERR] {actionError}
          </div>
        )}

        <p className="font-mono text-xs uppercase text-inkMuted font-bold mb-3">Active rules</p>

        {loading ? (
          <p className="font-mono text-sm text-inkMuted uppercase">[LOADING...]</p>
        ) : error ? (
          <div className="border-2 border-alert text-alert font-mono font-bold uppercase text-xs px-3 py-2">
            [ERR] {error}
          </div>
        ) : visibleRules.length === 0 ? (
          <div className="border-4 border-ink bg-bgAlt p-10 text-center font-mono uppercase text-sm text-inkMuted">
            {contextSlot ? (
              <>
                No rules apply to slot {contextSlot.slotNumber} yet.{" "}
                <Link to={newRuleLink} className="text-ink font-bold underline">
                  Create one for it
                </Link>
                .
              </>
            ) : (
              <>
                No pricing rules yet.{" "}
                <Link to="/pricing-rules/new" className="text-ink font-bold underline">
                  Create your first one
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRules.map((rule) => {
              const locked = ruleIsLocked(rule, slots);
              return (
                <div
                  key={rule._id}
                  className={`border-2 border-ink bg-bgBase p-4 flex items-center justify-between gap-4 flex-wrap ${
                    !rule.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-display font-bold uppercase tracking-tight">
                        {rule.name}
                      </span>
                      {!rule.active && (
                        <span className="font-mono text-[10px] uppercase font-bold border-2 border-inkMuted text-inkMuted px-2 py-0.5">
                          Inactive
                        </span>
                      )}
                      {locked && (
                        <span className="font-mono text-[10px] uppercase font-bold border-2 border-highlight text-highlight px-2 py-0.5">
                          Locked — active booking
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {describeTags(rule).map((tag, i) => (
                        <span
                          key={i}
                          className="font-mono text-[10px] uppercase font-bold border-2 border-ink px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono font-bold text-lg ${
                        rule.adjustmentValue >= 0 ? "text-safe" : "text-alert"
                      }`}
                    >
                      {formatAdjustment(rule)}
                    </span>

                    {locked ? (
                      <span
                        className="border-2 border-inkMuted text-inkMuted px-3 py-2 font-mono text-[10px] font-bold uppercase cursor-not-allowed"
                        title="This rule currently applies to a slot with an active booking. Edit/pause/delete are disabled until it ends or is cancelled."
                      >
                        Locked
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <Link
                          to={`/pricing-rules/${rule._id}/edit`}
                          title="Edit rule"
                          className="border-2 border-ink p-2 hover:bg-ink hover:text-bgBase"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => handleToggle(rule)}
                          title={rule.active ? "Deactivate rule" : "Activate rule"}
                          className="border-2 border-ink px-3 py-2 font-mono text-[10px] font-bold uppercase hover:bg-highlight"
                        >
                          {rule.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          title="Delete rule"
                          className="border-2 border-alert text-alert p-2 hover:bg-alert hover:text-bgBase"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default PricingRules;