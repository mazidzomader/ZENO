const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const slotRoutes = require("./routes/slotRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const recurringBookingRoutes = require("./routes/recurringBookingRoutes");
const dbRoutes = require("./routes/dbRoutes");
const buildingRoutes = require("./routes/buildingRoutes");
const pricingRuleRoutes = require("./routes/pricingRuleRoutes");
const reportRoutes = require("./routes/reportRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const checkinoutRoutes = require('./routes/checkinoutRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require("./routes/adminRoutes");
const blackoutRoutes = require("./routes/blackoutRoutes");
const { expirePendingBookings } = require("./utils/bookingExpiry");
dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/recurring-bookings", recurringBookingRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/pricing-rules", pricingRuleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use('/api/checkinout', checkinoutRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blackouts", blackoutRoutes);
app.get("/", (req, res) => {
  res.send("ZENO backend is running!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Cancel unpaid "pending" bookings whose payment window has passed, and
  // notify the renter. Runs once immediately (in case some expired while
  // the server was down), then every 60 seconds.
  expirePendingBookings().catch((err) =>
    console.error("[booking-expiry] initial sweep failed:", err.message)
  );
  setInterval(() => {
    expirePendingBookings().catch((err) =>
      console.error("[booking-expiry] sweep failed:", err.message)
    );
  }, 60 * 1000);
});