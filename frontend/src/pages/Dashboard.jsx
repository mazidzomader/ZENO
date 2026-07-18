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
  Loader,
  Copy,
  MapPin,
  Phone,
  Save,
  Check,
  ExternalLink,
  Shield,
  Edit3,
  Map
} from "lucide-react";

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Owner state
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    coordinates: "",
    phone: "",
    ownerCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/invoices/dashboard-summary");
      setSummary(res.data);
      if (res.data.role === "owner" && res.data.profile) {
        setFormData({
          address: res.data.profile.address || "",
          coordinates: res.data.profile.coordinates || "",
          phone: res.data.profile.phone || "",
          ownerCode: res.data.profile.ownerCode || "",
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await API.put("/auth/profile", formData);
      updateUser(res.data.user);
      setSummary((prev) => ({
        ...prev,
        profile: {
          address: res.data.user.address || "",
          coordinates: res.data.user.coordinates || "",
          phone: res.data.user.phone || "",
          ownerCode: res.data.user.ownerCode || "",
        },
      }));
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Control Center || Logged in as {user?.role || "Guest"}
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
          ERROR || {error}
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
                      Average Given Ratings 
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

          {/* Owner Specific View */}
          {user?.role === "owner" && (
            <div className="flex flex-col gap-8">
              {/* Header Summary Metric Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Average Rating Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Avg Earned Rating
                    </span>
                    <Star className="w-4 h-4 text-highlight fill-highlight" />
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-extrabold text-ink">
                      {summary.avgRating || "N/A"}
                    </div>
                    {summary.avgRating !== "N/A" && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: Math.round(Number(summary.avgRating)) }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-highlight text-highlight" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Earned Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Total Earnings
                    </span>
                    <DollarSign className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    ৳{(summary.totalEarned || 0).toLocaleString()}
                  </div>
                </div>

                {/* Managed Buildings Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Buildings Owned
                    </span>
                    <Building className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    [{summary.totalBuildings || 0}]
                  </div>
                </div>

                {/* Active Slots Card */}
                <div className="border-2 border-ink p-5 bg-bgBase flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-inkMuted">
                      Total Slots
                    </span>
                    <Calendar className="w-4 h-4 text-inkMuted" />
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-ink">
                    [{summary.totalSlots || 0}]
                  </div>
                </div>
              </div>

              {/* Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Profile Details & Editing */}
                <div className="border-2 border-ink p-6 bg-bgBase flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                    <h3 className="font-display font-extrabold text-lg uppercase text-ink flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Owner Profile
                    </h3>
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="px-2.5 py-1 border border-ink bg-bgAlt font-mono text-[10px] font-bold uppercase hover:bg-highlight hover:text-bgBase transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Profile
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(false);
                          if (summary.profile) {
                            setFormData({
                              address: summary.profile.address || "",
                              coordinates: summary.profile.coordinates || "",
                              phone: summary.profile.phone || "",
                              ownerCode: summary.profile.ownerCode || "",
                            });
                          }
                        }}
                        className="px-2.5 py-1 border border-ink bg-bgAlt font-mono text-[10px] font-bold uppercase hover:bg-alert hover:text-bgBase transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {saveSuccess && (
                    <div className="border border-safe bg-safe/10 p-2 font-mono text-[10px] text-safe font-bold uppercase flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      SUCCESS || PROFILE_UPDATED
                    </div>
                  )}

                  {!editing ? (
                    /* Read Only Profile View */
                    <div className="flex flex-col gap-4 font-mono text-xs text-ink">
                      {/* Owner Code Space */}
                      <div className="border border-ink bg-bgAlt/20 p-3 flex flex-col gap-1.5 relative">
                        <span className="text-[9px] text-inkMuted uppercase tracking-wide">Owner Identifier Code</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm tracking-wider uppercase bg-bgAlt/50 px-2 py-0.5 border border-ink/10">
                            {summary.profile?.ownerCode || `OWNER-${user?.id?.slice(-6).toUpperCase()}`}
                          </span>
                          <button
                            onClick={() => handleCopyCode(summary.profile?.ownerCode || `OWNER-${user?.id?.slice(-6).toUpperCase()}`)}
                            className="p-1 border border-ink bg-bgBase hover:bg-highlight hover:text-bgBase transition-colors"
                            title="Copy Owner Code"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Full Address */}
                      <div className="flex flex-col gap-1 border-b border-ink/10 pb-2">
                        <span className="text-[9px] text-inkMuted uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Full Address
                        </span>
                        <span className="font-bold text-ink">
                          {summary.profile?.address || "[ADDRESS_NOT_CONFIGURED]"}
                        </span>
                      </div>

                      {/* Phone No */}
                      <div className="flex flex-col gap-1 border-b border-ink/10 pb-2">
                        <span className="text-[9px] text-inkMuted uppercase tracking-wide flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone Number
                        </span>
                        <span className="font-bold text-ink">
                          {summary.profile?.phone || "[PHONE_NOT_CONFIGURED]"}
                        </span>
                      </div>

                      {/* Coordinates link */}
                      {summary.profile?.coordinates && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-inkMuted uppercase tracking-wide flex items-center gap-1">
                            <Map className="w-3 h-3" /> Map Coordinates
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-inkMuted">
                              {summary.profile.coordinates}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summary.profile.coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-1.5 py-0.5 border border-ink bg-bgAlt text-[8px] uppercase tracking-wide hover:bg-highlight hover:text-bgBase transition-colors font-bold"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              View Map
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Profile View */
                    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 font-mono text-xs">
                      {/* Owner Code Edit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-inkMuted uppercase tracking-wide">Owner Code</label>
                        <input
                          type="text"
                          value={formData.ownerCode}
                          onChange={(e) => setFormData({ ...formData, ownerCode: e.target.value.toUpperCase() })}
                          className="w-full bg-bgAlt/30 border-2 border-ink p-2 font-mono text-xs text-ink outline-none focus:bg-bgBase"
                          placeholder="e.g. OWNER-ALPHA"
                        />
                      </div>

                      {/* Address Edit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-inkMuted uppercase tracking-wide">Full Address</label>
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full bg-bgAlt/30 border-2 border-ink p-2 font-mono text-xs text-ink outline-none focus:bg-bgBase"
                          placeholder="Enter building base address"
                        />
                      </div>

                      {/* Coordinates Edit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-inkMuted uppercase tracking-wide">Map Coordinates</label>
                        <input
                          type="text"
                          value={formData.coordinates}
                          onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                          className="w-full bg-bgAlt/30 border-2 border-ink p-2 font-mono text-xs text-ink outline-none focus:bg-bgBase"
                          placeholder="e.g. 23.8103, 90.4125"
                        />
                      </div>

                      {/* Phone Edit */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-inkMuted uppercase tracking-wide">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-bgAlt/30 border-2 border-ink p-2 font-mono text-xs text-ink outline-none focus:bg-bgBase"
                          placeholder="e.g. +8801700000000"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-4 mt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 border-2 border-ink bg-highlight text-bgBase font-bold uppercase tracking-wider hover:bg-ink hover:text-bgBase transition-colors focus:outline-none disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? "Saving..." : "Save Details"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Right Column: Recent Earned Reviews Feed */}
                <div className="border-2 border-ink p-6 bg-bgBase flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                    <h3 className="font-display font-extrabold text-lg uppercase text-ink flex items-center gap-2">
                      <Star className="w-5 h-5 text-highlight fill-highlight" />
                      Recent Reviews
                    </h3>
                    <span className="font-mono text-[10px] bg-bgAlt px-2 py-0.5 border border-ink font-bold uppercase">
                      [{summary.recentReviews?.length || 0} New]
                    </span>
                  </div>

                  {summary.recentReviews && summary.recentReviews.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {summary.recentReviews.map((rev, i) => (
                        <div key={i} className="border border-ink p-3 bg-bgAlt/20 flex flex-col gap-2 font-mono text-xs">
                          <div className="flex items-center justify-between border-b border-ink/10 pb-1.5">
                            <span className="text-[10px] font-bold text-ink">Slot: {rev.slotNumber}</span>
                            <span className="text-[8px] text-inkMuted uppercase">
                              {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: rev.rating }).map((_, rIdx) => (
                              <Star key={rIdx} className="w-3.5 h-3.5 fill-highlight text-highlight" />
                            ))}
                          </div>
                          <p className="text-[11px] text-inkMuted italic">"{rev.comment}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-ink p-12 text-center font-mono text-xs text-inkMuted uppercase">
                      [NO_REVIEWS_RECEIVED]
                    </div>
                  )}
                </div>
              </div>
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
