import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000";

function VehicleCard({ vehicle, onDelete, showOwner = false }) {
  return (
    <div className="border-4 border-ink bg-bgBase shadow-[4px_4px_0px_0px_rgba(17,17,17,1)] flex flex-col justify-between">
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-center border-b-2 border-ink/10 pb-1">
          <span className="font-bold text-base tracking-wider text-highlight bg-ink px-1.5 py-0.5">
            {vehicle.plateNumber}
          </span>
          <span className="text-xs font-bold uppercase bg-bgAlt px-2 py-0.5 border border-ink">
            {vehicle.sizeClass}
          </span>
        </div>
        <div>
          <span className="text-inkMuted text-xs block">MODEL_TYPE:</span>
          <span className="font-bold text-ink uppercase">{vehicle.type}</span>
        </div>
        {showOwner && vehicle.userId && (
          <div className="border-t border-ink/10 pt-1 mt-1">
            <span className="text-inkMuted text-xs block">REGISTERED_TO:</span>
            <span className="font-bold text-ink">
              {vehicle.userId.name || "Unknown User"}
              {vehicle.userId.email ? ` (${vehicle.userId.email})` : ""}
            </span>
          </div>
        )}
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(vehicle._id)}
          className="w-full border-t-2 border-ink text-center py-2 text-xs font-bold bg-bgAlt hover:bg-alert hover:text-bgBase transition-none"
        >
          REMOVE_VEHICLE
        </button>
      )}
    </div>
  );
}

function VehicleGrid({ vehicles, loading, emptyMessage, onDelete, showOwner }) {
  if (loading) {
    return (
      <div className="p-4 border-2 border-dashed border-inkMuted text-inkMuted font-mono">
        LOADING_VEHICLE_FLEET...
      </div>
    );
  }
  if (vehicles.length === 0) {
    return (
      <div className="p-8 border-4 border-ink bg-bgBase text-center text-inkMuted uppercase font-bold shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {vehicles.map((v) => (
        <VehicleCard key={v._id} vehicle={v} onDelete={onDelete} showOwner={showOwner} />
      ))}
    </div>
  );
}

export default function VehicleManagement() {
  const { user, token } = useAuth();
  const role = user?.role || "renter";

  const [myVehicles, setMyVehicles] = useState([]);
  const [buildingVehicles, setBuildingVehicles] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);

  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingBuilding, setLoadingBuilding] = useState(role === "owner");
  const [loadingAll, setLoadingAll] = useState(role === "admin");

  const [formData, setFormData] = useState({ plateNumber: "", type: "", sizeClass: "medium" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMine = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/vehicles`, { headers });
      if (!res.ok) throw new Error("Failed to load your vehicles.");
      setMyVehicles(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMine(false);
    }
  }, [token]);

  // FIXED: Removed unused 'err' variable
  const fetchBuildingVehicles = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/vehicles/building`, { headers });
      if (!res.ok) return; 
      setBuildingVehicles(await res.json());
    } catch {
      // Silently fails, no unused 'err' variable
    } finally {
      setLoadingBuilding(false);
    }
  }, [token]);

  // FIXED: Removed unused 'err' variable
  const fetchAllVehicles = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/vehicles/all`, { headers });
      if (!res.ok) return; 
      setAllVehicles(await res.json());
    } catch {
      // Silently fails, no unused 'err' variable
    } finally {
      setLoadingAll(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      fetchMine();
      if (role === "owner") fetchBuildingVehicles();
      if (role === "admin") fetchAllVehicles();
    }, 0);

    return () => clearTimeout(timer);
  }, [token, role, fetchMine, fetchBuildingVehicles, fetchAllVehicles]);

  const handleChange = (e) => {
    const value = e.target.name === "plateNumber" ? e.target.value.toUpperCase() : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
      const res = await fetch(`${API_BASE}/api/vehicles`, {
        method: "POST",
        headers,
        body: JSON.stringify(formData)
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to register vehicle.");
      }

      setFormData({ plateNumber: "", type: "", sizeClass: "medium" });
      setSuccess("VEHICLE_REGISTERED_SUCCESSFULLY");
      await fetchMine();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    setError("");
    setSuccess("");
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/vehicles/${id}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok) throw new Error("Could not remove vehicle record.");
      setSuccess("VEHICLE_REMOVED_SUCCESSFULLY");
      await fetchMine();
      if (role === "owner") await fetchBuildingVehicles();
      if (role === "admin") await fetchAllVehicles();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout>
      <div className="bg-bgAlt py-12 px-4 min-h-[calc(100vh-140px)] font-mono text-sm">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="md:col-span-1 border-4 border-ink bg-bgBase shadow-[8px_8px_0px_0px_rgba(17,17,17,1)] self-start">
            <div className="bg-ink text-bgBase px-4 py-2 font-bold uppercase text-xs flex justify-between items-center">
              <span>REGISTER_VEHICLE</span>
              <span className="text-[10px] text-highlight uppercase">{role}</span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex flex-col">
                <label className="uppercase font-bold mb-1 text-xs">License Plate Number</label>
                <input
                  type="text"
                  name="plateNumber"
                  placeholder="DHAKA-METRO-1234"
                  value={formData.plateNumber}
                  onChange={handleChange}
                  required
                  className="border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted uppercase rounded-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-1 text-xs">Vehicle Model / Type</label>
                <input
                  type="text"
                  name="type"
                  placeholder="Toyota Corolla / SUV / Bike"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase placeholder-inkMuted rounded-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="uppercase font-bold mb-1 text-xs">Size Class (Slot Match)</label>
                <select
                  name="sizeClass"
                  value={formData.sizeClass}
                  onChange={handleChange}
                  className="border-2 border-ink bg-transparent p-2 focus:outline-none focus:bg-ink focus:text-bgBase rounded-none cursor-pointer"
                >
                  <option value="small">Small (Bike / Compact)</option>
                  <option value="medium">Medium (Sedan / Crossover)</option>
                  <option value="large">Large (SUV / Truck / Van)</option>
                </select>
              </div>

              {error && (
                <div className="border-2 border-alert text-alert font-bold uppercase text-xs px-2 py-1">
                  [ERR] {error}
                </div>
              )}

              {success && (
                <div className="border-2 border-ink text-ink bg-highlight font-bold uppercase text-xs px-2 py-1">
                  [OK] {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ink text-bgBase font-bold uppercase p-3 hover:bg-highlight hover:text-ink border-2 border-ink transition-none disabled:opacity-60"
              >
                {submitting ? "> SAVING..." : "REGISTER_VEHICLE"}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-10">

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b-4 border-ink pb-2">
                <h1 className="font-display text-2xl font-bold uppercase tracking-tight">MY_VEHICLES</h1>
                <span className="bg-ink text-bgBase text-xs px-2 py-1 font-bold">
                  {String(myVehicles.length).padStart(2, "0")} TOTAL
                </span>
              </div>
              <VehicleGrid
                vehicles={myVehicles}
                loading={loadingMine}
                emptyMessage="No vehicles registered under your account. Add one using the form on the left."
                onDelete={handleDelete}
              />
            </div>

            {role === "owner" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b-4 border-ink pb-2">
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                    VEHICLES_IN_MY_BUILDINGS
                  </h2>
                  <span className="bg-ink text-bgBase text-xs px-2 py-1 font-bold">
                    {String(buildingVehicles.length).padStart(2, "0")} TOTAL
                  </span>
                </div>
                <p className="text-xs text-inkMuted -mt-2">
                  Vehicles belonging to renters who have reserved parking slots inside your properties.
                </p>
                <VehicleGrid
                  vehicles={buildingVehicles}
                  loading={loadingBuilding}
                  emptyMessage="No renter vehicles have reserved parking slots in your buildings yet."
                  showOwner
                />
              </div>
            )}

            {role === "admin" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b-4 border-ink pb-2">
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                    ALL_VEHICLES_SYSTEM_WIDE
                  </h2>
                  <span className="bg-ink text-bgBase text-xs px-2 py-1 font-bold">
                    {String(allVehicles.length).padStart(2, "0")} TOTAL
                  </span>
                </div>
                <VehicleGrid
                  vehicles={allVehicles}
                  loading={loadingAll}
                  emptyMessage="No vehicles registered anywhere in the system yet."
                  onDelete={handleDelete}
                  showOwner
                />
              </div>
            )}

          </div>

        </div>
      </div>
    </Layout>
  );
}