const Slot = require("../models/Slot");
const Building = require("../models/Building");
const Booking = require("../models/Booking");
// Small helper: only the building's owner (or an admin) may manage its slots
const canManageBuilding = (req, buildingDoc) => {
  return (
    req.user.role === "admin" ||
    buildingDoc.ownerId.toString() === req.user._id.toString()
  );
};

// Natural sort: "A1, A2, ... A9, A10, B1, B2" instead of "A1, A10, A2, ..."
const naturalSortBySlotNumber = (slots) => {
  return slots.sort((a, b) =>
    a.slotNumber.localeCompare(b.slotNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
};

// @desc    Create a new parking slot
// @route   POST /api/slots
// @access  Private (building owner, admin)
const createSlot = async (req, res) => {
  try {
    const {
      building,
      slotNumber,
      floor,
      type,
      dimensions,
      pricePerHour,
      pricePerDay,
      pricePerMonth,
    } = req.body;

    if (
      !building ||
      !slotNumber ||
      floor === undefined ||
      !dimensions ||
      dimensions.length === undefined ||
      dimensions.width === undefined ||
      pricePerHour === undefined
    ) {
      return res.status(400).json({
        message:
          "Please provide building, slotNumber, floor, dimensions (length & width), and pricePerHour.",
      });
    }

    const buildingDoc = await Building.findById(building);

    if (!buildingDoc) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, buildingDoc)) {
      return res.status(403).json({
        message: "You do not have permission to add slots to this building.",
      });
    }

    if (floor < 1 || floor > buildingDoc.totalFloors) {
      return res.status(400).json({
        message: `Floor must be between 1 and ${buildingDoc.totalFloors} for this building.`,
      });
    }

    const slot = await Slot.create({
      building,
      owner: req.user._id,
      slotNumber,
      floor,
      type,
      dimensions,
      pricePerHour,
      pricePerDay,
      pricePerMonth,
    });

    res.status(201).json({
      message: "Slot created successfully.",
      slot,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A slot with this number already exists in this building.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create multiple slots at once from a numbered pattern
//          e.g. prefix "A-", startNumber 1, endNumber 20 -> A-1 ... A-20
// @route   POST /api/slots/bulk
// @access  Private (building owner, admin)
const bulkCreateSlots = async (req, res) => {
  try {
    const {
      building,
      floor,
      prefix,
      startNumber,
      endNumber,
      type,
      dimensions,
      pricePerHour,
      pricePerDay,
      pricePerMonth,
    } = req.body;

    if (
      !building ||
      floor === undefined ||
      startNumber === undefined ||
      endNumber === undefined ||
      !dimensions ||
      dimensions.length === undefined ||
      dimensions.width === undefined ||
      pricePerHour === undefined
    ) {
      return res.status(400).json({
        message:
          "Please provide building, floor, startNumber, endNumber, dimensions (length & width), and pricePerHour.",
      });
    }

    const start = Number(startNumber);
    const end = Number(endNumber);

    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      return res.status(400).json({
        message:
          "startNumber and endNumber must be whole numbers, with startNumber <= endNumber.",
      });
    }

    if (end - start + 1 > 200) {
      return res.status(400).json({
        message: "Cannot generate more than 200 slots in a single batch.",
      });
    }

    const buildingDoc = await Building.findById(building);

    if (!buildingDoc) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, buildingDoc)) {
      return res.status(403).json({
        message: "You do not have permission to add slots to this building.",
      });
    }

    if (floor < 1 || floor > buildingDoc.totalFloors) {
      return res.status(400).json({
        message: `Floor must be between 1 and ${buildingDoc.totalFloors} for this building.`,
      });
    }

    // Build the list of slots to create
    const slotsToCreate = [];
    for (let n = start; n <= end; n++) {
      slotsToCreate.push({
        building,
        owner: req.user._id,
        slotNumber: `${prefix || ""}${n}`,
        floor,
        type,
        dimensions,
        pricePerHour,
        pricePerDay,
        pricePerMonth,
      });
    }

    // Check which slot numbers already exist in this building, so we can
    // skip them instead of failing the whole batch.
    const existing = await Slot.find({
      building,
      slotNumber: { $in: slotsToCreate.map((s) => s.slotNumber) },
    }).select("slotNumber");

    const existingNumbers = new Set(existing.map((s) => s.slotNumber));

    const toInsert = slotsToCreate.filter(
      (s) => !existingNumbers.has(s.slotNumber)
    );
    const skipped = slotsToCreate
      .filter((s) => existingNumbers.has(s.slotNumber))
      .map((s) => s.slotNumber);

    const created = toInsert.length > 0 ? await Slot.insertMany(toInsert) : [];

    res.status(201).json({
      message: `${created.length} slot(s) created, ${skipped.length} skipped (already exist).`,
      createdCount: created.length,
      slots: created,
      skipped,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all slots (optionally filtered by building or status)
// @route   GET /api/slots
// @access  Public

const getSlots = async (req, res) => {
  try {
    const filter = {};

    if (req.query.building) {
      filter.building = req.query.building;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // New records use "building".
    // Some older database records use the legacy field "buildingId".
    const slots = await Slot.find(filter)
      .populate("building", "name address")
      .populate("owner", "name email phone")
      .lean();

    const legacyBuildingIds = [
      ...new Set(
        slots
          .filter((slot) => !slot.building && slot.buildingId)
          .map((slot) => String(slot.buildingId))
      ),
    ];

    let legacyBuildingMap = new Map();

    if (legacyBuildingIds.length > 0) {
      const legacyBuildings = await Building.find({
        _id: { $in: legacyBuildingIds },
      })
        .select("name address")
        .lean();

      legacyBuildingMap = new Map(
        legacyBuildings.map((building) => [
          String(building._id),
          building,
        ])
      );
    }

    const enrichedSlots = slots.map((slot) => ({
      ...slot,
      building:
        slot.building ||
        (slot.buildingId
          ? legacyBuildingMap.get(String(slot.buildingId)) || null
          : null),
    }));

    naturalSortBySlotNumber(enrichedSlots);

    res.status(200).json({
      count: enrichedSlots.length,
      slots: enrichedSlots,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get slots belonging to the logged-in owner (admins get all slots)
//          Supports filtering: ?building=&floor=&type=&status=&search=
// @route   GET /api/slots/mine
// @access  Private (owner, admin)
const getMySlots = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };

    if (req.query.building) filter.building = req.query.building;
    if (req.query.floor) filter.floor = Number(req.query.floor);
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.slotNumber = { $regex: req.query.search, $options: "i" };
    }

    const slots = await Slot.find(filter).populate("building", "name address");

    naturalSortBySlotNumber(slots);

    res.status(200).json({ count: slots.length, slots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single slot by ID
// @route   GET /api/slots/:id
// @access  Public
const getSlotById = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id)
      .populate("building", "name address totalFloors")
      .populate("owner", "name email phone");
    

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    res.status(200).json({ slot });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a slot
// @route   PUT /api/slots/:id
// @access  Private (that building's owner, or admin)
const updateSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    const buildingDoc = await Building.findById(slot.building);

    if (!buildingDoc) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, buildingDoc)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this slot." });
    }

    // A slot that's currently reserved or occupied has an active booking
    // tied to it. Editing floor/price/dimensions out from under that
    // booking would silently change what the renter already paid for, so
    // block it here. Owners can still edit once the booking ends.
    if (["reserved", "occupied"].includes(slot.status)) {
      return res.status(409).json({
        message: `This slot is currently "${slot.status}" and has an active booking. Editing is disabled until the booking is completed or cancelled.`,
      });
    }

    if (req.body.floor !== undefined) {
      if (req.body.floor < 1 || req.body.floor > buildingDoc.totalFloors) {
        return res.status(400).json({
          message: `Floor must be between 1 and ${buildingDoc.totalFloors} for this building.`,
        });
      }
    }

    // "status" is intentionally excluded here — it must only change via the
    // dedicated /activate and /deactivate endpoints (or automatically by the
    // booking flow), never as a raw field edit that could desync a slot from
    // its real booking state.
    const updatableFields = [
      "slotNumber",
      "floor",
      "type",
      "dimensions",
      "pricePerHour",
      "pricePerDay",
      "pricePerMonth",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        slot[field] = req.body[field];
      }
    });

    await slot.save();

    res.status(200).json({
      message: "Slot updated successfully.",
      slot,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A slot with this number already exists in this building.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deactivate a slot (soft delete — keeps booking history intact)
// @route   PATCH /api/slots/:id/deactivate
// @access  Private (that building's owner, or admin)
const deactivateSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    const buildingDoc = await Building.findById(slot.building);

    if (!buildingDoc || !canManageBuilding(req, buildingDoc)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to modify this slot." });
    }

    if (["reserved", "occupied"].includes(slot.status)) {
      return res.status(409).json({
        message: `This slot is currently "${slot.status}" and cannot be deactivated until the active booking ends or is cancelled.`,
      });
    }

    slot.status = "inactive";
    await slot.save();

    res.status(200).json({
      message: "Slot deactivated.",
      slot,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Permanently delete a slot
// @route   DELETE /api/slots/:id
// @access  Private (that building's owner, or admin)
const deleteSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    const buildingDoc = await Building.findById(slot.building);

    if (!buildingDoc || !canManageBuilding(req, buildingDoc)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this slot." });
    }

    if (["reserved", "occupied"].includes(slot.status)) {
      return res.status(409).json({
        message: `This slot is currently "${slot.status}" and cannot be deleted while it has an active booking. Cancel or wait for the booking to complete first.`,
      });
    }

    // Extra safety net: even if status somehow drifted out of sync, never
    // delete a slot that any non-final booking still references.
    const activeBooking = await Booking.findOne({
      slotId: slot._id,
      status: { $in: ["confirmed", "active"] },
    });

    if (activeBooking) {
      return res.status(409).json({
        message:
          "This slot has an active or upcoming booking and cannot be deleted.",
      });
    }

    await slot.deleteOne();

    res.status(200).json({ message: "Slot deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reactivate a previously deactivated slot
// @route   PATCH /api/slots/:id/activate
// @access  Private (that building's owner, or admin)
const activateSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    const buildingDoc = await Building.findById(slot.building);

    if (!buildingDoc || !canManageBuilding(req, buildingDoc)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to modify this slot." });
    }

    slot.status = "available";
    await slot.save();

    res.status(200).json({
      message: "Slot reactivated.",
      slot,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = {
  createSlot,
  bulkCreateSlots,
  getSlots,
  getMySlots,
  getSlotById,
  updateSlot,
  deactivateSlot,
  activateSlot,
  deleteSlot,
};