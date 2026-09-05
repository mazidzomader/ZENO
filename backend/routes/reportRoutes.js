const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const OUT_DIR = path.join(__dirname, "..", "generated_reports");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Models (safe, no overwrite) ────────────────────────────────────
const Report = mongoose.models.Report || mongoose.model("Report", new mongoose.Schema({
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["revenue", "booking_volume", "occupancy"], required: true },
  format: { type: String, enum: ["csv", "pdf"], required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", default: null },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
  fileUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}));

const Booking = mongoose.models.Booking || mongoose.model("Booking", new mongoose.Schema({
  renterId: mongoose.Schema.Types.ObjectId,
  slotId: mongoose.Schema.Types.ObjectId,
  startTime: Date, endTime: Date, status: String, totalAmount: Number
}));

const Payment = mongoose.models.Payment || mongoose.model("Payment", new mongoose.Schema({
  bookingId: mongoose.Schema.Types.ObjectId,
  amount: Number, method: String, transactionRef: String, status: String, paidAt: Date
}));

const ParkingSlot = mongoose.models.ParkingSlot || mongoose.model("ParkingSlot", new mongoose.Schema({
  buildingId: mongoose.Schema.Types.ObjectId,
  floor: Number, slotNumber: String, status: String
}));

// ─── CSV / PDF writers ──────────────────────────────────────────────
function escapeCsv(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function writeCsv(filename, rows) {
  const filePath = path.join(OUT_DIR, filename);
  if (!rows.length) {
    fs.writeFileSync(filePath, "NO_DATA_IN_RANGE\n");
    return filePath;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escapeCsv(row[h])).join(","))
  ];
  fs.writeFileSync(filePath, lines.join("\n"));
  return filePath;
}

function writePdf(filename, title, rows) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text("ZENO", { continued: true })
       .fontSize(10).text("  /  REPORTS_AND_EXPORT");
    doc.moveDown(0.5).fontSize(14).text(title).moveDown(1);

    if (!rows.length) {
      doc.fontSize(11).text("NO_DATA_IN_RANGE");
    } else {
      const headers = Object.keys(rows[0]);
      const colWidth = (doc.page.width - 80) / headers.length;

      let startY = doc.y, maxRowY = startY;
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((h, i) => {
        doc.text(h, 40 + i * colWidth, startY, { width: colWidth - 10 });
        if (doc.y > maxRowY) maxRowY = doc.y;
      });
      doc.y = maxRowY + 12;
      doc.font("Helvetica");

      rows.forEach(row => {
        if (doc.y > doc.page.height - 80) { doc.addPage(); doc.y = 40; }
        let currentY = doc.y, maxColY = currentY;
        headers.forEach((h, i) => {
          doc.text(String(row[h] ?? ""), 40 + i * colWidth, currentY, { width: colWidth - 10 });
          if (doc.y > maxColY) maxColY = doc.y;
        });
        doc.y = maxColY + 8;
      });
    }

    doc.end();
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

// ─── Report data builders ─────────────────────────────────────────────
async function buildRevenueRows(from, to, buildingId) {
  const filter = {};
  if (buildingId) {
    const slots = await ParkingSlot.find({ buildingId }).select("_id");
    filter.slotId = { $in: slots.map(s => s._id) };
  }
  const bookings = await Booking.find(filter).select("_id");
  const bookingIds = bookings.map(b => b._id);

  const payments = await Payment.find({
    bookingId: { $in: bookingIds },
    status: "success",
    paidAt: { $gte: from, $lte: to }
  }).sort({ paidAt: 1 });

  return payments.map(p => ({
    date: p.paidAt.toISOString().slice(0, 10),
    bookingId: String(p.bookingId),
    amount: p.amount,
    method: p.method,
    transactionRef: p.transactionRef || ""
  }));
}

async function buildBookingVolumeRows(from, to, buildingId) {
  const filter = { startTime: { $gte: from, $lte: to } };
  if (buildingId) {
    const slots = await ParkingSlot.find({ buildingId }).select("_id");
    filter.slotId = { $in: slots.map(s => s._id) };
  }
  const bookings = await Booking.find(filter).sort({ startTime: 1 });
  return bookings.map(b => ({
    bookingId: String(b._id),
    slotId: String(b.slotId),
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    totalAmount: b.totalAmount
  }));
}

async function buildOccupancyRows(from, to, buildingId) {
  const slotFilter = buildingId ? { buildingId } : {};
  const slots = await ParkingSlot.find(slotFilter);
  const rangeDays = Math.max(1, (to - from) / (1000 * 60 * 60 * 24));

  const rows = [];
  for (const slot of slots) {
    const bookings = await Booking.find({
      slotId: slot._id,
      status: { $in: ["confirmed", "completed"] },
      startTime: { $lte: to },
      endTime: { $gte: from }
    });
    let bookedMs = 0;
    for (const b of bookings) {
      const start = b.startTime > from ? b.startTime : from;
      const end = b.endTime < to ? b.endTime : to;
      bookedMs += Math.max(0, end - start);
    }
    const pct = ((bookedMs / (rangeDays * 24 * 60 * 60 * 1000)) * 100).toFixed(1);
    rows.push({
      slotId: String(slot._id),
      slotNumber: slot.slotNumber,
      floor: slot.floor,
      currentStatus: slot.status,
      occupancyPct: pct + "%"
    });
  }
  return rows;
}

const REPORT_BUILDERS = {
  revenue: buildRevenueRows,
  booking_volume: buildBookingVolumeRows,
  occupancy: buildOccupancyRows
};

// ─── Routes ──────────────────────────────────────────────────────────

// POST /api/reports/generate
router.post("/generate", protect, async (req, res) => {
  try {
    const { type, format, dateFrom, dateTo, buildingId } = req.body;
    if (!REPORT_BUILDERS[type]) return res.status(400).json({ error: "INVALID_REPORT_TYPE" });
    if (!["csv", "pdf"].includes(format)) return res.status(400).json({ error: "INVALID_FORMAT" });
    if (!dateFrom || !dateTo) return res.status(400).json({ error: "DATE_RANGE_REQUIRED" });

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const report = await Report.create({
      generatedBy: req.user._id,
      type,
      format,
      buildingId: buildingId && buildingId !== "all" ? buildingId : null,
      dateFrom: from,
      dateTo: to,
      status: "processing"
    });

    try {
      const rows = await REPORT_BUILDERS[type](from, to, report.buildingId);
      const baseName = `report_${report._id}`;
      let fileUrl;
      if (format === "csv") {
        fileUrl = path.basename(writeCsv(`${baseName}.csv`, rows));
      } else {
        fileUrl = path.basename(await writePdf(`${baseName}.pdf`, `${type.toUpperCase()} REPORT`, rows));
      }
      report.status = "ready";
      report.fileUrl = fileUrl;
      await report.save();
    } catch (genErr) {
      console.error("[REPORT_GEN_FAILED]", genErr);
      report.status = "failed";
      await report.save();
    }
    return res.status(201).json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/reports – list reports (authenticated, role‑filtered)
router.get("/", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") {
      filter.generatedBy = req.user._id;
    }
    const reports = await Report.find(filter).populate("generatedBy", "name").sort({ createdAt: -1 });
    const enhanced = reports.map(r => {
      const obj = r.toObject();
      obj.fileExists = obj.fileUrl ? fs.existsSync(path.join(OUT_DIR, obj.fileUrl)) : false;
      return obj;
    });
    return res.json(enhanced);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/reports/:id/download
router.get("/:id/download", protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "REPORT_NOT_FOUND" });
    if (req.user.role !== "admin" && String(report.generatedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (report.status !== "ready" || !report.fileUrl) {
      return res.status(409).json({ error: "REPORT_NOT_READY" });
    }
    const filePath = path.join(OUT_DIR, report.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "FILE_NOT_FOUND" });
    }
    return res.download(filePath, report.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// DELETE /api/reports/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "REPORT_NOT_FOUND" });
    if (req.user.role !== "admin" && String(report.generatedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (report.fileUrl) {
      const filePath = path.join(OUT_DIR, report.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await report.deleteOne();
    return res.json({ message: "Report deleted." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;