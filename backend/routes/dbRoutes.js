const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/:collection", async (req, res) => {
  try {
    const collectionName = req.params.collection.toLowerCase();

    // Check if the requested collection is 'prelude' metadata
    if (collectionName === "prelude") {
      return res.json([
        {
          ServerVersion: "8.3.4",
          ToolVersion: "100.17.0",
          Source: "prelude.json"
        }
      ]);
    }

    const db = mongoose.connection.db;
    
    // Fetch all collection profiles in database to confirm existence
    const collections = await db.listCollections().toArray();
    const exists = collections.some(
      (col) => col.name.toLowerCase() === collectionName
    );

    if (!exists) {
      return res.json([]);
    }

    // Direct MongoDB find query
    const data = await db.collection(collectionName).find({}).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
