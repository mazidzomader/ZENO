import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";

import { RefreshCw } from "lucide-react";

export function DatabaseCollectionView() {
  const { collectionName } = useParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/db/${collectionName}`);
      // Backend already returns only records this user is allowed to see
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load database records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (collectionName) {
      document.title = getTitle();
    }
    return () => {
      document.title = "ZENO";
    };
  }, [collectionName]);

  // Dynamically extract column names from document keys
  const getColumns = () => {
    if (data.length === 0) return [];
    const allKeys = new Set();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "_id" && key !== "__v") {
          allKeys.add(key);
        }
      });
    });
    const cols = Array.from(allKeys);
    if (collectionName === "overstaypenalties") {
      cols.push("Actions");
    }
    return cols;
  };

  const handlePayPenalty = async (penaltyId) => {
    try {
      const res = await API.post(`/checkinout/penalty/${penaltyId}/pay`);
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || 'Payment initiation failed.');
    }
  };

  const columns = getColumns();

  // Handle cell formatting for brutalist display
  const formatCell = (val) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "boolean") return val ? "[TRUE]" : "[FALSE]";
    if (typeof val === "object") {
      // If it is a mongo-style sub-object (e.g. date representation or nested relation)
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Convert slug back to correct visual title
  const getTitle = () => {
    if (!collectionName) return "";
    if (collectionName === "cancellationrefunds") return "Cancellation and Refunds";
    if (collectionName === "checkinouts") return "Check-in/outs";
    if (collectionName === "subscriptionplans") return "Subscription Plans";
    if (collectionName === "parkingslots") return "Parking Slots";
    if (collectionName === "overstaypenalties") return "Overstay Penalties";
    if (collectionName === "subscriptions") return "Subscriptions";
    if (collectionName === "notifications") return "Notifications";
    return collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header Bar */}
      <div className="border-b-4 border-ink pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink">
            {getTitle()}
          </h1>
          <p className="font-mono text-xs text-inkMuted mt-1 uppercase">
            [{data.length} RECORDS]
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="md:self-end flex items-center gap-2 px-3 py-1.5 border-2 border-ink bg-bgBase font-mono text-xs font-bold uppercase tracking-wider text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline-none disabled:opacity-50"
          aria-label="Refresh collection data"
        >
          <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${loading ? "animate-spin" : ""}`} />
          Sync Readout
        </button>
      </div>

      {/* Syncing State */}
      {loading && (
        <div className="border-2 border-ink border-dashed p-12 text-center bg-bgAlt/10 font-mono text-xs text-ink animate-pulse uppercase tracking-widest">
          [FETCHING_MONGO_DB_DATA...]
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase">
          ERROR || {error}
        </div>
      )}

      {/* Empty collection table placeholder */}
      {!loading && !error && data.length === 0 && (
        <div className="border-2 border-ink border-dashed p-12 text-center bg-bgAlt/5 font-mono text-xs text-inkMuted uppercase tracking-widest">
          [EMPTY_TABLE || NO RECORDS RECOVERED IN THIS COLLECTION]
        </div>
      )}

      {/* Table grid display */}
      {!loading && !error && data.length > 0 && (
        <div className="border-2 border-ink p-1 bg-bgBase overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-ink bg-bgAlt text-ink font-bold">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="p-3 border-r border-ink last:border-r-0 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row._id || idx}
                  className="border-b border-ink/20 last:border-b-0 hover:bg-bgAlt/25 transition-colors"
                >
                  {columns.map((col) => {
                    // Custom cell for "Actions" column on overstaypenalties
                    if (col === "Actions" && collectionName === "overstaypenalties") {
                      const isPaid = row.paid === true;
                      return (
                        <td key={col} className="p-3 border-r border-ink/10 last:border-r-0">
                          {isPaid ? (
                            <span className="font-mono text-xs text-safe font-bold">PAID</span>
                          ) : (
                            <button
                              onClick={() => handlePayPenalty(row._id)}
                              className="border-2 border-ink px-3 py-1 font-mono text-xs hover:bg-ink hover:text-bgBase transition-colors"
                            >
                              PAY
                            </button>
                          )}
                        </td>
                      );
                    }
                    // Default cell for all other columns
                    return (
                      <td
                        key={col}
                        className="p-3 border-r border-ink/10 last:border-r-0 truncate max-w-xs"
                        title={formatCell(row[col])}
                      >
                        {formatCell(row[col])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
