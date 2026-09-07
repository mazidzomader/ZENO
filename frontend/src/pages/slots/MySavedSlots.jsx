import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkX, Loader, ShieldAlert } from "lucide-react";
import API from "../../services/api";

function SavedSlotCard({ favourite, onRemove, removingId }) {
  const slot = favourite.slot || {};
  const building = slot.building || {};
  const isRemoving = removingId === slot._id;

  const isAvailable =
    String(slot.status || "available").toLowerCase() === "available";

  return (
    <article className="border-2 border-ink bg-bgBase p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-inkMuted">
            Slot
          </p>
          <h3 className="mt-0.5 text-2xl font-display font-black uppercase">
            {slot.slotNumber || "Slot"}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onRemove(slot._id)}
          disabled={isRemoving}
          aria-label="Remove from saved slots"
          className="flex items-center gap-1 border-2 border-ink bg-amber-400 px-2 py-1 font-mono text-[10px] font-bold uppercase text-ink hover:bg-ink hover:text-amber-400 disabled:opacity-50"
        >
          <BookmarkX className="w-3.5 h-3.5" strokeWidth={2.5} />
          {isRemoving ? "..." : "Unsave"}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="border border-ink p-2">
          <dt className="text-[10px] uppercase text-inkMuted">Building</dt>
          <dd className="mt-0.5 font-bold truncate">
            {building.name || "Unknown"}
          </dd>
        </div>

        <div className="border border-ink p-2">
          <dt className="text-[10px] uppercase text-inkMuted">Floor</dt>
          <dd className="mt-0.5 font-bold">{slot.floor ?? "—"}</dd>
        </div>

        <div className="border border-ink p-2">
          <dt className="text-[10px] uppercase text-inkMuted">Type</dt>
          <dd className="mt-0.5 font-bold uppercase">{slot.type || "—"}</dd>
        </div>

        <div className="border border-ink p-2">
          <dt className="text-[10px] uppercase text-inkMuted">Hour</dt>
          <dd className="mt-0.5 font-bold">${slot.pricePerHour ?? 0}</dd>
        </div>
      </dl>

      <div className="mt-3 pt-3 mt-auto">
        {isAvailable ? (
          <Link
            to={`/slots/${slot._id}/book`}
            className="block w-full border-2 border-ink bg-ink py-2.5 text-center font-mono text-xs font-bold uppercase text-bgBase hover:bg-bgBase hover:text-ink transition-none"
          >
            Book now
          </Link>
        ) : (
          <div className="block w-full border-2 border-ink bg-bgAlt py-2.5 text-center font-mono text-xs font-bold uppercase text-inkMuted">
            Not available
          </div>
        )}
      </div>
    </article>
  );
}

export default function MySavedSlots() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const fetchFavourites = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/favourites");
      setFavourites(res.data.favourites || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your saved slots. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleRemove = async (slotId) => {
    setRemovingId(slotId);
    try {
      await API.delete(`/favourites/${slotId}`);
      setFavourites((prev) => prev.filter((fav) => fav.slot?._id !== slotId));
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to remove this saved slot."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b-4 border-ink pb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase text-ink">
            My Saved Slots
          </h1>
          <p className="font-mono text-xs text-inkMuted mt-1 uppercase">
            Bookmarked parking spaces · [{favourites.length} SAVED]
          </p>
        </div>
        <Bookmark className="w-7 h-7 stroke-[2] text-amber-500 fill-amber-400/25" />
      </div>

      {loading && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
          <Loader className="w-5 h-5 mx-auto mb-3 animate-spin" />
          [LOADING SAVED SLOTS...]
        </div>
      )}

      {!loading && error && (
        <div className="border-2 border-alert bg-alert/10 p-4 font-mono text-xs text-alert font-bold uppercase flex items-center gap-3">
          <ShieldAlert className="w-4 h-4" />
          ERROR // {error}
        </div>
      )}

      {!loading && !error && favourites.length === 0 && (
        <div className="border-2 border-dashed border-ink p-16 text-center font-mono text-xs text-inkMuted uppercase tracking-widest">
          [EMPTY // NO SAVED SLOTS YET]
          <p className="mt-3 normal-case tracking-normal">
            Browse slots and tap the bookmark icon on any card to save it here.
          </p>
        </div>
      )}

      {!loading && !error && favourites.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favourites.map((fav) => (
            <SavedSlotCard
              key={fav._id}
              favourite={fav}
              onRemove={handleRemove}
              removingId={removingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}