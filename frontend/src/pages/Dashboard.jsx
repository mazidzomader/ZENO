import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  User,
  Car,
  Star,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Building,
  ShieldCheck,
  RefreshCw,
  Loader
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/invoices/dashboard-summary");
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Dashboard · ZENO";
    fetchSummary();
    return () => {
      document.title = "ZENO";
    };
  }, []);

  const userName = user?.name || "SYS_OPERATOR";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Top Title Bar */}
      <div className="border-b-4 border-ink pb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink">
            Dashboard
          </h1>
          <p className="font-mono text-xs text-inkMuted mt-1 uppercase">
            Control Center // Logged in as {user?.role || "Guest"}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border-2 border-ink bg-bgBase font-mono text-xs font-bold uppercase tracking-wider text-ink hover:bg-highlight hover:text-bgBase transition-colors focus:outline-none disabled:opacity-50"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${loading ? "animate-spin" : ""}`} />
          Sync State
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
          <Loader className="w-5 h-5 mx-auto mb-3 animate-spin" />
          [SYNCING_DASHBOARD...]
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase flex items-center gap-3">
          <AlertCircle className="w-4 h-4" />
          ERROR // {error}
        </div>
      )}

      {/* Main Dashboard Layout */}
      {!loading && !error && summary && (
        <div className="flex flex-col gap-8">
          {/* Welcome and Header Profile Area */}
          <div className="border-2 border-ink bg-bgAlt p-6 flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center border-4 border-ink bg-bgBase text-ink font-mono text-xl font-bold shrink-0">
              {userInitials}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-600 border-2 border-ink animate-pulse" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase text-ink">
                Welcome back, {user?.name}!
              </h2>
              <p className="font-mono text-xs text-inkMuted mt-0.5 uppercase">
                Active account: {user?.email}
              </p>
            </div>
          </div>

          {/* Renter Specific View */}
          {user?.role === "renter" && (
            <div className="flex flex-col gap-8">
              {/* Header Summary Metric Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Bookings Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Total Bookings
                    </span>
                    <Calendar className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    [{summary.totalBookings || 0}]
                  </div>
                </div>

                {/* Total Spent Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Total Spending
                    </span>
                    <DollarSign className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    ৳{(summary.totalSpent || 0).toLocaleString()}
                  </div>
                </div>

                {/* Total Invoices Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Total Invoices
                    </span>
                    <FileText className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    [{summary.totalInvoices || 0}]
                  </div>
                </div>
              </div>

              {/* Vehicles & Ratings Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Saved Vehicles Section */}
                <div className="border-2 border-ink p-6 bg-bgBase flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                    <h3 className="font-display font-extrabold text-lg uppercase text-ink flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      My Vehicles
                    </h3>
                    <span className="font-mono text-[10px] bg-bgAlt px-2 py-0.5 border border-ink font-bold uppercase">
                      [{summary.vehicles?.length || 0} Saved]
                    </span>
                  </div>

                  {summary.vehicles && summary.vehicles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {summary.vehicles.map((veh, i) => (
                        <div key={i} className="border border-ink p-3 bg-bgAlt/30 flex flex-col gap-1.5">
                          <div className="font-mono text-sm font-bold tracking-tight text-ink">
                            {veh.plateNumber}
                          </div>
                          <div className="font-mono text-[10px] uppercase text-inkMuted">
                            {veh.type} · {veh.sizeClass}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-ink p-6 text-center font-mono text-xs text-inkMuted uppercase">
                      [NO_VEHICLES_REGISTERED]
                    </div>
                  )}
                </div>

                {/* Average Ratings Section */}
                <div className="border-2 border-ink p-6 bg-bgBase flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                    <h3 className="font-display font-extrabold text-lg uppercase text-ink flex items-center gap-2">
                      <Star className="w-5 h-5 text-highlight fill-highlight" />
                      Average Rating
                    </h3>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="font-mono text-5xl font-extrabold text-ink">
                      {summary.avgRating || "N/A"}
                    </div>
                    {summary.avgRating !== "N/A" && (
                      <div className="flex gap-1">
                        {Array.from({ length: Math.round(Number(summary.avgRating)) }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-highlight text-highlight" />
                        ))}
                      </div>
                    )}
                    <span className="font-mono text-[10px] text-inkMuted uppercase tracking-wide mt-1">
                      Based on reviews given
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Owner Specific View Slot (Placeholder for future implementation) */}
          {user?.role === "owner" && (
            <div className="border-2 border-dashed border-ink p-12 bg-bgBase flex flex-col items-center justify-center gap-4 text-center">
              <Building className="w-12 h-12 text-inkMuted" />
              <div>
                <h3 className="font-display font-bold text-lg uppercase text-ink">
                  Owner Dashboard Console
                </h3>
                <p className="font-mono text-xs text-inkMuted mt-1 max-w-md mx-auto uppercase">
                  Managed buildings, active slot lease rates, and facility occupancy summaries will occupy this view in the upcoming phase.
                </p>
              </div>
              <span className="font-mono text-[10px] px-3 py-1 bg-highlight border border-ink text-ink font-bold uppercase tracking-wider">
                Feature Pending Deployment
              </span>
            </div>
          )}

          {/* Admin Specific View Slot (Placeholder for future implementation) */}
          {user?.role === "admin" && (
            <div className="border-2 border-dashed border-ink p-12 bg-bgBase flex flex-col items-center justify-center gap-4 text-center">
              <ShieldCheck className="w-12 h-12 text-inkMuted" />
              <div>
                <h3 className="font-display font-bold text-lg uppercase text-ink">
                  Admin Control Panel
                </h3>
                <p className="font-mono text-xs text-inkMuted mt-1 max-w-md mx-auto uppercase">
                  System health loggers, user authorization tables, and global facility performance metrics will occupy this view in the upcoming phase.
                </p>
              </div>
              <span className="font-mono text-[10px] px-3 py-1 bg-highlight border border-ink text-ink font-bold uppercase tracking-wider">
                Feature Pending Deployment
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
