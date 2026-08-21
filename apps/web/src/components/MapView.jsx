/*
 * MapView — Google Maps wrapper (Phase 1)
 *
 * Uses @react-google-maps/api. The script is loaded once by GoogleMapsProvider.
 * If no API key is configured it renders a friendly placeholder instead of crashing.
 */
import { Component, useCallback, useMemo, useState } from "react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { LoaderCircle, Map, TriangleAlert } from "lucide-react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "../config";
import { coordinatesOf } from "../utils/mosqueDiscovery";
import { dhuhrJamaatLabel } from "../utils/prayerTime";
import { useGoogleMapsLoader } from "./GoogleMapsProvider";
import VerifiedBadge from "./VerifiedBadge";

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

function MapPlaceholder({ className, icon, title, message }) {
  return (
    <div className={className}>
      <div className="mc-map-placeholder">
        {icon}
        {title ? <p className="fw-semibold mb-1 mt-2">{title}</p> : null}
        <p className="mb-0 small mt-2">{message}</p>
      </div>
    </div>
  );
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  mosques = [],
  userPos = null,
  className = "mc-map",
  selectedMosqueId,
  onMosqueSelect,
}) {
  const { disabled, isLoaded, loadError } = useGoogleMapsLoader();

  if (disabled) {
    return (
      <MapPlaceholder
        className={className}
        icon={<Map size={46} aria-hidden="true" />}
        title="Interactive map ready"
        message={<>Add your Google Maps API key to <code>.env</code> to enable it.</>}
      />
    );
  }

  if (loadError) {
    return (
      <MapPlaceholder
        className={className}
        icon={<TriangleAlert size={42} aria-hidden="true" />}
        message="Could not load Google Maps. Check your API key."
      />
    );
  }

  if (!isLoaded) {
    return (
      <MapPlaceholder
        className={`${className} mc-map--loading`}
        icon={<LoaderCircle className="text-mc spin" size={32} aria-label="Loading map" />}
        message="Loading map…"
      />
    );
  }

  return (
    <MapErrorBoundary
      resetKey={`${className}:${selectedMosqueId ?? ""}:${mosques.length}`}
      fallback={
        <MapPlaceholder
          className={className}
          icon={<TriangleAlert size={42} aria-hidden="true" />}
          message="The map could not be displayed. Other page content is still available."
        />
      }
    >
      <MapInner
        center={center}
        zoom={zoom}
        mosques={mosques}
        userPos={userPos}
        className={className}
        selectedMosqueId={selectedMosqueId}
        onMosqueSelect={onMosqueSelect}
      />
    </MapErrorBoundary>
  );
}

function MapInner({ center, zoom, mosques, userPos, className, selectedMosqueId, onMosqueSelect }) {
  const [internalActiveId, setInternalActiveId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const isControlled = selectedMosqueId !== undefined;
  const activeId = isControlled ? selectedMosqueId : internalActiveId;

  const mappedMosques = useMemo(
    () => mosques
      .map((mosque) => {
        const position = coordinatesOf(mosque);
        if (!position || mosque?.id === null || mosque?.id === undefined) return null;
        return { mosque, position };
      })
      .filter(Boolean),
    [mosques],
  );

  const safeCenter = useMemo(
    () => coordinatesOf(center) || DEFAULT_CENTER,
    [center?.lat, center?.lng, center?.latitude, center?.longitude],
  );
  const safeUserPosition = useMemo(() => coordinatesOf(userPos), [userPos?.lat, userPos?.lng, userPos?.latitude, userPos?.longitude]);
  const active = mappedMosques.find((item) => String(item.mosque.id) === String(activeId));

  const selectMosque = (mosque) => {
    setInternalActiveId(mosque?.id ?? null);
    onMosqueSelect?.(mosque?.id ?? null);
  };

  const handleMapLoad = useCallback(() => {
    setMapReady(true);
  }, []);

  const handleMapUnmount = useCallback(() => {
    setMapReady(false);
  }, []);

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", minHeight: "inherit" }}
        center={safeCenter}
        zoom={zoom}
        options={MAP_OPTIONS}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
      >
        {mapReady && safeUserPosition && window.google?.maps?.SymbolPath && (
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
        {mapReady && mappedMosques.map(({ mosque, position }) => {
          const isActive = String(mosque.id) === String(activeId);

          return (
            <MarkerF
              key={mosque.id}
              position={position}
              title={mosque.name}
              zIndex={isActive ? 10 : 1}
              onClick={() => selectMosque(mosque)}
            >
              {isActive && active?.position && (
                <InfoWindowF
                  position={active.position}
                  options={{ position: active.position }}
                  onCloseClick={() => selectMosque(null)}
                >
                  <div style={{ maxWidth: 240 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <strong>{mosque.name}</strong>
                      {(mosque.verified || mosque.verification_status === "verified") && <VerifiedBadge />}
                    </div>
                    <span style={{ color: "#666", fontSize: 12 }}>{mosque.address}</span>
                    {(mosque.distance !== undefined || mosque.distance_km !== undefined) && (
                      <><br /><span style={{ fontSize: 12 }}>{mosque.distance ?? mosque.distance_km} km away</span></>
                    )}
                    {mosque.verification_status && (
                      <><br /><span style={{ fontSize: 12, textTransform: "capitalize" }}>{mosque.verification_status}</span></>
                    )}
                    {dhuhrJamaatLabel(mosque.prayer) && (
                      <><br /><span style={{ fontSize: 12 }}>Next Jamat: {dhuhrJamaatLabel(mosque.prayer)}</span></>
                    )}
                    <br />
                    <Link to={`/mosque/${mosque.id}`} style={{ fontSize: 13 }}>
                      View profile →
                    </Link>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}
      </GoogleMap>
    </div>
  );
}
