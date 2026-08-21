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
import { coordinatesOf } from "../utils/mosqueDiscovery";
import VerifiedBadge from "./VerifiedBadge";

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  mosques = [],
  userPos = null,
  className = "mc-map",
  selectedMosqueId,
  onMosqueSelect,
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
      selectedMosqueId={selectedMosqueId}
      onMosqueSelect={onMosqueSelect}
    />
  );
}

function MapInner({ center, zoom, mosques, userPos, className, selectedMosqueId, onMosqueSelect }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "mc-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
  const [internalActiveId, setInternalActiveId] = useState(null);
  const isControlled = selectedMosqueId !== undefined;
  const activeId = isControlled ? selectedMosqueId : internalActiveId;
  const active = mosques.find((mosque) => String(mosque.id) === String(activeId));
  const activePosition = coordinatesOf(active);
  const safeCenter = coordinatesOf(center) || DEFAULT_CENTER;
  const safeUserPosition = coordinatesOf(userPos);

  const selectMosque = (mosque) => {
    setInternalActiveId(mosque?.id ?? null);
    onMosqueSelect?.(mosque?.id ?? null);
  };

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
      <div className={`${className} mc-map--loading`}>
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
        center={safeCenter}
        zoom={zoom}
        options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}
      >
        {safeUserPosition && (
          <MarkerF
            position={safeUserPosition}
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
        {mosques.map((m) => {
          const position = coordinatesOf(m);
          if (!position) return null;
          const isActive = String(m.id) === String(activeId);

          return (
            <MarkerF
              key={m.id}
              position={position}
              title={m.name}
              zIndex={isActive ? 10 : 1}
              onClick={() => selectMosque(m)}
            />
          );
        })}
        {active && activePosition && (
          <InfoWindowF
            position={activePosition}
            onCloseClick={() => selectMosque(null)}
          >
            <div style={{ maxWidth: 240 }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <strong>{active.name}</strong>
                {(active.verified || active.verification_status === "verified") && <VerifiedBadge />}
              </div>
              <span style={{ color: "#666", fontSize: 12 }}>{active.address}</span>
              {(active.distance !== undefined || active.distance_km !== undefined) && (
                <><br /><span style={{ fontSize: 12 }}>{active.distance ?? active.distance_km} km away</span></>
              )}
              {active.verification_status && (
                <><br /><span style={{ fontSize: 12, textTransform: "capitalize" }}>{active.verification_status}</span></>
              )}
              {active.prayer?.Dhuhr && (
                <><br /><span style={{ fontSize: 12 }}>Next Jamat (Dhuhr): {active.prayer.Dhuhr} PM</span></>
              )}
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
