// ZENO — Invoice Generation (Feature: Invoice View)
// Exports two named components used in AppRoutes:
//   <InvoiceList />  →  /invoices
//   <InvoiceView />  →  /invoices/:id

import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import API from "../services/api";
import { ArrowLeft, Printer, Receipt, AlertTriangle, Loader } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function capitalize(str) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── Invoice Print Template ───────────────────────────────────────────────────
// This component is what gets sent to the printer. Styled with plain inline CSS
// so it looks clean on both screen and paper regardless of Tailwind purging.

const InvoiceTemplate = ({ inv }) => (
  <div
    style={{
      fontFamily: "'Inter', sans-serif",
      color: "#111111",
      backgroundColor: "#ffffff",
      padding: "48px",
      maxWidth: "720px",
      margin: "0 auto",
    }}
  >
    {/* ── Header ── */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: "3px solid #111111",
        paddingBottom: "24px",
        marginBottom: "32px",
      }}
    >
      <div>
        <div style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-1px" }}>
          ZENO
        </div>
        <div style={{ fontSize: "11px", color: "#555555", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Smart Parking, Simplified.
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555" }}>
          Invoice
        </div>
        <div style={{ fontSize: "20px", fontWeight: "800", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
          {inv.invoiceNumber}
        </div>
        <div style={{ fontSize: "12px", color: "#555555", marginTop: "4px" }}>
          Issued: {fmtDate(inv.createdAt)}
        </div>
      </div>
    </div>

    {/* ── Billed To + Vehicle ── */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
        marginBottom: "32px",
      }}
    >
      <div>
        <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555", marginBottom: "10px", borderBottom: "1px solid #DFDDD6", paddingBottom: "6px" }}>
          Billed To
        </div>
        <div style={{ fontSize: "15px", fontWeight: "700" }}>{inv.renter?.name ?? "—"}</div>
        <div style={{ fontSize: "12px", color: "#555555", marginTop: "4px" }}>{inv.renter?.email ?? "—"}</div>
        <div style={{ fontSize: "12px", color: "#555555", marginTop: "2px" }}>{inv.renter?.phone ?? "—"}</div>
      </div>
      <div>
        <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555", marginBottom: "10px", borderBottom: "1px solid #DFDDD6", paddingBottom: "6px" }}>
          Vehicle
        </div>
        <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "'JetBrains Mono', monospace" }}>
          {inv.vehicle?.plateNumber ?? "—"}
        </div>
        <div style={{ fontSize: "12px", color: "#555555", marginTop: "4px" }}>
          {capitalize(inv.vehicle?.type)} · {capitalize(inv.vehicle?.sizeClass)}
        </div>
      </div>
    </div>

    {/* ── Parking Details ── */}
    <div style={{ marginBottom: "32px" }}>
      <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555", marginBottom: "10px", borderBottom: "1px solid #DFDDD6", paddingBottom: "6px" }}>
        Parking Details
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <tbody>
          {[
            ["Building", inv.building?.name ?? "—"],
            ["Address", inv.building?.address ?? "—"],
            ["Slot", inv.slot ? `${inv.slot.slotNumber} (Floor ${inv.slot.floor})` : "—"],
            ["Check-in", fmtDateTime(inv.booking?.startTime)],
          ].map(([label, value]) => (
            <tr key={label} style={{ borderBottom: "1px solid #DFDDD6" }}>
              <td style={{ padding: "8px 0", fontWeight: "600", color: "#555555", width: "130px" }}>{label}</td>
              <td style={{ padding: "8px 0" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* ── Payment ── */}
    <div
      style={{
        borderTop: "2px solid #111111",
        paddingTop: "24px",
      }}
    >
      <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555", marginBottom: "10px" }}>
        Payment
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "24px" }}>
        <tbody>
          {[
            ["Method", capitalize(inv.payment?.method) ?? "—"],
            ["Transaction Ref", inv.payment?.transactionRef ?? "—"],
            ["Paid At", fmtDateTime(inv.payment?.paidAt)],
          ].map(([label, value]) => (
            <tr key={label} style={{ borderBottom: "1px solid #DFDDD6" }}>
              <td style={{ padding: "8px 0", fontWeight: "600", color: "#555555", width: "130px" }}>{label}</td>
              <td style={{ padding: "8px 0" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "baseline",
          gap: "16px",
          borderTop: "2px solid #111111",
          paddingTop: "16px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", color: "#555555" }}>
          Total Paid
        </div>
        <div style={{ fontSize: "28px", fontWeight: "800", fontFamily: "'JetBrains Mono', monospace" }}>
          ৳ {inv.payment?.amount?.toLocaleString() ?? "—"}
        </div>
      </div>
    </div>

    {/* ── Footer ── */}
    <div
      style={{
        marginTop: "48px",
        paddingTop: "16px",
        borderTop: "1px solid #DFDDD6",
        fontSize: "10px",
        color: "#555555",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}
    >
      ZENO Parking Management System · This is a system-generated invoice.
    </div>
  </div>
);

// ─── InvoiceView (/invoices/:id) ──────────────────────────────────────────────

export function InvoiceView() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get(`/invoices/${id}`);
        setInv(res.data);
        document.title = `Invoice ${res.data.invoiceNumber} · ZENO`;
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { document.title = "ZENO"; };
  }, [id]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="border-b-4 border-ink pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-ink bg-bgBase font-mono text-xs font-bold uppercase tracking-wider text-ink hover:bg-ink hover:text-bgBase transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight uppercase text-ink">
            Invoice {inv ? `// ${inv.invoiceNumber}` : ""}
          </h1>
        </div>
        {inv && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border-2 border-ink bg-ink text-bgBase font-mono text-xs font-bold uppercase tracking-wider hover:bg-highlight hover:border-highlight hover:text-ink transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Invoice
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
          <Loader className="w-5 h-5 mx-auto mb-3 animate-spin" />
          [LOADING_INVOICE...]
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-6 font-mono text-xs text-alert font-bold uppercase flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          ERROR || {error}
        </div>
      )}

      {/* Invoice */}
      {!loading && !error && inv && (
        <div className="border-2 border-ink bg-white">
          <div ref={printRef}>
            <InvoiceTemplate inv={inv} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── InvoiceList (/invoices) ──────────────────────────────────────────────────

export function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Invoices · ZENO";
    (async () => {
      try {
        const res = await API.get("/invoices");
        setInvoices(res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { document.title = "ZENO"; };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await API.delete(`/invoices/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
    } catch (err) {
      alert("Failed to delete invoice: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b-4 border-ink pb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink">
            Invoices
          </h1>
          <p className="font-mono text-xs text-inkMuted mt-1 uppercase">
            Invoice records · [{invoices.length} TOTAL]
          </p>
        </div>
        <Receipt className="w-7 h-7 stroke-[2] text-inkMuted" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
          [FETCHING_INVOICES...]
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          ERROR || {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && invoices.length === 0 && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs text-inkMuted uppercase tracking-widest">
          [EMPTY || NO INVOICES FOUND]
        </div>
      )}

      {/* Table */}
      {!loading && !error && invoices.length > 0 && (
        <div className="border-2 border-ink overflow-x-auto bg-bgBase">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-ink bg-bgAlt text-ink font-bold uppercase tracking-wider">
                <th className="p-3 border-r border-ink">Invoice No.</th>
                <th className="p-3 border-r border-ink">Issued Date</th>
                <th className="p-3 border-r border-ink">Amount (৳)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={String(inv._id)}
                  className="border-b border-ink/20 last:border-b-0 hover:bg-bgAlt/40 transition-colors"
                >
                  <td className="p-3 border-r border-ink/10 font-bold">{inv.invoiceNumber ?? "—"}</td>
                  <td className="p-3 border-r border-ink/10">{fmtDate(inv.createdAt)}</td>
                  <td className="p-3 border-r border-ink/10">
                    {inv.amount != null ? inv.amount.toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-center flex justify-center gap-2">
                    <Link
                      to={`/invoices/${inv._id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-ink bg-bgBase text-ink font-bold uppercase tracking-wider hover:bg-ink hover:text-bgBase transition-colors text-xs"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(inv._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-alert bg-bgBase text-alert font-bold uppercase tracking-wider hover:bg-alert hover:text-bgBase transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
