/*
 * Google Maps wrapper used by mosque discovery views.
 *
 * Uses @react-google-maps/api. The script is loaded once by GoogleMapsProvider.
 * If no API key is configured it renders a friendly placeholder instead of crashing.
 */
import { Component, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerClustererF, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { Map, TriangleAlert } from "lucide-react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "../config";
import { coordinatesOf } from "../utils/mosqueDiscovery";
import { nextJamaatLabel } from "../utils/prayerTime";
import { useNow } from "../hooks/useNow";
import { useGoogleMapsLoader } from "./GoogleMapsProvider";
import VerifiedBadge from "./VerifiedBadge";
import { Skeleton, SkeletonRegion } from "./skeletons";

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Teardrop pin used in enhanced mode so a hovered or selected pin can grow.
// [Urmee · F2 Part 2] Teardrop SVG pin used in enhanced mode so hovered/selected pins can grow.
const pinIcon = (color, width) => {
  const height = Math.round(width * 1.35);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(width, height),
    anchor: new window.google.maps.Point(width / 2, height),
  };
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

/*
 * Optional "enhanced" mode (used by the Browse map view) adds:
 *   - marker clustering and grow-on-hover pins (hoveredMosqueId)
 *   - fitKey: fit the map to all pins whenever this value changes (null = don't)
 *   - onUserMove: called after the user pans or zooms (not after our own moves)
 *   - controlRef: receives { panTo(position, minZoom), getBounds() }
 */
export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  mosques = [],
  userPos = null,
  className = "mc-map",
  selectedMosqueId,
  onMosqueSelect,
  enhanced = false,
  hoveredMosqueId = null,
  fitKey = null,
  onUserMove,
  controlRef,
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
      <SkeletonRegion label="Loading map…" delay={0}>
        <div className={`${className} mc-map--loading`}><Skeleton height="100%" radius="12px" /></div>
      </SkeletonRegion>
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
        enhanced={enhanced}
        hoveredMosqueId={hoveredMosqueId}
        fitKey={fitKey}
        onUserMove={onUserMove}
        controlRef={controlRef}
      />
    </MapErrorBoundary>
  );
}

function MapInner({ center, zoom, mosques, userPos, className, selectedMosqueId, onMosqueSelect, enhanced, hoveredMosqueId, fitKey, onUserMove, controlRef }) {
  // [Urmee · F1 Part 3] Must live here (inside MapInner): the popup that uses it renders in this component.
  const now = useNow();
  const mapRef = useRef(null);
  // Moves we make ourselves (panTo, fitBounds) must not count as the user moving the map.
  // [Urmee · F2 Part 2] Moves we make ourselves (panTo, fitBounds) must not count as the user moving the
  // map, or "Search this area" would appear on its own.
  const programmaticUntil = useRef(0);
  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;
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

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const markProgrammatic = () => { programmaticUntil.current = Date.now() + 1500; };
  const reportUserMove = () => {
    if (Date.now() > programmaticUntil.current) onUserMoveRef.current?.();
  };

  // [Urmee · F2 Part 2] Lets the parent drive the map: panTo(position, minZoom) and getBounds() for
  // "Search this area".
  useImperativeHandle(controlRef, () => ({
    panTo(position, minZoom = 15) {
      const map = mapRef.current;
      if (!map || !position) return;
      markProgrammatic();
      if (prefersReducedMotion()) map.setCenter(position);
      else map.panTo(position);
      if ((map.getZoom() ?? 0) < minZoom) map.setZoom(minZoom);
    },
    getBounds() {
      const bounds = mapRef.current?.getBounds();
      if (!bounds) return null;
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      return { south: southWest.lat(), west: southWest.lng(), north: northEast.lat(), east: northEast.lng() };
    },
  }), []);

  // [Urmee · F2 Part 2] fitBounds to all pins plus the user's position whenever fitKey changes.
  // Fit to every pin (plus the user's position) when fitKey changes, e.g. on first load and when filters change.
  useEffect(() => {
    const map = mapRef.current;
    if (!enhanced || !mapReady || !map || fitKey === null || !window.google?.maps?.LatLngBounds) return;
    const points = [...mappedMosques.map((item) => item.position), ...(safeUserPosition ? [safeUserPosition] : [])];
    if (!points.length) return;
    markProgrammatic();
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhanced, mapReady, fitKey]);

  // [Urmee · F2 Part 2] In enhanced mode markers are wrapped in MarkerClustererF so crowded areas show a
  // cluster.
  const renderMarkers = (clusterer) => mappedMosques.map(({ mosque, position }) => {
          const isActive = String(mosque.id) === String(activeId);
          const isHovered = enhanced && String(mosque.id) === String(hoveredMosqueId);
          const grown = isActive || isHovered;

          return (
            <MarkerF
              key={mosque.id}
              position={position}
              title={mosque.name}
              zIndex={isHovered ? 100 : isActive ? 10 : 1}
              clusterer={clusterer}
              noClustererRedraw
              icon={enhanced ? pinIcon(grown ? "#b64512" : "#d9692b", grown ? 40 : 28) : undefined}
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
                    {(() => {
                      const next = nextJamaatLabel(mosque.prayer, now);
                      return next && <><br /><span style={{ fontSize: 12 }}>Next Jamat: {next.text}{mosque.prayer_sources?.[next.prayer] === "calculated" ? " (estimated)" : ""}</span></>;
                    })()}
                    <br />
                    <Link to={mosque.profile_path || `/mosque/${mosque.id}`} style={{ fontSize: 13 }}>
                      View profile →
                    </Link>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        });

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", minHeight: "inherit" }}
        center={safeCenter}
        zoom={zoom}
        options={MAP_OPTIONS}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onDragEnd={reportUserMove}
        onZoomChanged={reportUserMove}
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
        {mapReady && (enhanced
          ? <MarkerClustererF>{(clusterer) => <>{renderMarkers(clusterer)}</>}</MarkerClustererF>
          : renderMarkers(undefined))}
      </GoogleMap>
    </div>
  );
}
