const Building = require("../models/Building");

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

module.exports = {
  createBuilding,
  getMyBuildings,
};