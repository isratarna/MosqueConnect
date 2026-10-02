import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Modal from "../Modal";
import LocationPicker from "../admin/LocationPicker";
import { useAuth } from "../../context/AuthContext";
import { FACILITY_META } from "../../data/mosques";
import { suggestCorrection } from "../../utils/teamApi";
import { PRAYERS, SUGGESTION_FIELDS, cleanPayload, describeValue, initialPayload } from "../../utils/suggestionFormat";

/**
 * "Suggest a correction": a visitor picks what is wrong and edits a copy of
 * the current value. Someone who runs the mosque (or the super admin, for
 * mosques without an admin) reviews it before anything changes.
 */
export default function SuggestCorrectionModal({ mosque, initialField = "prayer_time", onClose, onSubmitted }) {
  const { user } = useAuth();
  const location = useLocation();
  const [field, setField] = useState(initialField);
  const [payload, setPayload] = useState(() => initialPayload(initialField, mosque, { prayer: firstPrayer(mosque) }));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const changeField = (next) => {
    setField(next);
    setPayload(initialPayload(next, mosque, { prayer: payload.prayer || firstPrayer(mosque) }));
    setError("");
  };
  const set = (key, value) => setPayload((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await suggestCorrection(mosque.id, {
        field,
        payload: field === "other" ? undefined : cleanPayload(field, payload),
        note: note.trim() || null,
      });
      setDone(response.message || "Thank you! Your suggestion will be reviewed.");
      onSubmitted?.(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Modal title="Suggest a correction" onClose={onClose}>
        <p>Sign in to suggest a correction to {mosque.name}. It takes a minute with your phone number.</p>
        <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>Sign in</Link>
      </Modal>
    );
  }

  if (done) {
    return (
      <Modal title="Suggestion sent" onClose={onClose} footer={<button type="button" className="btn btn-mc" onClick={onClose}>Close</button>}>
        <p className="d-flex gap-2 mb-2"><CheckCircle2 className="text-success flex-shrink-0" aria-hidden="true" />{done}</p>
        <p className="small text-muted mb-0">You can follow it under <Link to="/profile?tab=suggestions" onClick={onClose}>Profile → My corrections</Link>.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Suggest a correction"
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="btn btn-light" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="suggest-correction-form" className="btn btn-mc" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
        </>
      )}
    >
      <form id="suggest-correction-form" onSubmit={submit}>
        <p className="small text-muted">Spotted something wrong at <strong>{mosque.name}</strong>? Change it below. The mosque's admins (or our team) check it before it goes live.</p>

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="suggest-field">What is wrong?</label>
          <select id="suggest-field" className="form-select" value={field} onChange={(e) => changeField(e.target.value)}>
            {SUGGESTION_FIELDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {field === "prayer_time" && (
          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-4">
              <label className="form-label small" htmlFor="suggest-prayer">Prayer</label>
              <select id="suggest-prayer" className="form-select" value={payload.prayer} onChange={(e) => setPayload(initialPayload("prayer_time", mosque, { prayer: e.target.value }))}>
                {PRAYERS.map((prayer) => <option key={prayer.value} value={prayer.value}>{prayer.label}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="suggest-jamaat">Jamaat time</label>
              <input id="suggest-jamaat" type="time" className="form-control" required value={payload.jamaat_time || ""} onChange={(e) => set("jamaat_time", e.target.value)} />
            </div>
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="suggest-adhan">Adhan (optional)</label>
              <input id="suggest-adhan" type="time" className="form-control" value={payload.adhan_time || ""} onChange={(e) => set("adhan_time", e.target.value)} />
            </div>
          </div>
        )}

        {field === "jumuah" && (
          <div className="row g-2 mb-3">
            {(mosque.jumuah_sessions || []).length > 1 && (
              <div className="col-12">
                <label className="form-label small" htmlFor="suggest-session">Which Jumuah</label>
                <select id="suggest-session" className="form-select" value={payload.sequence} onChange={(e) => setPayload(initialPayload("jumuah", mosque, { sequence: Number(e.target.value) }))}>
                  {mosque.jumuah_sessions.map((session) => <option key={session.sequence} value={session.sequence}>{session.label}</option>)}
                </select>
              </div>
            )}
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-jumuah-jamaat">Jamaat time</label>
              <input id="suggest-jumuah-jamaat" type="time" className="form-control" required value={payload.jamaat_time || ""} onChange={(e) => set("jamaat_time", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-khutbah">Khutbah (optional)</label>
              <input id="suggest-khutbah" type="time" className="form-control" value={payload.khutbah_time || ""} onChange={(e) => set("khutbah_time", e.target.value)} />
            </div>
          </div>
        )}

        {field === "phone" && (
          <div className="mb-3">
            <label className="form-label small" htmlFor="suggest-phone">Phone number</label>
            <input id="suggest-phone" type="tel" className="form-control" required maxLength={50} value={payload.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
        )}

        {field === "address" && (
          <div className="row g-2 mb-3">
            <div className="col-12">
              <label className="form-label small" htmlFor="suggest-address">Address</label>
              <input id="suggest-address" className="form-control" required maxLength={500} value={payload.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-area">Area</label>
              <input id="suggest-area" className="form-control" maxLength={100} value={payload.area || ""} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-district">District</label>
              <input id="suggest-district" className="form-control" maxLength={100} value={payload.district || ""} onChange={(e) => set("district", e.target.value)} />
            </div>
          </div>
        )}

        {field === "location" && (
          <div className="mb-3">
            <LocationPicker
              idPrefix="suggest-location"
              value={{ lat: payload.latitude, lng: payload.longitude }}
              center={{ lat: mosque.lat, lng: mosque.lng }}
              hint="Drag the pin to where the mosque's entrance really is."
              onChange={({ lat, lng }) => setPayload({ latitude: lat, longitude: lng })}
            />
          </div>
        )}

        {field === "facilities" && (
          <fieldset className="mb-3">
            <legend className="form-label small">Tick everything the mosque has</legend>
            <div className="row row-cols-1 row-cols-sm-2 g-1">
              {Object.entries(FACILITY_META).map(([key, meta]) => (
                <div className="col" key={key}>
                  <div className="form-check">
                    <input
                      id={`suggest-facility-${key}`}
                      type="checkbox"
                      className="form-check-input"
                      checked={(payload.facilities || []).includes(key)}
                      onChange={(e) => set("facilities", e.target.checked ? [...(payload.facilities || []), key] : (payload.facilities || []).filter((item) => item !== key))}
                    />
                    <label className="form-check-label" htmlFor={`suggest-facility-${key}`}>{meta.label}</label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {field !== "other" && field !== "location" && (
          <p className="small text-muted">Now shown: {describeValue(field, initialPayload(field, mosque, { prayer: payload.prayer, sequence: payload.sequence }))}</p>
        )}

        <div className="mb-1">
          <label className="form-label small" htmlFor="suggest-note">{field === "other" ? "What is wrong?" : "How do you know? (optional)"}</label>
          <textarea id="suggest-note" className="form-control" rows={3} maxLength={1000} required={field === "other"} placeholder={field === "other" ? "For example: the mosque was renamed last year." : "For example: the notice board changed last Friday."} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}

/** Start with the first prayer the mosque shows, falling back to Fajr. */
function firstPrayer(mosque) {
  return mosque?.prayer_schedule?.[0]?.prayer || "fajr";
}
