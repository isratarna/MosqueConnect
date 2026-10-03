import { useCallback, useMemo } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { Map as MapIcon } from "lucide-react";
import { useGoogleMapsLoader } from "../GoogleMapsProvider";
import { decodePolyline } from "../../utils/routeGeometry";
import { PRAYER_COLORS } from "../../utils/journeyApi";
import { useLocale } from "../../hooks/useLocale";
import { prayerNameT } from "../../utils/journeyFormat";

const MAP_OPTIONS = { mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false };

/*
 * Route ar namaz-er stop gula map-e. Polyline decode geometry library diye
 * (na pele amader nijer decodePolyline), stop marker namaz onujayi rongin.
 */
export default function JourneyMap({ plan, stops, livePosition }) {
  const { t } = useLocale();
  const { disabled, isLoaded, loadError } = useGoogleMapsLoader();

  const path = useMemo(() => {
    const encoded = plan?.route?.encoded_polyline;
    if (!encoded) return [];
    const geometry = window.google?.maps?.geometry?.encoding;
    return geometry ? geometry.decodePath(encoded).map((p) => ({ lat: p.lat(), lng: p.lng() })) : decodePolyline(encoded);
  }, [plan?.route?.encoded_polyline, isLoaded]);

  // Map load hole puro route ta dekhay emon zoom.
  const fitRoute = useCallback((map) => {
    if (!path.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 40);
  }, [path]);

  if (disabled || loadError || !isLoaded) {
    return (
      <div className="mc-journey-map mc-map-placeholder d-flex flex-column align-items-center justify-content-center text-center p-3">
        <MapIcon size={28} aria-hidden="true" />
        <p className="small mb-0 mt-2">
          {disabled ? t("journey.map.disabled") : loadError ? t("journey.map.loadError") : t("journey.map.loading")}
        </p>
      </div>
    );
  }

  const circle = (color, scale = 9) => ({
    path: window.google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  });

  return (
    <div className="mc-journey-map">
      <GoogleMap key={plan?.id} mapContainerStyle={{ width: "100%", height: "100%" }} options={MAP_OPTIONS} onLoad={fitRoute} center={path[0]} zoom={8}>
        <PolylineF path={path} options={{ strokeColor: "#12775c", strokeOpacity: 0.85, strokeWeight: 5 }} />
        {path.length > 0 && <MarkerF position={path[0]} label="A" title={plan.origin?.label || t("journey.start")} />}
        {path.length > 0 && <MarkerF position={path[path.length - 1]} label="B" title={plan.destination?.label || t("journey.destination")} />}
        {stops.map((stop) => (
          <MarkerF
            key={stop.key}
            position={{ lat: stop.mosque.lat, lng: stop.mosque.lng }}
            icon={circle(PRAYER_COLORS[stop.prayer] || "#12775c")}
            label={{ text: stop.label.charAt(0), color: "#ffffff", fontSize: "11px", fontWeight: "700" }}
            title={`${prayerNameT(t, stop.label, stop.prayer)}: ${stop.mosque.name}`}
          />
        ))}
        {livePosition && <MarkerF position={livePosition} icon={circle("#1a73e8", 7)} title={t("journey.map.youAreHere")} />}
      </GoogleMap>
    </div>
  );
}
