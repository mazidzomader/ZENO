/**
 * ZENO — Payment Test Seed Script
 * ─────────────────────────────────────────────────────────────
 * Seeds N pending bookings for a renter user so you can test
 * the Stripe payment flow end-to-end.
 *
 * Strategy:
 *  1. Connect to MongoDB
 *  2. Find an existing renter user (or the first user with role=renter)
 *  3. Find existing parking slots
 *  4. Insert realistic pending bookings linked to real IDs
 *
 * Usage:
 *   node seed-pending-bookings.js
 *   node seed-pending-bookings.js --email test@renter.com --count 5
 *   node seed-pending-bookings.js --clear   (removes ALL previously seeded bookings)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const args = process.argv.slice(2);

// ── CLI args ──────────────────────────────────────────────────────────────────
const emailArg   = args.includes("--email") ? args[args.indexOf("--email") + 1] : null;
const countArg   = args.includes("--count") ? parseInt(args[args.indexOf("--count") + 1], 10) : 5;
const clearMode  = args.includes("--clear");

// ── Helpers ───────────────────────────────────────────────────────────────────
const randomBetween = (min, max) => Math.random() * (max - min) + min;
const hoursFromNow  = (h) => new Date(Date.now() + h * 3600 * 1000);

const SLOT_TYPES   = ["standard", "compact", "large", "ev", "handicap"];
const SLOT_LABELS  = ["A1", "A2", "B3", "C4", "D5", "E6", "F7", "G8", "H9"];

async function main() {
  console.log("\n🚀 ZENO Seed Script — Pending Bookings for Payment Testing\n");

  // ── Connect ───────────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const db = mongoose.connection.db;

  // ── Clear mode ────────────────────────────────────────────────────────────
  if (clearMode) {
    const result = await db.collection("bookings").deleteMany({
      _seed: true,
    });
    console.log(`🗑️  Cleared ${result.deletedCount} seeded pending booking(s).\n`);
    await mongoose.disconnect();
    return;
  }

  // ── Find target renter ────────────────────────────────────────────────────
  let renter;
  if (emailArg) {
    renter = await db.collection("users").findOne({ email: emailArg.toLowerCase() });
    if (!renter) {
      console.error(`❌ No user found with email: ${emailArg}`);
      await mongoose.disconnect();
      process.exit(1);
    }
  } else {
    // Default: first renter in DB
    renter = await db.collection("users").findOne({ role: "renter" });
  }

  if (!renter) {
    console.error("❌ No renter user found in DB. Register a renter account first, then re-run.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤 Seeding for renter: ${renter.name} (${renter.email}) — ID: ${renter._id}\n`);

  // ── Find slots ────────────────────────────────────────────────────────────
  const slots = await db.collection("parkingslots").find({}).limit(20).toArray();

  let slotPool = slots;
  let useFakeSlots = false;

  if (slots.length === 0) {
    console.warn("⚠️  No parking slots found. Will use placeholder slot IDs.\n");
    useFakeSlots = true;
    // Generate fake slot-like ObjectIds as placeholders
    slotPool = Array.from({ length: 5 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      slotNumber: SLOT_LABELS[i],
      floor: i + 1,
      pricePerHour: randomBetween(2, 10),
    }));
  } else {
    console.log(`🅿️  Found ${slots.length} real parking slot(s) — will link bookings to them.\n`);
  }

  // ── Build bookings ────────────────────────────────────────────────────────
  const count = isNaN(countArg) ? 5 : Math.min(countArg, 20);
  const bookingsToInsert = [];

  for (let i = 0; i < count; i++) {
    const slot       = slotPool[i % slotPool.length];
    const durationH  = Math.round(randomBetween(1, 8));
    const startOffset = randomBetween(1, 72);   // starts within next 3 days
    const startTime  = hoursFromNow(startOffset);
    const endTime    = new Date(startTime.getTime() + durationH * 3600 * 1000);
    const pricePerH  = slot.pricePerHour ?? randomBetween(2, 10);
    const totalAmount = parseFloat((pricePerH * durationH).toFixed(2));

    bookingsToInsert.push({
      renterId:    renter._id,
      slotId:      slot._id,
      vehicleId:   null,
      startTime,
      endTime,
      status:      "pending",
      totalAmount,
      createdAt:   new Date(),
      _seed:       true,    // marker so --clear can remove them safely
    });
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const result = await db.collection("bookings").insertMany(bookingsToInsert);
  console.log(`✅ Inserted ${result.insertedCount} pending booking(s):\n`);

  bookingsToInsert.forEach((b, idx) => {
    const id = Object.values(result.insertedIds)[idx];
    console.log(
      `  [${idx + 1}] ID: ${id}  Slot: ${b.slotId}  Amount: $${b.totalAmount}  Duration: ${
        Math.round((b.endTime - b.startTime) / 3600000)
      }h  Start: ${b.startTime.toLocaleString()}`
    );
  });

  console.log(`
─────────────────────────────────────────────────────────────
✅ Done! Go to http://localhost:5173/payments to test payment.

   Test card:  4242 4242 4242 4242
   Expiry:     Any future date  |  CVC: Any 3 digits

   To clean up seeded data later:
   node seed-pending-bookings.js --clear
─────────────────────────────────────────────────────────────
`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
