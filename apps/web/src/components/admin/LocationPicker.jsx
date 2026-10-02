import { useCallback } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../GoogleMapsProvider";
import { coordinatesOf } from "../../utils/mosqueDiscovery";
import { DEFAULT_CENTER } from "../../config";

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

function round(value) {
  return Math.round(value * 1e7) / 1e7;
}

/**
 * Picks a point by clicking or dragging a pin on the map. Latitude and
 * longitude fields stay available for exact values and when maps are off.
 */
export default function LocationPicker({ value, onChange, center, idPrefix = "location" }) {
  const { disabled, isLoaded, loadError } = useGoogleMapsLoader();
  const point = coordinatesOf(value);
  const mapCenter = point || coordinatesOf(center) || DEFAULT_CENTER;

  const pick = useCallback((event) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    if (Number.isFinite(lat) && Number.isFinite(lng)) onChange({ lat: round(lat), lng: round(lng) });
  }, [onChange]);

  const setField = (field, raw) => {
    const current = { lat: value?.lat ?? "", lng: value?.lng ?? "" };
    onChange({ ...current, [field]: raw === "" ? "" : Number(raw) });
  };

  return (
    <div>
      {!disabled && !loadError && isLoaded ? (
        <div className="mc-location-picker mb-2">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={15}
            options={MAP_OPTIONS}
            onClick={pick}
          >
            {point && <MarkerF position={point} draggable onDragEnd={pick} />}
          </GoogleMap>
        </div>
      ) : (
        <p className="small text-muted mb-2">
          {disabled ? "The map is turned off, so enter the coordinates below (you can copy them from Google Maps)." : "Loading map…"}
        </p>
      )}
      {!disabled && isLoaded && <p className="form-text mt-0 mb-2">Click the map or drag the pin to the jamaat location.</p>}
      <div className="row g-2">
        {[["lat", "Latitude", -90, 90], ["lng", "Longitude", -180, 180]].map(([field, label, min, max]) => (
          <div className="col-6" key={field}>
            <label className="form-label small" htmlFor={`${idPrefix}-${field}`}>{label}</label>
            <input
              id={`${idPrefix}-${field}`}
              type="number"
              step="any"
              min={min}
              max={max}
              required
              className="form-control form-control-sm"
              value={value?.[field] ?? ""}
              onChange={(e) => setField(field, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
