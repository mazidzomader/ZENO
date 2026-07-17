import { useEffect, useState, useCallback } from "react";
import "./reports.css";

// point this at your Express backend
const API_BASE = "http://localhost:5000";

const TYPE_LABEL = {
  revenue: "REVENUE",
  booking_volume: "BOOKINGS",
  occupancy: "OCCUPANCY"
};

function fmtRange(fromIso, toIso) {
  const f = new Date(fromIso);
  const t = new Date(toIso);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(f.getMonth() + 1)}/${pad(f.getDate())}\u2013${pad(t.getMonth() + 1)}/${pad(t.getDate())}`;
}

function fmtStamp(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

function StatusBadge({ status }) {
  if (status === "ready") {
    return (
      <span className="status status-ready">
        <span className="dot dot-ok"></span>READY
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="status status-failed">
        <span className="dot dot-fail"></span>FAILED
      </span>
    );
  }
  return (
    <span className="status status-processing">
      <span className="dot dot-processing"></span>PROCESSING
    </span>
  );
}

function ReportRow({ report }) {
  return (
    <tr>
      <td className="mono">{report._id.slice(-6).toUpperCase()}</td>
      <td>{TYPE_LABEL[report.type] || report.type}</td>
      <td className="mono">{fmtRange(report.dateFrom, report.dateTo)}</td>
      <td>{report.buildingId ? String(report.buildingId) : "ALL_BUILDINGS"}</td>
      <td className="mono">{report.format.toUpperCase()}</td>
      <td className="mono">{fmtStamp(report.createdAt)}</td>
      <td><StatusBadge status={report.status} /></td>
      <td>
        {report.status === "ready" ? (
          <a
            className="link-download"
            href={`${API_BASE}/api/reports/${report._id}/download`}
          >
            DOWNLOAD
          </a>
        ) : (
          <span className="link-disabled">&mdash;</span>
        )}
      </td>
    </tr>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={"seg-btn" + (value === opt.value ? " active" : "")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Reports() {
  const [reportType, setReportType] = useState("revenue");
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("2026-07-01");
  const [dateTo, setDateTo] = useState("2026-07-17");
  const [buildingId, setBuildingId] = useState("all");

  const [reports, setReports] = useState([]);
  const [logState, setLogState] = useState("loading"); // loading | ok | unreachable
  const [generating, setGenerating] = useState(false);

  const refreshReportLog = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports`);
      if (!res.ok) throw new Error("bad status " + res.status);
      const data = await res.json();
      setReports(data);
      setLogState("ok");
    } catch {
      setLogState("unreachable");
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      await refreshReportLog();
    };
    fetchInitialData();
  }, [refreshReportLog]);

  async function handleSubmit(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reportType, format, dateFrom, dateTo, buildingId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "GENERATE_FAILED");
      }
      await refreshReportLog();
    } catch (err) {
      alert("REPORT_GENERATION_FAILED: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="report-page-container">
      {/* 
        Note: The global <header> was removed here because it's managed 
        by DashboardLayout. If you still want a localized inner top sub-bar, 
        you can safely keep it here with a custom class like "report-topbar".
      */}

      <div className="body-split">
        {/* Changed class here to avoid colliding with main system sidebar layout */}
        <aside className="report-side-panel">
          <h1 className="panel-title">GENERATE_REPORT</h1>
          <p className="panel-sub">
            Compile revenue, booking volume, or occupancy data into an exportable file.
          </p>

          <form className="form-block" onSubmit={handleSubmit}>

            <div className="field-group">
              <label className="field-label">REPORT_TYPE</label>
              <SegmentedControl
                value={reportType}
                onChange={setReportType}
                options={[
                  { value: "revenue", label: "REVENUE" },
                  { value: "booking_volume", label: "BOOKINGS" },
                  { value: "occupancy", label: "OCCUPANCY" }
                ]}
              />
            </div>

            <div className="field-group split-2">
              <div>
                <label className="field-label" htmlFor="date-from">DATE_FROM</label>
                <input
                  type="date"
                  id="date-from"
                  className="field-input"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="date-to">DATE_TO</label>
                <input
                  type="date"
                  id="date-to"
                  className="field-input"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="building-select">BUILDING</label>
              <select
                id="building-select"
                className="field-input"
                value={buildingId}
                onChange={e => setBuildingId(e.target.value)}
              >
                <option value="all">ALL_BUILDINGS</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">EXPORT_FORMAT</label>
              <SegmentedControl
                value={format}
                onChange={setFormat}
                options={[
                  { value: "csv", label: "CSV" },
                  { value: "pdf", label: "PDF" }
                ]}
              />
            </div>

            <button type="submit" className="btn-generate" disabled={generating}>
              <span>{generating ? "RUNNING\u2026" : "RUN_REPORT"}</span>
              <span className="btn-arrow">&rarr;</span>
            </button>
          </form>

          <div className="sidebar-footnote">
            <span className="dot dot-idle"></span>
            Reports write to <span className="mono-em">/generated_reports</span> and remain listed until removed.
          </div>
        </aside>

        <main className="content">
          <div className="content-header">
            <h2 className="content-title">REPORT_LOG</h2>
            <span className="content-count">
              {String(reports.length).padStart(2, "0")} RECORDS
            </span>
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TYPE</th>
                <th>RANGE</th>
                <th>BUILDING</th>
                <th>FORMAT</th>
                <th>GENERATED_AT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {logState === "loading" && (
                <tr><td className="mono" colSpan={8}>LOADING_REPORT_LOG&hellip;</td></tr>
              )}
              {logState === "unreachable" && (
                <tr>
                  <td className="mono" colSpan={8}>
                    CANNOT_REACH_BACKEND &mdash; is it running at {API_BASE}?
                  </td>
                </tr>
              )}
              {logState === "ok" && reports.length === 0 && (
                <tr><td className="mono" colSpan={8}>NO_REPORTS_YET</td></tr>
              )}
              {logState === "ok" && reports.map(r => <ReportRow key={r._id} report={r} />)}
            </tbody>
          </table>
        </main>

      </div>
    </div>
  );
}

