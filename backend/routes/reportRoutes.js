// ZENO — Reports and Export System (Feature 20)
// Requires one extra dependency needs to install once:
//   npm install pdfkit

/* so this file never crashes with "OverwriteModelError" if a someone(teammate) */
/* also defines Booking/Payment/ParkingSlot/Report elsewhere.*/
//so this never overrides their schema.

const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const router = express.Router();


const Report =
  mongoose.models.Report ||
  mongoose.model(
    "Report",
    new mongoose.Schema({
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type: { type: String, enum: ["revenue", "booking_volume", "occupancy"], required: true },
      format: { type: String, enum: ["csv", "pdf"], required: true },
      buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", default: null },
      dateFrom: { type: Date, required: true },
      dateTo: { type: Date, required: true },
      status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
      fileUrl: { type: String, default: null },
      createdAt: { type: Date, default: Date.now }
    })
  );


const Booking =
  mongoose.models.Booking ||
  mongoose.model(
    "Booking",
    new mongoose.Schema({
      renterId: mongoose.Schema.Types.ObjectId,
      slotId: mongoose.Schema.Types.ObjectId,
      vehicleId: mongoose.Schema.Types.ObjectId,
      startTime: Date,
      endTime: Date,
      status: String,
      totalAmount: Number,
      createdAt: { type: Date, default: Date.now }
    })
  );

const Payment =
  mongoose.models.Payment ||
  mongoose.model(
    "Payment",
    new mongoose.Schema({
      bookingId: mongoose.Schema.Types.ObjectId,
      amount: Number,
      method: String,
      transactionRef: String,
      status: String,
      paidAt: { type: Date, default: Date.now }
    })
  );

const ParkingSlot =
  mongoose.models.ParkingSlot ||
  mongoose.model(
    "ParkingSlot",
    new mongoose.Schema({
      buildingId: mongoose.Schema.Types.ObjectId,
      floor: Number,
      slotNumber: String,
      status: String
    })
  );

/* CSV / PDF WRITERS                                                   */

const OUT_DIR = path.join(__dirname, "..", "generated_reports");

function escapeField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function writeCsv(filename, rows) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const filePath = path.join(OUT_DIR, filename);

  if (!rows.length) {
    fs.writeFileSync(filePath, "NO_DATA_IN_RANGE\n");
    return filePath;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map(h => escapeField(row[h])).join(","));
  fs.writeFileSync(filePath, lines.join("\n"));
  return filePath;
}

function writePdf(filename, title, rows) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const filePath = path.join(OUT_DIR, filename);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text("ZENO", { continued: true }).fontSize(10).text("  /  REPORTS_AND_EXPORT");
  doc.moveDown(0.5);
  doc.fontSize(14).text(title);
  doc.moveDown(1);

if (!rows.length) {
    doc.fontSize(11).text("NO_DATA_IN_RANGE");
  } else {
    const headers = Object.keys(rows[0]);
    const colWidth = (doc.page.width - 80) / headers.length;

    doc.fontSize(9).font("Helvetica-Bold");
    
    const startY = doc.y;
    // vvv Look here! Change doc.y to startY
    headers.forEach((h, i) => doc.text(h, 40 + i * colWidth, startY, { width: colWidth }));
    
    doc.moveDown(0.5);
    doc.font("Helvetica");

    rows.forEach(row => {
      const y = doc.y;
      headers.forEach((h, i) => doc.text(String(row[h] ?? ""), 40 + i * colWidth, y, { width: colWidth }));
      doc.moveDown(0.3);
    });
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}


async function buildRevenueRows(dateFrom, dateTo, buildingId) {
  const bookingFilter = {};
  if (buildingId) {
    const slots = await ParkingSlot.find({ buildingId }).select("_id");
    bookingFilter.slotId = { $in: slots.map(s => s._id) };
  }
  const bookings = await Booking.find(bookingFilter).select("_id");
  const bookingIds = bookings.map(b => b._id);

  const payments = await Payment.find({
    bookingId: { $in: bookingIds },
    status: "success",
    paidAt: { $gte: dateFrom, $lte: dateTo }
  }).sort({ paidAt: 1 });

  return payments.map(p => ({
    date: p.paidAt.toISOString().slice(0, 10),
    bookingId: String(p.bookingId),
    amount: p.amount,
    method: p.method,
    transactionRef: p.transactionRef || ""
  }));
}

async function buildBookingVolumeRows(dateFrom, dateTo, buildingId) {
  const filter = { startTime: { $gte: dateFrom, $lte: dateTo } };
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

async function buildOccupancyRows(dateFrom, dateTo, buildingId) {
  const slotFilter = buildingId ? { buildingId } : {};
  const slots = await ParkingSlot.find(slotFilter);
  const rangeMs = dateTo.getTime() - dateFrom.getTime();
  const rangeDays = Math.max(1, rangeMs / (1000 * 60 * 60 * 24));

  const rows = [];
  for (const slot of slots) {
    const bookings = await Booking.find({
      slotId: slot._id,
      status: { $in: ["confirmed", "completed"] },
      startTime: { $lte: dateTo },
      endTime: { $gte: dateFrom }
    });

    let bookedMs = 0;
    for (const b of bookings) {
      const start = b.startTime > dateFrom ? b.startTime : dateFrom;
      const end = b.endTime < dateTo ? b.endTime : dateTo;
      bookedMs += Math.max(0, end.getTime() - start.getTime());
    }

    const occupancyPct = ((bookedMs / (rangeDays * 24 * 60 * 60 * 1000)) * 100).toFixed(1);
    rows.push({
      slotId: String(slot._id),
      slotNumber: slot.slotNumber,
      floor: slot.floor,
      currentStatus: slot.status,
      occupancyPct: occupancyPct + "%"
    });
  }
  return rows;
}

const REPORT_BUILDERS = {
  revenue: buildRevenueRows,
  booking_volume: buildBookingVolumeRows,
  occupancy: buildOccupancyRows
};


// POST /api/reports/generate
router.post("/generate", async (req, res) => {
  try {
    const { type, format, dateFrom, dateTo, buildingId, generatedBy } = req.body;

    if (!REPORT_BUILDERS[type]) return res.status(400).json({ error: "INVALID_REPORT_TYPE" });
    if (!["csv", "pdf"].includes(format)) return res.status(400).json({ error: "INVALID_FORMAT" });
    if (!dateFrom || !dateTo) return res.status(400).json({ error: "DATE_RANGE_REQUIRED" });

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const report = await Report.create({
      generatedBy: generatedBy || null,
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

// GET /api/reports
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.json(reports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/reports/:id/download
router.get("/:id/download", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "REPORT_NOT_FOUND" });
    if (report.status !== "ready" || !report.fileUrl) {
      return res.status(409).json({ error: "REPORT_NOT_READY" });
    }
    const filePath = path.join(OUT_DIR, report.fileUrl);
    return res.download(filePath, report.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
