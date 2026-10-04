import { useEffect, useState } from "react";
import Modal from "../Modal";
import { createLostFound, hubLabelT, LOST_FOUND_CATEGORIES, searchMosques } from "../../utils/communityHubApi";
import { useLocale } from "../../hooks/useLocale";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * "Report a lost / found item". When opened from a mosque page the mosque is
 * fixed; otherwise people can search for one or leave it empty.
 */
export default function LostFoundForm({ mosque: fixedMosque = null, onClose, onCreated }) {
  const { t } = useLocale(); // [Urmee · i18n community]
  const [type, setType] = useState("lost");
  const [mosque, setMosque] = useState(fixedMosque);
  const [mosqueQuery, setMosqueQuery] = useState("");
  const [mosqueResults, setMosqueResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (fixedMosque || mosque || mosqueQuery.trim().length < 2) { setMosqueResults([]); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchMosques(mosqueQuery.trim(), { signal: controller.signal })
        .then((data) => setMosqueResults(data.data?.mosques?.items || []))
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [fixedMosque, mosque, mosqueQuery]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("type", type);
    if (mosque) form.set("mosque_id", mosque.id);
    if (!form.get("photo")?.size) form.delete("photo");
    ["location_note", "contact_phone"].forEach((key) => { if (!String(form.get(key) || "").trim()) form.delete(key); });
    setBusy(true);
    setError("");
    try {
      const data = await createLostFound(form);
      onCreated?.(data.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={t("lostFound.formTitle")} onClose={onClose} busy={busy}>
      <form onSubmit={submit} id="lost-found-form">
        <div className="btn-group w-100 mb-3" role="group" aria-label={t("lostFound.didYou")}>
          {[["lost", t("lostFound.iLost")], ["found", t("lostFound.iFound")]].map(([value, label]) => (
            <button type="button" key={value} className={`btn ${type === value ? "btn-mc" : "btn-outline-mc"}`} aria-pressed={type === value} onClick={() => setType(value)}>{label}</button>
          ))}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-title">{t("lostFound.what")}</label>
          <input id="lf-title" name="title" className="form-control" required maxLength={255} placeholder={t("lostFound.whatPlaceholder")} />
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-category">{t("lostFound.category")}</label>
            <select id="lf-category" name="category" className="form-select" required defaultValue="">
              <option value="" disabled>{t("lostFound.choose")}</option>
              {LOST_FOUND_CATEGORIES.map(([value]) => <option key={value} value={value}>{hubLabelT(t, "lostFoundCategory", value)}</option>)}
            </select>
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-date">{type === "lost" ? t("lostFound.dateLost") : t("lostFound.dateFound")}</label>
            <input id="lf-date" name="occurred_on" type="date" className="form-control" required max={today()} defaultValue={today()} />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-description">{t("lostFound.description")}</label>
          <textarea id="lf-description" name="description" className="form-control" rows={3} required maxLength={5000} placeholder={t("lostFound.descriptionPlaceholder")} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-mosque">{t("lostFound.mosqueOptional")}</label>
          {mosque ? (
            <div className="d-flex align-items-center gap-2">
              <span className="form-control-plaintext fw-semibold">{mosque.name || mosque.title}</span>
              {!fixedMosque && <button type="button" className="btn btn-sm btn-link" onClick={() => { setMosque(null); setMosqueQuery(""); }}>{t("lostFound.change")}</button>}
            </div>
          ) : (
            <>
              <input id="lf-mosque" className="form-control" value={mosqueQuery} onChange={(e) => setMosqueQuery(e.target.value)} placeholder={t("lostFound.mosqueSearch")} autoComplete="off" />
              {mosqueResults.length > 0 && (
                <div className="list-group mt-1">
                  {mosqueResults.map((result) => (
                    <button type="button" key={result.id} className="list-group-item list-group-item-action small" onClick={() => setMosque({ id: result.id, name: result.title })}>
                      <strong>{result.title}</strong>{result.subtitle && <span className="text-muted"> · {result.subtitle}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-location">{t("lostFound.where")}</label>
          <input id="lf-location" name="location_note" className="form-control" maxLength={255} placeholder={t("lostFound.wherePlaceholder")} />
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-phone">{t("lostFound.phone")}</label>
            <input id="lf-phone" name="contact_phone" className="form-control" maxLength={30} inputMode="tel" />
            <p className="form-text mb-0">{t("lostFound.phoneHelp")}</p>
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-photo">{t("lostFound.photo")}</label>
            <input id="lf-photo" name="photo" type="file" className="form-control" accept="image/jpeg,image/png,image/webp" />
          </div>
        </div>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? t("lostFound.posting") : t("lostFound.post")}</button>
        </div>
      </form>
    </Modal>
  );
}
