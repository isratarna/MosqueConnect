import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { LocateFixed } from "lucide-react";
import { useGoogleMapsLoader } from "../GoogleMapsProvider";
import { requestGeolocation } from "../../hooks/useGeolocation";
import { coordinatesOf } from "../../utils/mosqueDiscovery";
import { DEFAULT_CENTER } from "../../config";

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};
const GEOCODE_DEBOUNCE_MS = 400;

function round(value) {
  return Math.round(value * 1e7) / 1e7;
}

const componentText = (components, ...types) => {
  const match = components?.find((component) => types.some((type) => component.types?.includes(type)));
  return match?.long_name || match?.longText || "";
};

/** address, district (administrative_area_level_2) and area (sublocality / locality) from Google address components. */
function placeDetails(components, address) {
  return {
    address: address || "",
    district: componentText(components, "administrative_area_level_2"),
    area: componentText(components, "sublocality_level_1", "sublocality", "locality"),
  };
}

/**
 * Picks a point: search an address (Places API New), click the map, drag the pin, or use
 * the current location. onChange({ lat, lng, address, district, area }) fires at once with
 * the coordinates and again, after a short debounce, with the reverse-geocoded details.
 * The search box is the keyboard path; the map is the mouse/touch extra. With maps off
 * (or no key) it falls back to plain latitude/longitude inputs.
 */
export default function LocationPicker({ value, onChange, center, idPrefix = "location", hint = "Search for an address, click the map or drag the pin to the jamaat location." }) {
  const { disabled, isLoaded, loadError } = useGoogleMapsLoader();
  const point = coordinatesOf(value);
  const mapCenter = point || coordinatesOf(center) || DEFAULT_CENTER;
  const mapsReady = !disabled && !loadError && isLoaded;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const geocodeTimer = useRef(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  // Move the pin now; fill in address, district and area shortly after (saves geocoder quota while dragging).
  const moveTo = useCallback((lat, lng) => {
    const next = { lat: round(lat), lng: round(lng) };
    onChangeRef.current(next);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      if (!window.google?.maps?.Geocoder) return;
      new window.google.maps.Geocoder().geocode({ location: next }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        onChangeRef.current({ ...next, ...placeDetails(results[0].address_components, results[0].formatted_address) });
      });
    }, GEOCODE_DEBOUNCE_MS);
  }, []);

  const pick = useCallback((event) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    if (Number.isFinite(lat) && Number.isFinite(lng)) moveTo(lat, lng);
  }, [moveTo]);

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocateError("");
    const here = await requestGeolocation({ force: true });
    setLocating(false);
    if (here?.status === "success") moveTo(here.lat, here.lng);
    else setLocateError(here?.message || "We could not find your location.");
  };

  const selectPlace = useCallback((place) => {
    clearTimeout(geocodeTimer.current);
    onChangeRef.current({
      lat: round(place.lat),
      lng: round(place.lng),
      ...placeDetails(place.components, place.address),
    });
  }, []);

  const setField = (field, raw) => {
    const current = { lat: value?.lat ?? "", lng: value?.lng ?? "" };
    onChange({ ...current, [field]: raw === "" ? "" : Number(raw) });
  };

  if (!mapsReady) {
    return (
      <div>
        <p className="small text-muted mb-2">
          {disabled || loadError ? "The map is turned off, so enter the coordinates below (you can copy them from Google Maps)." : "Loading map…"}
        </p>
        {(disabled || loadError) && (
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
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="form-label small" htmlFor={`${idPrefix}-search`}>Search address</label>
      <PlaceSearch id={`${idPrefix}-search`} onSelect={selectPlace} />
      <div className="mc-location-picker my-2">
        <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={mapCenter} zoom={15} options={MAP_OPTIONS} onClick={pick}>
          {point && <MarkerF position={point} draggable onDragEnd={pick} />}
        </GoogleMap>
      </div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <button type="button" className="btn btn-sm btn-outline-mc" onClick={useCurrentLocation} disabled={locating}>
          <LocateFixed size={14} aria-hidden="true" /> {locating ? "Locating…" : "Use my current location"}
        </button>
        <small className="text-muted" aria-live="polite">
          {point ? `Lat ${point.lat.toFixed(6)}, Lng ${point.lng.toFixed(6)}` : "No location chosen yet"}
        </small>
      </div>
      {locateError && <p className="small text-danger mt-1 mb-0" role="alert">{locateError}</p>}
      <p className="form-text mt-1 mb-0">{hint}</p>
    </div>
  );
}

/** Place Autocomplete (new) web component, limited to Bangladesh. */
function PlaceSearch({ id, onSelect }) {
  const hostRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const supported = Boolean(window.google?.maps?.places?.PlaceAutocompleteElement);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return undefined;

    const element = new window.google.maps.places.PlaceAutocompleteElement({ includedRegionCodes: ["bd"] });
    element.id = id;
    host.appendChild(element);

    const handleSelect = async (event) => {
      const place = event.placePrediction ? event.placePrediction.toPlace() : event.place;
      if (!place) return;
      await place.fetchFields({ fields: ["location", "formattedAddress", "addressComponents"] });
      if (!place.location) return;
      onSelectRef.current({
        lat: place.location.lat(),
        lng: place.location.lng(),
        address: place.formattedAddress,
        components: place.addressComponents,
      });
    };
    // Newer versions emit "gmp-select", older ones "gmp-placeselect".
    element.addEventListener("gmp-select", handleSelect);
    element.addEventListener("gmp-placeselect", handleSelect);
    return () => element.remove();
  }, [id, supported]);

  if (!supported) return <p className="form-text mt-0 mb-0">Address search isn&apos;t available; click the map or drag the pin instead.</p>;
  return <div ref={hostRef} className="mc-place-autocomplete" />;
}
