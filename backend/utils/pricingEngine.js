const Slot = require("../models/Slot");
const PricingRule = require("../models/PricingRule");

const UNIT_TO_FIELD = {
  hour: "pricePerHour",
  day: "pricePerDay",
  month: "pricePerMonth",
};

// Converts "HH:MM" to minutes since midnight for easy range comparison.
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Does `datetime`'s time-of-day fall inside [timeStart, timeEnd)?
// Supports windows that wrap past midnight (e.g. 22:00 -> 06:00).
const isWithinTimeWindow = (datetime, timeStart, timeEnd) => {
  if (!timeStart || !timeEnd) return true;

  const current = datetime.getHours() * 60 + datetime.getMinutes();
  const start = toMinutes(timeStart);
  const end = toMinutes(timeEnd);

  if (start <= end) {
    return current >= start && current < end;
  }
  // Wraps past midnight
  return current >= start || current < end;
};

const isWithinFloorRange = (floor, floorFrom, floorTo) => {
  if (floorFrom !== null && floorFrom !== undefined && floor < floorFrom) {
    return false;
  }
  if (floorTo !== null && floorTo !== undefined && floor > floorTo) {
    return false;
  }
  return true;
};

// Computes current occupancy % for the slots a rule cares about
// (same building, and same slotType unless the rule is "all").
const computeOccupancyRate = async (building, slotType) => {
  const scopeFilter = { building, status: { $ne: "inactive" } };
  if (slotType !== "all") {
    scopeFilter.type = slotType;
  }

  const total = await Slot.countDocuments(scopeFilter);
  if (total === 0) return 0;

  const occupied = await Slot.countDocuments({
    ...scopeFilter,
    status: { $in: ["occupied", "reserved"] },
  });

  return (occupied / total) * 100;
};

/**
 * Computes the effective price for a slot at a given moment, after applying
 * every matching active pricing rule (slot type, floor, day/time window,
 * and live demand/occupancy).
 *
 * @param {Object} slot - A Mongoose Slot document (building/owner as ObjectIds is fine).
 * @param {Object} options
 * @param {"hour"|"day"|"month"} [options.unit="hour"]
 * @param {Date} [options.datetime=new Date()]
 * @returns {Promise<Object>} breakdown of base price, applied rules, and final price
 */
const computeSlotPrice = async (slot, options = {}) => {
  const unit = options.unit || "hour";
  const datetime = options.datetime || new Date();

  const priceField = UNIT_TO_FIELD[unit];
  if (!priceField) {
    throw new Error("unit must be one of: hour, day, month.");
  }

  const basePrice = slot[priceField];
  if (basePrice === undefined || basePrice === null) {
    throw new Error(`This slot does not offer a ${unit}ly rate.`);
  }

  const candidateRules = await PricingRule.find({
    owner: slot.owner,
    active: true,
    $or: [{ building: slot.building }, { building: null }],
  }).sort({ priority: 1 });

  const dayOfWeek = datetime.getDay();
  const matchedRules = [];
  const occupancyCache = {};

  for (const rule of candidateRules) {
    if (rule.slotType !== "all" && rule.slotType !== slot.type) continue;
    if (!isWithinFloorRange(slot.floor, rule.floorFrom, rule.floorTo)) continue;
    if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) continue;
    if (!isWithinTimeWindow(datetime, rule.timeStart, rule.timeEnd)) continue;

    if (rule.demandThreshold !== null && rule.demandThreshold !== undefined) {
      const cacheKey = `${slot.building.toString()}:${rule.slotType}`;
      if (occupancyCache[cacheKey] === undefined) {
        occupancyCache[cacheKey] = await computeOccupancyRate(
          slot.building,
          rule.slotType
        );
      }
      if (occupancyCache[cacheKey] < rule.demandThreshold) continue;
    }

    matchedRules.push(rule);
  }

  let finalPrice = basePrice;
  const appliedRules = [];

  for (const rule of matchedRules) {
    const priceBefore = finalPrice;

    if (rule.adjustmentType === "percentage") {
      finalPrice = finalPrice * (1 + rule.adjustmentValue / 100);
    } else {
      finalPrice = finalPrice + rule.adjustmentValue;
    }

    finalPrice = Math.max(0, finalPrice);

    appliedRules.push({
      ruleId: rule._id,
      name: rule.name,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      priceBefore: Math.round(priceBefore * 100) / 100,
      priceAfter: Math.round(finalPrice * 100) / 100,
    });
  }

  return {
    unit,
    datetime,
    basePrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    appliedRules,
  };
};

module.exports = { computeSlotPrice };