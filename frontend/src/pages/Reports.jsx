import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const API_BASE = "http://localhost:5000"; 

const TYPE_LABEL = {
  revenue: "REVENUE",
  booking_volume: "BOOKINGS",
  occupancy: "OCCUPANCY"
};

// ─── Formatting helpers ──────────────────────────────────────────────
function fmtRange(fromIso, toIso) {
  const f = new Date(fromIso);
  const t = new Date(toIso);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(f.getMonth()+1)}/${pad(f.getDate())}\u2013${pad(t.getMonth()+1)}/${pad(t.getDate())}`;
}

function fmtStamp(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

// ─── Status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const dotClass = status === "ready" ? "bg-ink" :
                   status === "failed" ? "bg-ink" :
                   "bg-highlight animate-pulse";
  const label = status === "ready" ? "READY" :
                status === "failed" ? "FAILED" :
                "PROCESSING";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide">
      <span className={`w-2 h-2 inline-block ${dotClass}`} />
      {label}
    </span>
  );
}

// ─── Report row ───────────────────────────────────────────────────────
function ReportRow({ report, onDelete, deleting, showAuthor, onDownload }) {
  const isFileMissing = report.status === "ready" && report.fileExists === false;

  return (
    <tr className="border-b border-ink/20 hover:bg-bgAlt/50 transition-colors">
      <td className="p-2.5 font-mono text-xs">{report._id.slice(-6).toUpperCase()}</td>
      <td className="p-2.5 text-xs font-bold uppercase">{TYPE_LABEL[report.type] || report.type}</td>
      <td className="p-2.5 font-mono text-xs">{fmtRange(report.dateFrom, report.dateTo)}</td>
      <td className="p-2.5 text-xs">{report.buildingId ? String(report.buildingId).slice(-6).toUpperCase() : "ALL"}</td>
      <td className="p-2.5 font-mono text-xs uppercase">{report.format}</td>
      <td className="p-2.5 font-mono text-xs">{fmtStamp(report.createdAt)}</td>
      {showAuthor && (
        <td className="p-2.5 text-xs">
          {report.generatedBy?.name || "Unknown"}
        </td>
      )}
      <td className="p-2.5">
        {isFileMissing ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-alert">
            <span className="w-2 h-2 inline-block bg-alert" /> MISSING
          </span>
        ) : (
          <StatusBadge status={report.status} />
        )}
      </td>
      <td className="p-2.5 flex items-center gap-2">
        {report.status === "ready" && !isFileMissing ? (
          <button
            onClick={() => onDownload(report._id, report.format)}
            className="font-mono text-xs text-ink border-b border-ink hover:border-highlight hover:text-highlight transition-colors cursor-pointer"
          >
            DOWNLOAD
          </button>
        ) : (
          <span className="font-mono text-xs text-inkMuted">&mdash;</span>
        )}
        <button
          onClick={() => onDelete(report._id)}
          disabled={deleting === report._id}
          className="font-mono text-xs text-alert border border-alert px-1.5 py-0.5 hover:bg-alert hover:text-bgBase transition-colors disabled:opacity-40"
        >
          {deleting === report._id ? "..." : "DELETE"}
        </button>
      </td>
    </tr>
  );
}

// ─── Segmented control ───────────────────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex border border-ink">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`flex-1 font-mono text-xs tracking-wide px-3 py-2 border-r border-ink last:border-r-0 ${
            value === opt.value
              ? "bg-ink text-bgBase"
              : "bg-bgBase text-ink hover:bg-bgAlt"
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Form state
  const [reportType, setReportType] = useState("revenue");
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("2026-07-01");
  const [dateTo, setDateTo] = useState("2026-07-17");
  const [buildingId, setBuildingId] = useState("all");

  // Report list state
  const [reports, setReports] = useState([]);
  const [logState, setLogState] = useState("loading");
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ─── Fetch reports ──────────────────────────────────────────────────
  const refreshReportLog = useCallback(async () => {
    try {
      const res = await API.get("/reports");
      setReports(res.data);
      setLogState("ok");
    } catch {
      setLogState("unreachable");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshReportLog();
  }, [refreshReportLog]);

  // ─── Delete handler ──────────────────────────────────────────────────
  const handleDelete = async (reportId) => {
    if (!window.confirm("Delete this report? ...")) return;
    setDeletingId(reportId);
    try {
      await API.delete(`/reports/${reportId}`);
      await refreshReportLog();
    } catch (err) {
      alert("Failed to delete report.");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Generate handler ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        type: reportType,
        format,
        dateFrom,
        dateTo,
        buildingId: buildingId === "all" ? null : buildingId
      };
      await API.post("/reports/generate", payload);
      await refreshReportLog();
    } catch (err) {
      alert("REPORT_GENERATION_FAILED: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId, format) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Download failed");
      }
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_${reportId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-0">
      {/* Left Panel – Generator */}
      <aside className="w-full md:w-[30%] min-w-[280px] border-b md:border-b-0 md:border-r-2 border-ink bg-bgAlt p-6 md:p-7">
        <h1 className="font-display text-xl font-bold uppercase tracking-tight">Generate Report</h1>
        <p className="font-mono text-xs text-inkMuted mt-1 mb-6">
          Compile revenue, booking volume, or occupancy data into an exportable file.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Report Type</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full border-2 border-ink bg-bgBase p-2 font-mono text-xs focus:outline-none focus:border-highlight"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full border-2 border-ink bg-bgBase p-2 font-mono text-xs focus:outline-none focus:border-highlight"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Building</label>
            <select
              value={buildingId}
              onChange={e => setBuildingId(e.target.value)}
              className="w-full border-2 border-ink bg-bgBase p-2 font-mono text-xs focus:outline-none focus:border-highlight"
            >
              <option value="all">ALL BUILDINGS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Export Format</label>
            <SegmentedControl
              value={format}
              onChange={setFormat}
              options={[
                { value: "csv", label: "CSV" },
                { value: "pdf", label: "PDF" }
              ]}
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-ink text-bgBase font-mono text-xs font-bold uppercase tracking-wider p-3 border-2 border-ink hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60 flex items-center justify-between"
          >
            <span>{generating ? "RUNNING…" : "RUN REPORT"}</span>
            <span className="text-lg">&rarr;</span>
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-ink flex items-center gap-2 font-mono text-xs text-inkMuted">
          <span className="w-2 h-2 bg-highlight shrink-0" />
          <span>Reports write to <span className="font-bold text-ink">/generated_reports</span> and remain listed until removed.</span>
        </div>
      </aside>

      {/* Right Panel – Report Log */}
      <main className="w-full md:w-[70%] p-6 md:p-7">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight">Report Log</h2>
          <span className="font-mono text-xs text-inkMuted font-bold">
            {String(reports.length).padStart(2, "0")} RECORDS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-bgAlt border-b-0 border-ink">
              <tr>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">ID</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Type</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Range</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Bldg</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Format</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Generated</th>
                {isAdmin && (
                  <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Created By</th>
                )}
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Status</th>
                <th className="p-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">Action</th>
              </tr>
            </thead>
            <tbody>
              {logState === "loading" && (
                <tr><td colSpan={isAdmin ? 9 : 8} className="p-4 font-mono text-xs text-inkMuted text-center">LOADING REPORT LOG…</td></tr>
              )}
              {logState === "unreachable" && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-4 font-mono text-xs text-alert text-center">
                    CANNOT_REACH_BACKEND — is it running at {API_BASE}?
                  </td>
                </tr>
              )}
              {logState === "ok" && reports.length === 0 && (
                <tr><td colSpan={isAdmin ? 9 : 8} className="p-4 font-mono text-xs text-inkMuted text-center">NO REPORTS YET</td></tr>
              )}
              {logState === "ok" && reports.map(r => (
                <ReportRow
                  key={r._id}
                  report={r}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  deleting={deletingId}
                  showAuthor={isAdmin}
                />
              ))}
            </tbody>
            <tfoot className="bg-bgAlt border-b-0 border-ink"><tr><td colSpan={isAdmin ? 9 : 8}></td></tr></tfoot>
          </table>
        </div>
      </main>
    </div>
  );
}