import { useEffect, useState } from "react";
import API from "../../services/api";
import {
  RefreshCw,
  Building2,
  Layers,
  Ruler,
  DollarSign,
  Car,
  MapPin,
} from "lucide-react";

// Short, readable form of a Mongo ObjectId (or a populated object's _id)
const shortId = (val) => {
  if (!val) return "—";
  const id = typeof val === "object" ? val._id || val.$oid : val;
  if (!id) return "—";
  const str = String(id);
  return `#${str.slice(-6).toUpperCase()}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const money = (val) => (val === null || val === undefined || val === "" ? "—" : `$${val}`);

const statusStyles = (status) => {
  if (status === "available") return "bg-safe/15 text-safe border-safe";
  if (status === "inactive") return "bg-alert/15 text-alert border-alert";
  if (status === "occupied") return "bg-highlight/20 text-ink border-highlight";
  return "bg-bgAlt text-ink border-ink"; // reserved / unknown
};

export function CollectionGridView({ collectionName }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/db/${collectionName}`);
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    document.title = collectionName === "buildings" ? "Buildings — ZENO" : "Parking Slots — ZENO";
    return () => {
      document.title = "ZENO";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName]);

  const isBuildings = collectionName === "buildings";
  const title = isBuildings ? "Buildings" : "Parking Slots";

  const renderBuildingCard = (b) => (
    <div
      key={b._id}
      className="border-2 border-ink bg-bgBase p-4 flex flex-col gap-3 hover:bg-bgAlt/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 stroke-[2.5] shrink-0" />
          <h3 className="font-display font-bold text-lg leading-tight uppercase truncate">
            {b.name || "Untitled Building"}
          </h3>
        </div>
        <span className="font-mono text-[10px] text-inkMuted whitespace-nowrap">{shortId(b._id)}</span>
      </div>

      <div className="flex items-start gap-2 font-mono text-xs text-inkMuted">
        <MapPin className="w-3.5 h-3.5 stroke-[2.5] mt-0.5 shrink-0" />
        <span className="truncate">{b.address || "No address on file"}</span>
      </div>

      <div className="flex items-center gap-2 font-mono text-xs">
        <Layers className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
        <span>{b.totalFloors ?? "—"} Floor{b.totalFloors === 1 ? "" : "s"}</span>
      </div>

      <div className="border-t border-ink/20 pt-2 flex items-center justify-between font-mono text-[10px] text-inkMuted uppercase">
        <span>Owner {shortId(b.ownerId)}</span>
        <span>{formatDate(b.createdAt)}</span>
      </div>
    </div>
  );

  const renderSlotCard = (s) => (
    <div
      key={s._id}
      className="border-2 border-ink bg-bgBase p-4 flex flex-col gap-3 hover:bg-bgAlt/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 stroke-[2.5] shrink-0" />
          <h3 className="font-display font-bold text-lg leading-tight uppercase truncate">
            {s.slotNumber || "—"}
          </h3>
        </div>
        <span
          className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 border whitespace-nowrap ${statusStyles(
            s.status
          )}`}
        >
          {s.status || "unknown"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-inkMuted">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 stroke-[2.5]" /> Floor {s.floor ?? "—"}
        </span>
        <span className="uppercase font-bold text-ink">{s.type || "standard"}</span>
        {s.dimensions && (
          <span className="flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 stroke-[2.5]" />
            {s.dimensions.length}x{s.dimensions.width} ft
          </span>
        )}
      </div>

      <div className="border-t border-ink/20 pt-2 grid grid-cols-3 gap-2 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-inkMuted text-[10px] uppercase">/ hr</span>
          <span className="font-bold flex items-center gap-0.5">{money(s.pricePerHour)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-inkMuted text-[10px] uppercase">/ day</span>
          <span className="font-bold">{money(s.pricePerDay)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-inkMuted text-[10px] uppercase">/ month</span>
          <span className="font-bold">{money(s.pricePerMonth)}</span>
        </div>
      </div>

      <div className="border-t border-ink/20 pt-2 flex items-center justify-between font-mono text-[10px] text-inkMuted uppercase">
        <span>Bldg {shortId(s.building)}</span>
        <span>Owner {shortId(s.owner)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header Bar */}
      <div className="border-b-4 border-ink pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink flex items-center gap-3">
            {isBuildings ? <Building2 className="w-7 h-7 stroke-[2.5]" /> : <Car className="w-7 h-7 stroke-[2.5]" />}
            {title}
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

      {/* Loading */}
      {loading && (
        <div className="border-2 border-ink border-dashed p-12 text-center bg-bgAlt/10 font-mono text-xs text-ink animate-pulse uppercase tracking-widest">
          [FETCHING_MONGO_DB_DATA...]
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase">
          ERROR || {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data.length === 0 && (
        <div className="border-2 border-ink border-dashed p-12 text-center bg-bgAlt/5 font-mono text-xs text-inkMuted uppercase tracking-widest">
          [EMPTY_TABLE || NO RECORDS RECOVERED IN THIS COLLECTION]
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((item) => (isBuildings ? renderBuildingCard(item) : renderSlotCard(item)))}
        </div>
      )}
    </div>
  );
}