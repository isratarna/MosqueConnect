import { useState } from "react";
import Modal from "../Modal";
import PlaceInput from "../journey/PlaceInput";
import { setManualLocation } from "../../hooks/useGeolocation";

/** Lets someone without GPS say where they are (Places search or a preset city); remembered in localStorage. */
// [Urmee · F5 Part 1] "Enter location manually": reuses PlaceInput (Google Places search or a preset
// city) for users who deny GPS, so "nearby" is no longer stuck on central Dhaka.
export default function ManualLocationDialog({ onClose }) {
  const [place, setPlace] = useState(null);
  const save = () => {
    if (!place?.lat) return;
    setManualLocation(place.lat, place.lng, place.label);
    onClose();
  };
  return (
    <Modal
      title="Enter location manually"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-mc" disabled={!place?.lat} onClick={save}>Save location</button>
        </>
      )}
    >
      <PlaceInput id="manual-location" label="Search your area or pick a city" value={place} onChange={setPlace} />
    </Modal>
  );
}
