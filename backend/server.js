const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const slotRoutes = require("./routes/slotRoutes");
const dbRoutes = require("./routes/dbRoutes");
const buildingRoutes = require("./routes/buildingRoutes");
const pricingRuleRoutes = require("./routes/pricingRuleRoutes");
const reportRoutes = require("./routes/reportRoutes");
dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/pricing-rules", pricingRuleRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("ZENO backend is running!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
