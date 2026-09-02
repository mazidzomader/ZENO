import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import API from "../services/api";

import L from "leaflet";

// ── Custom SVG pin factory ────────────────────────────────────────────────────
function makePinIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 24 14 24S28 23.63 28 14C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="#ffffffff" stroke-width="1"/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });
}

const OriginIcon      = makePinIcon("#16a34a"); // green-600
const DestinationIcon = makePinIcon("#2563eb"); // blue-600

// Default fallback center (Dhaka) — only used when geolocation is unavailable
const DEFAULT_CENTER = [23.8103, 90.4125];

// ── Map controller ────────────────────────────────────────────────────────────
// Only re-pans when bounds/center actually change (referentially stable values).
function MapController({ center, bounds }) {
  const map = useMap();
  const didFitBounds = useRef(false);

  useEffect(() => {
    if (bounds) {
      // Only auto-fit once when a new route loads; don't re-snap when user pans
      if (!didFitBounds.current) {
        map.fitBounds(bounds, { padding: [60, 60] });
        didFitBounds.current = true;
      }
    } else {
      didFitBounds.current = false;
      if (center) map.setView(center, 14);
    }
  }, [center, bounds, map]);
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getBookingLabel(b) {
  const slot = b.slotId?.slotNumber || "?";
  const building = b.slotId?.building?.name || "";
  const address = b.slotId?.building?.address || "";
  const date = new Date(b.startTime).toLocaleDateString();
  if (building) {
    return `Slot ${slot} • ${building}${address ? ` — ${address}` : ""} • ${date}`;
  }
  return `Slot ${slot} • ${date}`;
}

function hasValidCoords(booking) {
  const loc = booking?.slotId?.building?.location;
  return loc && typeof loc.lat === "number" && typeof loc.lng === "number";
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Navigation() {
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [destination, setDestination] = useState(null);
  const [noCoordError, setNoCoordError] = useState("");

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [routingError, setRoutingError] = useState("");
  const [isRouting, setIsRouting] = useState(false);

  // Ref to cancel in-flight OSRM requests when a new one starts
  const abortControllerRef = useRef(null);

  // ── 1. Get User Location ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserLocation(DEFAULT_CENTER);
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoadingLocation(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setUserLocation(DEFAULT_CENTER);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // ── 2. Fetch Confirmed Bookings ──────────────────────────────────────────────
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await API.get("/bookings/history", {
          params: { status: "confirmed" },
        });
        if (response.data?.bookings) {
          setBookings(response.data.bookings);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchBookings();
  }, []);

  // ── 3. Handle Booking Selection ──────────────────────────────────────────────
  const handleBookingChange = (e) => {
    const bookingId = e.target.value;

    // Reset all derived state, including any in-progress routing state
    setRouteCoordinates([]);
    setEta(null);
    setDistance(null);
    setRoutingError("");
    setNoCoordError("");
    setIsRouting(false);

    if (!bookingId) {
      setSelectedBooking(null);
      setDestination(null);
      return;
    }

    const booking = bookings.find((b) => b._id === bookingId);
    setSelectedBooking(booking);

    if (!hasValidCoords(booking)) {
      // Building exists but has no GPS — show a clear error, do NOT silently fallback
      setDestination(null);
      setNoCoordError(
        `"${booking?.slotId?.building?.name || "This building"}" has no GPS coordinates set. Contact the owner to update the building location.`
      );
      return;
    }

    const loc = booking.slotId.building.location;
    setDestination([loc.lat, loc.lng]);
  };

  // ── 4. Fetch Route from OSRM (with AbortController) ─────────────────────────
  useEffect(() => {
    if (!userLocation || !destination) {
      setRouteCoordinates([]);
      setEta(null);
      setDistance(null);
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchRoute = async () => {
      setIsRouting(true);
      setRoutingError("");
      try {
        const [startLat, startLng] = userLocation;
        const [destLat, destLng] = destination;

        // OSRM expects: {lng},{lat}
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

        const response = await fetch(osrmUrl, { signal: controller.signal });
        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No route found between these two points.");
        }

        const route = data.routes[0];

        // Distance: meters → km
        const distKm = (route.distance / 1000).toFixed(1);
        setDistance(`${distKm} km`);

        // ETA: seconds → minutes
        const durationMin = Math.ceil(route.duration / 60);
        setEta(`${durationMin} min`);

        // OSRM returns GeoJSON [lng, lat] — Leaflet needs [lat, lng]
        const coords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
        setRouteCoordinates(coords);
      } catch (err) {
        if (err.name === "AbortError") return; // Stale request cancelled — ignore
        console.error("Routing error:", err);
        setRoutingError(
          err.message === "No route found between these two points."
            ? err.message
            : "Could not reach the routing server. Check your connection and try again."
        );
      } finally {
        setIsRouting(false);
      }
    };

    fetchRoute();

    // Cleanup: abort if component unmounts or deps change
    return () => controller.abort();
  }, [userLocation, destination]);

  // ── Derived values (memoized so MapController doesn't re-fire on every render)
  const center = useMemo(
    () => userLocation || DEFAULT_CENTER,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation?.[0], userLocation?.[1]]
  );

  const bounds = useMemo(
    () => (routeCoordinates.length > 1 ? L.latLngBounds(routeCoordinates) : null),
    [routeCoordinates]
  );

  const destBuilding    = selectedBooking?.slotId?.building;
  const destSlotNumber  = selectedBooking?.slotId?.slotNumber;
  const anyError        = noCoordError || routingError;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Page Header */}
      <header className="border-b-4 border-black pb-3 shrink-0">
        <h1 className="text-4xl font-black uppercase md:text-5xl">
          Route & Navigation
        </h1>
        <p className="mt-1 max-w-3xl font-mono text-sm text-gray-600">
          Select a confirmed booking to compute the driving route and ETA to the parking location.
        </p>
      </header>

      {/* Main Body */}
      <div className="mt-4 flex flex-1 flex-col gap-6 lg:flex-row min-h-0">

        {/* ── Control Panel ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6 border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] lg:w-80 xl:w-72 shrink-0 overflow-y-auto">

          {/* Booking Selector */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500">
              Select Destination
            </label>

            {loadingBookings ? (
              <div className="flex items-center gap-2 border-2 border-black bg-gray-50 p-4 font-mono text-sm text-gray-400">
                <span className="inline-block h-4 w-4 animate-spin border-2 border-black border-t-transparent" />
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              /* Empty state */
              <div className="border-2 border-dashed border-black bg-gray-50 p-4 text-center">
                <span className="block font-mono text-2xl mb-1">📭</span>
                <span className="font-mono text-xs font-bold uppercase text-gray-500 leading-relaxed">
                  No confirmed bookings found.{" "}
                  <a href="/slots/browse" className="underline text-black hover:text-gray-600">
                    Browse parking slots
                  </a>{" "}
                  to make a reservation.
                </span>
              </div>
            ) : (
              <div className="relative">
                <select
                  className="w-full cursor-pointer appearance-none border-2 border-black bg-gray-50 p-4 pr-10 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:ring-4 focus:ring-black/20"
                  onChange={handleBookingChange}
                  defaultValue=""
                >
                  <option value="">— Choose a confirmed booking —</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {getBookingLabel(b)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 font-bold text-black">
                  ▼
                </div>
              </div>
            )}
          </div>

          {/* Building detail card — shown when a booking with location is selected */}
          {selectedBooking && hasValidCoords(selectedBooking) && (
            <div className="border-l-4 border-black pl-4 font-mono text-xs leading-relaxed">
              <span className="block font-bold uppercase tracking-widest text-gray-500 mb-1">
                Destination
              </span>
              <span className="block font-bold text-black text-sm">
                {destBuilding?.name || "—"}
              </span>
              {destBuilding?.address && (
                <span className="block text-gray-500">{destBuilding.address}</span>
              )}
              {destSlotNumber && (
                <span className="block text-gray-500">Slot #{destSlotNumber}</span>
              )}
            </div>
          )}

          {/* ETA & Distance stats */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col border-l-4 border-black pl-5">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500">
                Est. Time
              </span>
              <span className="font-mono text-4xl font-black leading-none mt-1">
                {isRouting ? (
                  <span className="animate-pulse text-gray-300">···</span>
                ) : (
                  eta || <span className="text-gray-300">—</span>
                )}
              </span>
            </div>
            <div className="flex flex-col border-l-4 border-black pl-5">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500">
                Distance
              </span>
              <span className="font-mono text-4xl font-black leading-none mt-1">
                {isRouting ? (
                  <span className="animate-pulse text-gray-300">···</span>
                ) : (
                  distance || <span className="text-gray-300">—</span>
                )}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {anyError && (
            <div className="mt-auto border-2 border-red-600 bg-red-50 p-3 font-mono text-xs font-bold text-red-700 leading-relaxed">
              <span className="block uppercase tracking-widest mb-1">⚠ Error</span>
              {anyError}
            </div>
          )}

          {/* Routing in-progress hint */}
          {isRouting && (
            <div className="mt-auto border-2 border-black bg-gray-50 p-3 font-mono text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin border-2 border-black border-t-transparent" />
              Calculating route...
            </div>
          )}
        </section>

        {/* ── Map Area ──────────────────────────────────────────────────────── */}
        <section className="relative z-0 flex flex-1 flex-col overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-0">
          {loadingLocation ? (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 gap-4">
              <div className="h-10 w-10 animate-spin border-4 border-black border-t-transparent" />
              <span className="font-mono text-sm font-bold uppercase tracking-widest text-black">
                Acquiring Location...
              </span>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={14}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
              className="leaflet-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={center} bounds={bounds} />

              {/* Origin Marker — green */}
              {userLocation && (
                <Marker position={userLocation} icon={OriginIcon}>
                  <Popup>
                    <div className="font-mono text-xs font-bold uppercase">
                      📍 Your Location
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination Marker — blue */}
              {destination && (
                <Marker position={destination} icon={DestinationIcon}>
                  <Popup>
                    <div className="font-mono text-xs leading-relaxed">
                      <div className="font-bold uppercase mb-1">🏢 Destination</div>
                      {destBuilding?.name && (
                        <div className="font-bold">{destBuilding.name}</div>
                      )}
                      {destBuilding?.address && (
                        <div className="text-gray-500">{destBuilding.address}</div>
                      )}
                      {destSlotNumber && (
                        <div className="text-gray-500 mt-1">Slot #{destSlotNumber}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route Polyline */}
              {routeCoordinates.length > 1 && (
                <Polyline
                  positions={routeCoordinates}
                  color="#111111"
                  weight={6}
                  opacity={0.85}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </MapContainer>
          )}
        </section>
      </div>
    </div>
  );
}
