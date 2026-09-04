const PricingRule = require("../models/PricingRule");
const Building = require("../models/Building");
const Slot = require("../models/Slot");
const { computeSlotPrice } = require("../utils/pricingEngine");

// Small helper: only the rule's owner (or an admin) may manage it
const canManageRule = (req, ruleDoc) => {
  return (
    req.user.role === "admin" ||
    ruleDoc.owner.toString() === req.user._id.toString()
  );
};

// If a building is provided, confirm it exists and belongs to this owner
// (or the requester is an admin) before letting them attach a rule to it.
const assertBuildingOwnership = async (req, buildingId) => {
  if (!buildingId) return null;

  const buildingDoc = await Building.findById(buildingId);
  if (!buildingDoc) {
    const error = new Error("Building not found.");
    error.statusCode = 404;
    throw error;
  }

  if (
    req.user.role !== "admin" &&
    buildingDoc.ownerId.toString() !== req.user._id.toString()
  ) {
    const error = new Error(
      "You do not have permission to attach a pricing rule to this building."
    );
    error.statusCode = 403;
    throw error;
  }

  return buildingDoc;
};

// Checks whether a rule (as it's currently defined) could apply to any slot
// that right now has an active booking (status "reserved" or "occupied").
// Mirrors the structural matching in utils/pricingEngine.js (building,
// slotType, floor range) — day/time/demand are deliberately left out, since
// this asks "could this rule affect a booked slot's price", not "does it
// apply this exact second". Only relevant for rules that are currently
// active, since inactive rules never factor into computeSlotPrice at all.
const findActiveBookingConflict = async (rule) => {
  if (!rule.active) return null;

  const filter = {
    owner: rule.owner,
    status: { $in: ["reserved", "occupied"] },
  };

  if (rule.building) {
    filter.building = rule.building;
  }

  if (rule.slotType && rule.slotType !== "all") {
    filter.type = rule.slotType;
  }

  if (rule.floorFrom !== null && rule.floorFrom !== undefined) {
    filter.floor = { ...(filter.floor || {}), $gte: rule.floorFrom };
  }

  if (rule.floorTo !== null && rule.floorTo !== undefined) {
    filter.floor = { ...(filter.floor || {}), $lte: rule.floorTo };
  }

  return Slot.findOne(filter).select("_id slotNumber");
};

const validateRulePayload = (body) => {
  const {
    name,
    adjustmentType,
    adjustmentValue,
    floorFrom,
    floorTo,
    daysOfWeek,
    timeStart,
    timeEnd,
    demandThreshold,
  } = body;

  if (!name || !adjustmentType || adjustmentValue === undefined) {
    return "Please provide name, adjustmentType, and adjustmentValue.";
  }

  if (!["percentage", "fixed"].includes(adjustmentType)) {
    return "adjustmentType must be 'percentage' or 'fixed'.";
  }

  if (
    floorFrom !== undefined &&
    floorFrom !== null &&
    floorTo !== undefined &&
    floorTo !== null &&
    Number(floorFrom) > Number(floorTo)
  ) {
    return "floorFrom cannot be greater than floorTo.";
  }

  if (daysOfWeek !== undefined && Array.isArray(daysOfWeek)) {
    const invalid = daysOfWeek.some((d) => d < 0 || d > 6);
    if (invalid) return "daysOfWeek values must be between 0 (Sun) and 6 (Sat).";
  }

  if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
    return "timeStart and timeEnd must be provided together.";
  }

  if (
    demandThreshold !== undefined &&
    demandThreshold !== null &&
    (demandThreshold < 0 || demandThreshold > 100)
  ) {
    return "demandThreshold must be between 0 and 100.";
  }

  return null;
};

// @desc    Create a new dynamic pricing rule
// @route   POST /api/pricing-rules
// @access  Private (owner, admin)
const createPricingRule = async (req, res) => {
  try {
    const validationError = validateRulePayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      building,
      name,
      slotType,
      floorFrom,
      floorTo,
      daysOfWeek,
      timeStart,
      timeEnd,
      demandThreshold,
      adjustmentType,
      adjustmentValue,
      priority,
    } = req.body;

    await assertBuildingOwnership(req, building);

    const rule = await PricingRule.create({
      owner: req.user._id,
      building: building || null,
      name,
      slotType: slotType || "all",
      floorFrom: floorFrom ?? null,
      floorTo: floorTo ?? null,
      daysOfWeek: daysOfWeek || [],
      timeStart: timeStart || null,
      timeEnd: timeEnd || null,
      demandThreshold: demandThreshold ?? null,
      adjustmentType,
      adjustmentValue,
      priority: priority ?? 0,
    });

    res.status(201).json({
      message: "Pricing rule created successfully.",
      rule,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Get pricing rules for the logged-in owner (admins get all)
// @route   GET /api/pricing-rules/mine
// @access  Private (owner, admin)
const getMyPricingRules = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };

    if (req.query.building) filter.building = req.query.building;

    const rules = await PricingRule.find(filter)
      .populate("building", "name address")
      .sort({ priority: 1, createdAt: -1 });

    res.status(200).json({ count: rules.length, rules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single pricing rule by ID
// @route   GET /api/pricing-rules/:id
// @access  Private (owner, admin)
const getPricingRuleById = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id).populate(
      "building",
      "name address"
    );

    if (!rule) {
      return res.status(404).json({ message: "Pricing rule not found." });
    }

    if (!canManageRule(req, rule)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to view this rule." });
    }

    res.status(200).json({ rule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a pricing rule
// @route   PUT /api/pricing-rules/:id
// @access  Private (rule owner, admin)
const updatePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: "Pricing rule not found." });
    }

    if (!canManageRule(req, rule)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this rule." });
    }

    // If this rule is currently live and actually reaching a slot with an
    // active booking, block edits — changing adjustmentValue, timing, or
    // scope right now would shift the live price out from under a booking
    // in progress. Owners can still edit once the booking ends/cancels.
    const conflict = await findActiveBookingConflict(rule);
    if (conflict) {
      return res.status(409).json({
        message: `This rule currently applies to slot "${conflict.slotNumber}", which has an active booking. Editing is disabled until that booking ends or is cancelled.`,
      });
    }

    const validationError = validateRulePayload({
      name: req.body.name ?? rule.name,
      adjustmentType: req.body.adjustmentType ?? rule.adjustmentType,
      adjustmentValue:
        req.body.adjustmentValue !== undefined
          ? req.body.adjustmentValue
          : rule.adjustmentValue,
      floorFrom: req.body.floorFrom !== undefined ? req.body.floorFrom : rule.floorFrom,
      floorTo: req.body.floorTo !== undefined ? req.body.floorTo : rule.floorTo,
      daysOfWeek: req.body.daysOfWeek ?? rule.daysOfWeek,
      timeStart: req.body.timeStart !== undefined ? req.body.timeStart : rule.timeStart,
      timeEnd: req.body.timeEnd !== undefined ? req.body.timeEnd : rule.timeEnd,
      demandThreshold:
        req.body.demandThreshold !== undefined
          ? req.body.demandThreshold
          : rule.demandThreshold,
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (req.body.building !== undefined) {
      await assertBuildingOwnership(req, req.body.building);
    }

    const updatableFields = [
      "building",
      "name",
      "slotType",
      "floorFrom",
      "floorTo",
      "daysOfWeek",
      "timeStart",
      "timeEnd",
      "demandThreshold",
      "adjustmentType",
      "adjustmentValue",
      "priority",
      "active",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        rule[field] = req.body[field];
      }
    });

    await rule.save();

    res.status(200).json({
      message: "Pricing rule updated successfully.",
      rule,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Toggle a pricing rule's active state
// @route   PATCH /api/pricing-rules/:id/toggle
// @access  Private (rule owner, admin)
const togglePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: "Pricing rule not found." });
    }

    if (!canManageRule(req, rule)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to modify this rule." });
    }

    // Only the "turning it off" direction is risky — a rule that's about to
    // go inactive while it's live-affecting a booked slot's price. Turning
    // a rule back on is always safe to allow.
    const isTurningOff = rule.active;
    if (isTurningOff) {
      const conflict = await findActiveBookingConflict(rule);
      if (conflict) {
        return res.status(409).json({
          message: `This rule currently applies to slot "${conflict.slotNumber}", which has an active booking. It cannot be deactivated until that booking ends or is cancelled.`,
        });
      }
    }

    rule.active = !rule.active;
    await rule.save();

    res.status(200).json({
      message: `Pricing rule ${rule.active ? "activated" : "deactivated"}.`,
      rule,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Permanently delete a pricing rule
// @route   DELETE /api/pricing-rules/:id
// @access  Private (rule owner, admin)
const deletePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: "Pricing rule not found." });
    }

    if (!canManageRule(req, rule)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this rule." });
    }

    const conflict = await findActiveBookingConflict(rule);
    if (conflict) {
      return res.status(409).json({
        message: `This rule currently applies to slot "${conflict.slotNumber}", which has an active booking. It cannot be deleted until that booking ends or is cancelled.`,
      });
    }

    await rule.deleteOne();

    res.status(200).json({ message: "Pricing rule deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate the live effective price for a slot (base price + all
//          matching pricing rules for slot type, floor, time, and demand)
// @route   GET /api/pricing-rules/calculate/:slotId?unit=hour&datetime=ISO
// @access  Public
const calculateSlotPrice = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.slotId);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    const unit = req.query.unit || "hour";
    const datetime = req.query.datetime ? new Date(req.query.datetime) : new Date();

    if (isNaN(datetime.getTime())) {
      return res.status(400).json({ message: "Invalid datetime provided." });
    }

    const result = await computeSlotPrice(slot, { unit, datetime });

    res.status(200).json({
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createPricingRule,
  getMyPricingRules,
  getPricingRuleById,
  updatePricingRule,
  togglePricingRule,
  deletePricingRule,
  calculateSlotPrice,
};