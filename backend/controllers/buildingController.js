const Building = require("../models/Building");
const Slot = require("../models/Slot");

// Small helper: only the building's owner (or an admin) may manage it
const canManageBuilding = (req, buildingDoc) => {
  return (
    req.user.role === "admin" ||
    buildingDoc.ownerId.toString() === req.user._id.toString()
  );
};

// @desc    Create a new building
// @route   POST /api/buildings
// @access  Private (owner, admin)
const createBuilding = async (req, res) => {
  try {
    const { name, address, totalFloors } = req.body;

    if (!name || !address || !totalFloors) {
      return res.status(400).json({
        message: "Please provide name, address, and totalFloors.",
      });
    }

    const building = await Building.create({
      ownerId: req.user._id,
      name,
      address,
      totalFloors,
    });

    res.status(201).json({
      message: "Building created successfully.",
      building,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get buildings owned by the logged-in user (admins get all)
// @route   GET /api/buildings/mine
// @access  Private (owner, admin)
const getMyBuildings = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { ownerId: req.user._id };
    const buildings = await Building.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ count: buildings.length, buildings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single building by ID
// @route   GET /api/buildings/:id
// @access  Private (that building's owner, or admin)
const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, building)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to view this building." });
    }

    res.status(200).json({ building });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a building
// @route   PUT /api/buildings/:id
// @access  Private (that building's owner, or admin)
const updateBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, building)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this building." });
    }

    // Guard against shrinking totalFloors below a floor that an existing
    // slot already occupies — that would silently make a real slot's floor
    // number invalid for every future validation check (createSlot,
    // updateSlot, bulkCreateSlots all check floor against totalFloors).
    if (req.body.totalFloors !== undefined) {
      const newTotalFloors = Number(req.body.totalFloors);

      const highestSlot = await Slot.findOne({ building: building._id })
        .sort({ floor: -1 })
        .select("floor slotNumber");

      if (highestSlot && newTotalFloors < highestSlot.floor) {
        return res.status(409).json({
          message: `Cannot reduce total floors to ${newTotalFloors} — slot "${highestSlot.slotNumber}" is on floor ${highestSlot.floor}. Move or delete that slot first.`,
        });
      }
    }

    const updatableFields = ["name", "address", "totalFloors", "location"];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        building[field] = req.body[field];
      }
    });

    await building.save();

    res.status(200).json({
      message: "Building updated successfully.",
      building,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a building
// @route   DELETE /api/buildings/:id
// @access  Private (that building's owner, or admin)
const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    if (!canManageBuilding(req, building)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this building." });
    }

    // Block if any slot in this building currently has an active booking —
    // same class of protection as slot deletion.
    const activeSlot = await Slot.findOne({
      building: building._id,
      status: { $in: ["reserved", "occupied"] },
    }).select("slotNumber status");

    if (activeSlot) {
      return res.status(409).json({
        message: `This building has an active booking on slot "${activeSlot.slotNumber}" (status: "${activeSlot.status}") and cannot be deleted until it ends or is cancelled.`,
      });
    }

    // Even if no slot is actively booked, deleting the building while any
    // slot still references it would orphan that slot — every slot lookup
    // (edit, deactivate, delete, bulk create) depends on the building
    // existing. Require the owner to clear out slots first.
    const anySlot = await Slot.findOne({ building: building._id }).select(
      "slotNumber"
    );

    if (anySlot) {
      return res.status(409).json({
        message: `This building still has slots (e.g. "${anySlot.slotNumber}"). Delete or reassign all of its slots before deleting the building.`,
      });
    }

    await building.deleteOne();

    res.status(200).json({ message: "Building deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBuilding,
  getMyBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
};