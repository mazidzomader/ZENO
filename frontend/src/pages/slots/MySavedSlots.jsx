import { useEffect, useState } from "react";
import API from "../../services/api";
import Layout from "../../components/Layout";

export default function MySavedSlots() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    try {
      const res = await API.get("/favourites");
      setFavourites(res.data.favourites || []);
    } catch (error) {
      console.error("Failed to load favourites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">
          MY SAVED SLOTS
        </h1>

        {loading && (
          <p>Loading saved slots...</p>
        )}

        {!loading && favourites.length === 0 && (
          <p>No saved slots yet.</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {favourites.map((fav) => (
            <div
              key={fav._id}
              className="border border-black p-4"
            >
              <h2 className="text-xl font-bold">
                {fav.slot?.slotNumber || "Slot"}
              </h2>

              <p>
                Building:{" "}
                {fav.slot?.building?.name || "Unknown"}
              </p>

              <p>
                Floor: {fav.slot?.floor || "-"}
              </p>

              <p>
                Type: {fav.slot?.type || "-"}
              </p>

              <p>
                Price/hour: $
                {fav.slot?.pricePerHour || 0}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}