import { useState } from "react";
import Modal from "../Modal";
import PlaceInput from "../journey/PlaceInput";
import { setManualLocation } from "../../hooks/useGeolocation";
import { useLocale } from "../../hooks/useLocale";

/** Lets someone without GPS say where they are (Places search or a preset city); remembered in localStorage. */
// [Urmee · F5 Part 1] "Enter location manually": reuses PlaceInput (Google Places search or a preset
// city) for users who deny GPS, so "nearby" is no longer stuck on central Dhaka.
export default function ManualLocationDialog({ onClose }) {
  const { t } = useLocale(); // [Urmee · i18n shared]
  const [place, setPlace] = useState(null);
  const save = () => {
    if (!place?.lat) return;
    setManualLocation(place.lat, place.lng, place.label);
    onClose();
  };
  return (
    <Modal
      title={t("manualLocation.title")}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button type="button" className="btn btn-mc" disabled={!place?.lat} onClick={save}>{t("manualLocation.save")}</button>
        </>
      )}
    >
      <PlaceInput id="manual-location" label={t("manualLocation.label")} value={place} onChange={setPlace} />
    </Modal>
  );
}
