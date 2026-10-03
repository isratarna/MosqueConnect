import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Modal from "../Modal";
import LocationPicker from "../admin/LocationPicker";
import { useAuth } from "../../context/AuthContext";
import { FACILITY_META } from "../../data/mosques";
import { suggestCorrection } from "../../utils/teamApi";
import { PRAYERS, SUGGESTION_FIELDS, cleanPayload, describeValue, initialPayload } from "../../utils/suggestionFormat";
import { useLocale } from "../../hooks/useLocale";

/**
 * "Suggest a correction": a visitor picks what is wrong and edits a copy of
 * the current value. Someone who runs the mosque (or the super admin, for
 * mosques without an admin) reviews it before anything changes.
 */
export default function SuggestCorrectionModal({ mosque, initialField = "prayer_time", onClose, onSubmitted }) {
  const { t, locale } = useLocale(); // [Urmee · i18n suggestions] text from the locale files
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
      setDone(response.message || t("suggest.modal.thanks"));
      onSubmitted?.(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Modal title={t("suggest.modal.title")} onClose={onClose}>
        <p>{t("suggest.modal.signIn", { mosque: mosque.name })}</p>
        <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>{t("suggest.modal.signInButton")}</Link>
      </Modal>
    );
  }

  if (done) {
    return (
      <Modal title={t("suggest.modal.sentTitle")} onClose={onClose} footer={<button type="button" className="btn btn-mc" onClick={onClose}>{t("suggest.modal.close")}</button>}>
        <p className="d-flex gap-2 mb-2"><CheckCircle2 className="text-success flex-shrink-0" aria-hidden="true" />{done}</p>
        <p className="small text-muted mb-0">{t("suggest.modal.followUp")} <Link to="/profile?tab=suggestions" onClick={onClose}>{t("suggest.modal.followLink")}</Link>.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={t("suggest.modal.title")}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="btn btn-light" onClick={onClose} disabled={busy}>{t("suggest.modal.cancel")}</button>
          <button type="submit" form="suggest-correction-form" className="btn btn-mc" disabled={busy}>{busy ? t("suggest.modal.sending") : t("suggest.modal.send")}</button>
        </>
      )}
    >
      <form id="suggest-correction-form" onSubmit={submit}>
        <p className="small text-muted">{t("suggest.modal.intro", { mosque: mosque.name })}</p>

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="suggest-field">{t("suggest.modal.whatWrong")}</label>
          <select id="suggest-field" className="form-select" value={field} onChange={(e) => changeField(e.target.value)}>
            {SUGGESTION_FIELDS.map((item) => <option key={item.value} value={item.value}>{t(`suggest.fields.${item.value}`)}</option>)}
          </select>
        </div>

        {field === "prayer_time" && (
          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-4">
              <label className="form-label small" htmlFor="suggest-prayer">{t("suggest.modal.prayer")}</label>
              <select id="suggest-prayer" className="form-select" value={payload.prayer} onChange={(e) => setPayload(initialPayload("prayer_time", mosque, { prayer: e.target.value }))}>
                {PRAYERS.map((prayer) => <option key={prayer.value} value={prayer.value}>{t(`prayer.${prayer.value}`)}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="suggest-jamaat">{t("suggest.modal.jamaatTime")}</label>
              <input id="suggest-jamaat" type="time" className="form-control" required value={payload.jamaat_time || ""} onChange={(e) => set("jamaat_time", e.target.value)} />
            </div>
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="suggest-adhan">{t("suggest.modal.adhanOptional")}</label>
              <input id="suggest-adhan" type="time" className="form-control" value={payload.adhan_time || ""} onChange={(e) => set("adhan_time", e.target.value)} />
            </div>
          </div>
        )}

        {field === "jumuah" && (
          <div className="row g-2 mb-3">
            {(mosque.jumuah_sessions || []).length > 1 && (
              <div className="col-12">
                <label className="form-label small" htmlFor="suggest-session">{t("suggest.modal.whichJumuah")}</label>
                <select id="suggest-session" className="form-select" value={payload.sequence} onChange={(e) => setPayload(initialPayload("jumuah", mosque, { sequence: Number(e.target.value) }))}>
                  {mosque.jumuah_sessions.map((session) => <option key={session.sequence} value={session.sequence}>{session.label}</option>)}
                </select>
              </div>
            )}
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-jumuah-jamaat">{t("suggest.modal.jamaatTime")}</label>
              <input id="suggest-jumuah-jamaat" type="time" className="form-control" required value={payload.jamaat_time || ""} onChange={(e) => set("jamaat_time", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-khutbah">{t("suggest.modal.khutbahOptional")}</label>
              <input id="suggest-khutbah" type="time" className="form-control" value={payload.khutbah_time || ""} onChange={(e) => set("khutbah_time", e.target.value)} />
            </div>
          </div>
        )}

        {field === "phone" && (
          <div className="mb-3">
            <label className="form-label small" htmlFor="suggest-phone">{t("suggest.modal.phone")}</label>
            <input id="suggest-phone" type="tel" className="form-control" required maxLength={50} value={payload.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
        )}

        {field === "address" && (
          <div className="row g-2 mb-3">
            <div className="col-12">
              <label className="form-label small" htmlFor="suggest-address">{t("suggest.modal.address")}</label>
              <input id="suggest-address" className="form-control" required maxLength={500} value={payload.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-area">{t("suggest.modal.area")}</label>
              <input id="suggest-area" className="form-control" maxLength={100} value={payload.area || ""} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small" htmlFor="suggest-district">{t("suggest.modal.district")}</label>
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
              hint={t("suggest.modal.pinHint")}
              onChange={({ lat, lng }) => setPayload({ latitude: lat, longitude: lng })}
            />
          </div>
        )}

        {field === "facilities" && (
          <fieldset className="mb-3">
            <legend className="form-label small">{t("suggest.modal.tickFacilities")}</legend>
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
                    <label className="form-check-label" htmlFor={`suggest-facility-${key}`}>{t(meta.labelKey, { defaultValue: meta.label })}</label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {field !== "other" && field !== "location" && (
          <p className="small text-muted">{t("suggest.modal.nowShown", { value: describeValue(field, initialPayload(field, mosque, { prayer: payload.prayer, sequence: payload.sequence }), t, locale) })}</p>
        )}

        <div className="mb-1">
          <label className="form-label small" htmlFor="suggest-note">{field === "other" ? t("suggest.modal.whatWrong") : t("suggest.modal.howKnow")}</label>
          <textarea id="suggest-note" className="form-control" rows={3} maxLength={1000} required={field === "other"} placeholder={field === "other" ? t("suggest.modal.otherPlaceholder") : t("suggest.modal.notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
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
