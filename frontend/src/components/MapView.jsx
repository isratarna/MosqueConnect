/*
 * MapView — Google Maps wrapper (Phase 1)
 *
 * Uses @react-google-maps/api. If no API key is configured it renders a
 * friendly placeholder instead of crashing, so the rest of the UI works.
 *
 * Props:
 *   center     {lat,lng}
 *   zoom       number
 *   mosques    array of mosques to drop markers for
 *   userPos    {lat,lng} | null  — highlighted "you are here" marker
 *   className  extra classes for the map container
 */
import { useState } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { LoaderCircle, Map, TriangleAlert } from "lucide-react";
import { GOOGLE_MAPS_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM } from "../config";
import VerifiedBadge from "./VerifiedBadge";

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  mosques = [],
  userPos = null,
  className = "mc-map",
}) {
  // No key → placeholder, no API call.
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={className}>
        <div className="mc-map-placeholder">
          <Map size={46} aria-hidden="true" />
          <p className="fw-semibold mb-1 mt-2">Interactive map ready</p>
          <p className="mb-0 small">
            Add your Google Maps API key to <code>.env</code> to enable it.
          </p>
        </div>
      </div>
    );
  }
  return (
    <MapInner
      center={center}
      zoom={zoom}
      mosques={mosques}
      userPos={userPos}
      className={className}
    />
  );
}

function MapInner({ center, zoom, mosques, userPos, className }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "mc-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
  const [active, setActive] = useState(null);

  if (loadError) {
    return (
      <div className={className}>
        <div className="mc-map-placeholder">
          <TriangleAlert size={42} aria-hidden="true" />
          <p className="mb-0 small mt-2">Could not load Google Maps. Check your API key.</p>
        </div>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className={className}>
        <div className="mc-map-placeholder">
          <LoaderCircle className="text-mc spin" size={32} aria-label="Loading map" />
          <p className="mb-0 small mt-2">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", minHeight: "inherit" }}
        center={center}
        zoom={zoom}
        options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}
      >
        {userPos && (
          <MarkerF
            position={userPos}
            title="You are here"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#1a73e8",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
          />
        )}
        {mosques.map((m) => (
          <MarkerF
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.name}
            onClick={() => setActive(m)}
          />
        ))}
        {active && (
          <InfoWindowF
            position={{ lat: active.lat, lng: active.lng }}
            onCloseClick={() => setActive(null)}
          >
            <div style={{ maxWidth: 220 }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <strong>{active.name}</strong>
                {active.verified && <VerifiedBadge />}
              </div>
              <span style={{ color: "#666", fontSize: 12 }}>{active.address}</span>
              <br />
              <span style={{ fontSize: 12 }}>Next Jamat (Dhuhr): {active.prayer.Dhuhr} PM</span>
              <br />
              <Link to={`/mosque/${active.id}`} style={{ fontSize: 13 }}>
                View profile →
              </Link>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
