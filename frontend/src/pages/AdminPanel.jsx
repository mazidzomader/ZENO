import { useEffect, useState, useCallback, useMemo } from "react";
import API from "../services/api";
import {
  Users,
  Building2,
  Car,
  Calendar,
  LayoutDashboard,
  Search,
  X,
  RefreshCw,
  CheckCircle,
  Trash2,
  UserX,
  UserCheck,
  DollarSign,
} from "lucide-react";

// ── Reusable UI Components ──

const TABS = [
  { id: "stats", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "buildings", label: "Buildings", icon: Building2 },
  { id: "slots", label: "Slots", icon: Car },
  { id: "bookings", label: "Bookings", icon: Calendar },
];

const SLOT_STATUS_COLORS = {
  available: "border-safe text-safe",
  occupied: "border-alert text-alert",
  reserved: "border-highlight text-highlight",
};

function FilterField({ label, ...props }) {
  return (
    <div className="flex-1 min-w-[160px]">
      <label className="font-mono text-[10px] font-bold uppercase text-inkMuted">{label}</label>
      <input {...props} className="w-full border-2 border-ink bg-bgBase p-2 font-mono text-xs focus:outline-none focus:border-highlight" />
    </div>
  );
}

function FilterSelect({ label, width = "w-36", options, ...props }) {
  return (
    <div className={width}>
      <label className="font-mono text-[10px] font-bold uppercase text-inkMuted">{label}</label>
      <select {...props} className="w-full border-2 border-ink bg-bgBase p-2 font-mono text-xs focus:outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function RefreshButton({ onClick }) {
  return (
    <button onClick={onClick} className="px-4 py-2 border-2 border-ink bg-ink text-bgBase font-mono text-xs uppercase hover:bg-highlight hover:text-ink">
      <RefreshCw className="w-4 h-4 inline mr-1" /> Refresh
    </button>
  );
}

function ErrorBanner({ message }) {
  return message ? <div className="border-2 border-alert p-3 text-alert font-mono text-xs">{message}</div> : null;
}

function StatCard({ label, icon: Icon, loading, error, children }) {
  return (
    <div className="border-2 border-ink p-5 bg-bgBase flex flex-col">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase text-inkMuted">{label}</span>
        <Icon className="w-5 h-5 text-inkMuted" />
      </div>
      {loading ? (
        <div className="h-8 animate-pulse bg-bgAlt/50 mt-2" />
      ) : error ? (
        <p className="text-alert font-mono text-xs">{error}</p>
      ) : (
        children
      )}
    </div>
  );
}

function DataTable({ columns, colSpan, loading, isEmpty, emptyMessage, children }) {
  return (
    <div className="border-2 border-ink overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <thead className="bg-bgAlt border-b-2 border-ink">
          <tr>{columns.map((c) => (<th key={c} className="p-2.5 font-bold uppercase">{c}</th>))}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colSpan} className="p-4 text-center text-inkMuted">Loading...</td></tr>
          ) : isEmpty ? (
            <tr><td colSpan={colSpan} className="p-4 text-center text-inkMuted">{emptyMessage}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

// ── Filter bar builder ──

function FilterBar({ filters, onRefresh }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {filters.map((f, i) => {
        if (f.type === "select") {
          return <FilterSelect key={i} {...f.props} options={f.options} />;
        }
        return <FilterField key={i} {...f.props} />;
      })}
      <RefreshButton onClick={onRefresh} />
    </div>
  );
}

// ── Main Component ──

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // ── State ──
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(20);
  const [usersFilter, setUsersFilter] = useState({ role: "all", status: "all", search: "" });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [buildingsError, setBuildingsError] = useState("");
  const [buildingFilters, setBuildingFilters] = useState({ name: "", address: "", owner: "" });

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [slotFilters, setSlotFilters] = useState({ building: "", owner: "", status: "", type: "", id: "" });

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingFilter, setBookingFilter] = useState({ status: "all", renter: "", building: ""  });

  const flash = (msg) => { setActionMessage(msg); setTimeout(() => setActionMessage(""), 3000); };

  // ── Fetch functions ──
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const res = await API.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      setStatsError(err.response?.data?.error || "Failed to load stats.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const params = { page: usersPage, limit: usersLimit };
      if (usersFilter.role && usersFilter.role !== "all") params.role = usersFilter.role;
      if (usersFilter.search) params.search = usersFilter.search;
      const res = await API.get("/admin/users", { params });
      setUsers(res.data.users);
      setUsersTotal(res.data.total);
    } catch (err) {
      setUsersError(err.response?.data?.error || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, usersLimit, usersFilter.role, usersFilter.search]);

  const fetchBuildings = useCallback(async () => {
    setLoadingBuildings(true);
    setBuildingsError("");
    try {
      const res = await API.get("/admin/buildings");
      setBuildings(res.data);
    } catch (err) {
      setBuildingsError(err.response?.data?.error || "Failed to load buildings.");
    } finally {
      setLoadingBuildings(false);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    setSlotsError("");
    try {
      const params = {};
      if (slotFilters.status && slotFilters.status !== "all") params.status = slotFilters.status;
      if (slotFilters.type && slotFilters.type !== "all") params.type = slotFilters.type;
      const res = await API.get("/admin/slots", { params });
      setSlots(res.data);
    } catch (err) {
      setSlotsError(err.response?.data?.error || "Failed to load slots.");
    } finally {
      setLoadingSlots(false);
    }
  }, [slotFilters.status, slotFilters.type]);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    setBookingsError("");
    try {
      const params = {};
      if (bookingFilter.status && bookingFilter.status !== "all") params.status = bookingFilter.status;
      const res = await API.get("/admin/bookings", { params });
      setBookings(res.data);
    } catch (err) {
      setBookingsError(err.response?.data?.error || "Failed to load bookings.");
    } finally {
      setLoadingBookings(false);
    }
  }, [bookingFilter.status]);

  // ── Client-side filtering ──
  const filteredUsers = useMemo(() => {
    let result = users;
    if (usersFilter.status === "active") result = result.filter((u) => u.isActive === true);
    if (usersFilter.status === "suspended") result = result.filter((u) => u.isActive === false);
    return result;
  }, [users, usersFilter.status]);

  const filteredBuildings = useMemo(() => {
    let result = buildings;
    const { name, address, owner } = buildingFilters;
    if (name) result = result.filter((b) => b.name?.toLowerCase().includes(name.toLowerCase()));
    if (address) result = result.filter((b) => b.address?.toLowerCase().includes(address.toLowerCase()));
    if (owner) result = result.filter((b) => b.ownerId?.name?.toLowerCase().includes(owner.toLowerCase()));
    return result;
  }, [buildings, buildingFilters]);

  const filteredSlots = useMemo(() => {
    let result = slots;
    const { building, owner, id } = slotFilters;
    if (building) result = result.filter((s) => s.building?.name?.toLowerCase().includes(building.toLowerCase()));
    if (owner) result = result.filter((s) => s.owner?.name?.toLowerCase().includes(owner.toLowerCase()));
    if (id) result = result.filter((s) => s.slotNumber?.toLowerCase().includes(id.toLowerCase().trim()));
    return result;
  }, [slots, slotFilters.building, slotFilters.owner, slotFilters.id]);

  const filteredBookings = useMemo(() => {
  let result = bookings;
  if (bookingFilter.renter) {
    const q = bookingFilter.renter.toLowerCase();
    result = result.filter((b) => b.renterId?.name?.toLowerCase().includes(q) || b.renterId?.email?.toLowerCase().includes(q));
  }
  if (bookingFilter.building) {
    const q = bookingFilter.building.toLowerCase();
    result = result.filter((b) => b.slotId?.building?.name?.toLowerCase().includes(q));
  }
  return result;
}, [bookings, bookingFilter.renter, bookingFilter.building]);

  // ── Effects ──
  useEffect(() => { /* eslint-disable-next-line react-hooks/set-state-in-effect */ fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === "users") { /* eslint-disable-next-line react-hooks/set-state-in-effect */ fetchUsers(); } }, [activeTab, fetchUsers]);
  useEffect(() => { if (activeTab === "buildings") { /* eslint-disable-next-line react-hooks/set-state-in-effect */ fetchBuildings(); } }, [activeTab, fetchBuildings]);
  useEffect(() => { if (activeTab === "slots") { /* eslint-disable-next-line react-hooks/set-state-in-effect */ fetchSlots(); } }, [activeTab, fetchSlots]);
  useEffect(() => { if (activeTab === "bookings") { /* eslint-disable-next-line react-hooks/set-state-in-effect */ fetchBookings(); } }, [activeTab, fetchBookings]);

  // ── Handlers ──
  const handleSuspendToggle = async (userId, currentStatus) => {
    if (!window.confirm(`Confirm ${currentStatus ? "suspend" : "activate"} this user?`)) return;
    try {
      await API.patch(`/admin/users/${userId}/suspend`);
      flash(`User ${currentStatus ? "suspended" : "activated"}.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "Action failed.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      await API.delete(`/admin/users/${userId}`);
      flash("User deleted.");
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed.");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking? The slot will be freed.")) return;
    try {
      await API.patch(`/admin/bookings/${bookingId}/cancel`);
      flash("Booking cancelled.");
      fetchBookings();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || "Cancel failed.");
    }
  };

  // ── Render ──
  const renderContent = () => {
    switch (activeTab) {
      case "stats":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Users" icon={Users} loading={loadingStats} error={statsError}>
              <span className="font-mono text-3xl font-bold mt-2">{stats?.users?.total || 0}</span>
              <div className="flex gap-4 mt-2 text-[10px] font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-ink inline-block" /> Admins {stats?.users?.admins || 0}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-highlight inline-block" /> Owners {stats?.users?.owners || 0}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-safe inline-block" /> Renters {stats?.users?.renters || 0}</span>
              </div>
            </StatCard>
            <StatCard label="Infrastructure" icon={Building2} loading={loadingStats}>
              <div className="flex items-end gap-4 mt-2">
                <div><span className="font-mono text-3xl font-bold">{stats?.buildings || 0}</span><span className="block text-[10px] text-inkMuted">Buildings</span></div>
                <div><span className="font-mono text-3xl font-bold">{stats?.slots || 0}</span><span className="block text-[10px] text-inkMuted">Slots</span></div>
              </div>
            </StatCard>
            <StatCard label="Bookings" icon={Calendar} loading={loadingStats}>
              <div className="flex items-end gap-4 mt-2">
                <div><span className="font-mono text-3xl font-bold">{stats?.bookings?.total || 0}</span><span className="block text-[10px] text-inkMuted">Total</span></div>
                <div><span className="font-mono text-3xl font-bold text-safe">{stats?.bookings?.active || 0}</span><span className="block text-[10px] text-inkMuted">Active</span></div>
              </div>
            </StatCard>
            <StatCard label="Revenue" icon={DollarSign} loading={loadingStats}>
              <span className="font-mono text-3xl font-bold text-highlight">${stats?.revenue?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-inkMuted mt-1">Total earned from completed bookings</span>
            </StatCard>
          </div>
        );

      case "users":
        return (
          <div className="space-y-4">
            <FilterBar
              onRefresh={fetchUsers}
              filters={[
                { type: "input", props: {
                  label: "Search",
                  placeholder: "Name or email",
                  value: usersFilter.search,
                  onChange: (e) => setUsersFilter({ ...usersFilter, search: e.target.value }),
                  className: "flex-1 min-w-[200px]",
                }},
                { type: "select", options: [
                  { value: "all", label: "All" }, { value: "admin", label: "Admin" },
                  { value: "owner", label: "Owner" }, { value: "renter", label: "Renter" },
                ], props: {
                  label: "Role",
                  value: usersFilter.role,
                  onChange: (e) => setUsersFilter({ ...usersFilter, role: e.target.value }),
                }},
                { type: "select", options: [
                  { value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" },
                ], props: {
                  label: "Status",
                  value: usersFilter.status,
                  onChange: (e) => setUsersFilter({ ...usersFilter, status: e.target.value }),
                }},
              ]}
            />
            <ErrorBanner message={usersError} />
            <DataTable columns={["Name", "Email", "Role", "Status", "Actions"]} colSpan={5} loading={loadingUsers} isEmpty={filteredUsers.length === 0} emptyMessage="No users found.">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="border-b border-ink/20 hover:bg-bgAlt/50">
                  <td className="p-2.5 font-bold">{u.name}</td>
                  <td className="p-2.5">{u.email}</td>
                  <td className="p-2.5 uppercase">{u.role}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 border ${u.isActive ? "border-safe text-safe" : "border-alert text-alert"}`}>
                      {u.isActive ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </td>
                  <td className="p-2.5 flex gap-1 flex-wrap">
                    <button onClick={() => handleSuspendToggle(u._id, u.isActive)} className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-bgBase" title={u.isActive ? "Suspend" : "Activate"}>
                      {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDeleteUser(u._id)} className="border-2 border-alert text-alert px-2 py-1 hover:bg-alert hover:text-bgBase" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </DataTable>
            {usersTotal > usersLimit && (
              <div className="flex justify-between items-center font-mono text-xs">
                <span>Total: {usersTotal}</span>
                <div className="flex gap-2">
                  <button onClick={() => setUsersPage((p) => Math.max(1, p - 1))} disabled={usersPage === 1} className="border border-ink px-3 py-1 disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1 border border-ink">Page {usersPage}</span>
                  <button onClick={() => setUsersPage((p) => p + 1)} disabled={usersPage * usersLimit >= usersTotal} className="border border-ink px-3 py-1 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        );

      case "buildings":
        return (
          <div className="space-y-4">
            <FilterBar
              onRefresh={fetchBuildings}
              filters={[
                { type: "input", props: { label: "Building Name", placeholder: "Search by building", value: buildingFilters.name, onChange: (e) => setBuildingFilters({ ...buildingFilters, name: e.target.value }) } },
                { type: "input", props: { label: "Address", placeholder: "Search by address", value: buildingFilters.address, onChange: (e) => setBuildingFilters({ ...buildingFilters, address: e.target.value }) } },
                { type: "input", props: { label: "Owner", placeholder: "Owner name", value: buildingFilters.owner, onChange: (e) => setBuildingFilters({ ...buildingFilters, owner: e.target.value }) } },
              ]}
            />
            <ErrorBanner message={buildingsError} />
            <DataTable columns={["Name", "Address", "Floors", "Owner"]} colSpan={4} loading={loadingBuildings} isEmpty={filteredBuildings.length === 0} emptyMessage="No buildings match filters.">
              {filteredBuildings.map((b) => (
                <tr key={b._id} className="border-b border-ink/20 hover:bg-bgAlt/50">
                  <td className="p-2.5 font-bold">{b.name}</td>
                  <td className="p-2.5">{b.address || "—"}</td>
                  <td className="p-2.5">{b.totalFloors}</td>
                  <td className="p-2.5">{b.ownerId?.name || "Unknown"}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        );

      case "slots":
        return (
          <div className="space-y-4">
            <FilterBar
              onRefresh={fetchSlots}
              filters={[
                { type: "input", props: { label: "Building Name", placeholder: "Search by building", value: slotFilters.building, onChange: (e) => setSlotFilters({ ...slotFilters, building: e.target.value }) } },
                { type: "input", props: { label: "Owner Name", placeholder: "Owner name", value: slotFilters.owner, onChange: (e) => setSlotFilters({ ...slotFilters, owner: e.target.value }) } },
                { type: "input", props: { label: "Slot Number", placeholder: "Search by slot number", value: slotFilters.id, onChange: (e) => setSlotFilters({ ...slotFilters, id: e.target.value }) } },
                { type: "select", options: [
                  { value: "", label: "All" }, { value: "available", label: "Available" }, { value: "occupied", label: "Occupied" },
                  { value: "reserved", label: "Reserved" }, { value: "inactive", label: "Inactive" },
                ], props: { label: "Status", value: slotFilters.status, onChange: (e) => setSlotFilters({ ...slotFilters, status: e.target.value }) } },
                { type: "select", options: [
                  { value: "", label: "All" }, { value: "standard", label: "Standard" }, { value: "compact", label: "Compact" },
                  { value: "large", label: "Large" }, { value: "handicap", label: "Handicap" }, { value: "ev", label: "EV" },
                ], props: { label: "Type", value: slotFilters.type, onChange: (e) => setSlotFilters({ ...slotFilters, type: e.target.value }) } },
              ]}
            />
            <ErrorBanner message={slotsError} />
            <DataTable columns={["#", "Building", "Floor", "Type", "Status", "Owner", "Price/hr"]} colSpan={7} loading={loadingSlots} isEmpty={filteredSlots.length === 0} emptyMessage="No slots match filters.">
              {filteredSlots.map((s) => (
                <tr key={s._id} className="border-b border-ink/20 hover:bg-bgAlt/50">
                  <td className="p-2.5 font-bold">{s.slotNumber}</td>
                  <td className="p-2.5">{s.building?.name || "—"}</td>
                  <td className="p-2.5">{s.floor}</td>
                  <td className="p-2.5 uppercase">{s.type}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 border ${SLOT_STATUS_COLORS[s.status] || "border-inkMuted text-inkMuted"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-2.5">{s.owner?.name || "—"}</td>
                  <td className="p-2.5">${s.pricePerHour}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        );

      case "bookings":
        return (
          <div className="space-y-4">
            <FilterBar
              onRefresh={fetchBookings}
              filters={[
                { type: "input", props: { label: "Search", placeholder: "Name or email", value: bookingFilter.renter, onChange: (e) => setBookingFilter({ ...bookingFilter, renter: e.target.value }) } },
                { type: "input", props: { label: "Building Name", placeholder: "Search by building", value: bookingFilter.building, onChange: (e) => setBookingFilter({ ...bookingFilter, building: e.target.value }) } },
                { type: "select", options: [
                  { value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "confirmed", label: "Confirmed" },
                  { value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
                ], props: { label: "Status", width: "w-40", value: bookingFilter.status, onChange: (e) => setBookingFilter({ ...bookingFilter, status: e.target.value }) } },
              ]}
            />
            <ErrorBanner message={bookingsError} />
            <DataTable columns={["Renter", "Building", "Slot", "Start", "End", "Status", "Amount", "Action"]} colSpan={8} loading={loadingBookings} isEmpty={filteredBookings.length === 0} emptyMessage="No bookings match filters.">
              {filteredBookings.map((b) => (
                <tr key={b._id} className="border-b border-ink/20 hover:bg-bgAlt/50">
                  <td className="p-2.5">{b.renterId?.name || "—"}</td>
                  <td className="p-2.5">{b.slotId?.building?.name || "—"}</td>
                  <td className="p-2.5">{b.slotId?.slotNumber || "—"}</td>
                  <td className="p-2.5">{new Date(b.startTime).toLocaleString()}</td>
                  <td className="p-2.5">{new Date(b.endTime).toLocaleString()}</td>
                  <td className="p-2.5 uppercase">{b.status}</td>
                  <td className="p-2.5 font-bold">${b.totalAmount?.toFixed(2)}</td>
                  <td className="p-2.5">
                    {b.status !== "cancelled" && b.status !== "completed" ? (
                      <button onClick={() => handleCancelBooking(b._id)} className="border-2 border-alert px-2 py-1 text-alert text-[10px] font-bold uppercase hover:bg-alert hover:text-bgBase">Cancel</button>
                    ) : <span className="text-inkMuted">—</span>}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b-4 border-ink pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">Admin Control Panel</h1>
          <p className="font-mono text-xs text-inkMuted mt-1">Full system oversight – users, buildings, slots, bookings.</p>
        </div>
      </div>

      {actionMessage && (
        <div className="border-2 border-safe bg-safe/10 p-3 font-mono text-xs font-bold text-safe uppercase flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {actionMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b-2 border-ink pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-ink font-mono text-xs font-bold uppercase transition-colors ${isActive ? "bg-ink text-bgBase" : "bg-bgBase hover:bg-bgAlt"}`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2">{renderContent()}</div>
    </div>
  );
}