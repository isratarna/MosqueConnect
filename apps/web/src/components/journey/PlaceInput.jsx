import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useGoogleMapsLoader } from "../GoogleMapsProvider";
import { PRESET_PLACES } from "../../utils/journeyApi";
import { useLocale } from "../../hooks/useLocale";

/*
 * Origin / destination input. Map load hole Google-er notun
 * PlaceAutocompleteElement (Places API New), na hole shohor-er list ar
 * "lat, lng" lekhar ghor — jate key chara-o demo kora jay.
 * value: { current: true } (amar location) ba { lat, lng, label }.
 */
export default function PlaceInput({ id, label, value, onChange, allowCurrent = false }) {
  const { t } = useLocale();
  const { disabled, isLoaded } = useGoogleMapsLoader();
  const canAutocomplete = !disabled && isLoaded && Boolean(window.google?.maps?.places?.PlaceAutocompleteElement);

  return (
    <div>
      <label className="form-label small fw-semibold" htmlFor={id}>{label}</label>
      {allowCurrent && (
        <div className="form-check form-check-inline small mb-1 ms-2">
          <input
            id={`${id}-current`}
            className="form-check-input"
            type="checkbox"
            checked={Boolean(value?.current)}
            onChange={(e) => onChange(e.target.checked ? { current: true } : null)}
          />
          <label className="form-check-label" htmlFor={`${id}-current`}>
            <LocateFixed size={13} aria-hidden="true" /> {t("journey.myLocation")}
          </label>
        </div>
      )}

      {!value?.current && (
        <>
          {canAutocomplete && <Autocomplete id={id} onSelect={onChange} />}
          <FallbackPicker id={id} value={value} onChange={onChange} compact={canAutocomplete} />
          {value?.label && <div className="form-text">{t("journey.place.selected", { label: value.label })}</div>}
        </>
      )}
    </div>
  );
}

function Autocomplete({ id, onSelect }) {
  const { t } = useLocale();
  const hostRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    // Web component ta nijei input banay; Bangladesh-er jayga age dekhay.
    const element = new window.google.maps.places.PlaceAutocompleteElement({ includedRegionCodes: ["bd"] });
    element.id = id;
    host.appendChild(element);

    const handleSelect = async (event) => {
      const place = event.placePrediction ? event.placePrediction.toPlace() : event.place;
      if (!place) return;
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      if (!place.location) return;
      onSelectRef.current({
        lat: place.location.lat(),
        lng: place.location.lng(),
        label: place.displayName || place.formattedAddress || t("journey.place.selectedPlace"),
      });
    };

    // Notun version e "gmp-select", purono te "gmp-placeselect".
    element.addEventListener("gmp-select", handleSelect);
    element.addEventListener("gmp-placeselect", handleSelect);

    return () => element.remove();
  }, [id, t]);

  return <div ref={hostRef} className="mc-place-autocomplete mb-1" />;
}

function FallbackPicker({ id, value, onChange, compact }) {
  const { t } = useLocale();
  const [text, setText] = useState("");

  const applyText = () => {
    const match = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) onChange({ lat: Number(match[1]), lng: Number(match[2]), label: `${match[1]}, ${match[2]}` });
  };

  // [Urmee · i18n journey] The chosen city's label is its translated name, so "Selected: …" reads in the active language.
  const presetPlace = (place) => ({ lat: place.lat, lng: place.lng, label: t(`journey.cities.${place.key}`) });
  const presetIndex = PRESET_PLACES.findIndex((p) => p.lat === value?.lat && p.lng === value?.lng);

  return (
    <div className={`row g-2 ${compact ? "mt-0" : ""}`}>
      <div className="col-sm-6">
        <select
          id={compact ? undefined : id}
          className="form-select form-select-sm"
          value={presetIndex >= 0 ? String(presetIndex) : ""}
          onChange={(e) => e.target.value !== "" && onChange(presetPlace(PRESET_PLACES[Number(e.target.value)]))}
          aria-label={t("journey.place.chooseCity")}
        >
          <option value="">{compact ? t("journey.place.orPickCity") : t("journey.place.pickCity")}</option>
          {PRESET_PLACES.map((place, index) => <option key={place.key} value={index}>{t(`journey.cities.${place.key}`)}</option>)}
        </select>
      </div>
      <div className="col-sm-6">
        <input
          className="form-control form-control-sm"
          placeholder={t("journey.place.coordsPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={applyText}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyText())}
          aria-label={t("journey.place.coordinates")}
        />
      </div>
    </div>
  );
}
