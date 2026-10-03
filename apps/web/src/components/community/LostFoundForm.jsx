import { useEffect, useState } from "react";
import Modal from "../Modal";
import { createLostFound, LOST_FOUND_CATEGORIES, searchMosques } from "../../utils/communityHubApi";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * "Report a lost / found item". When opened from a mosque page the mosque is
 * fixed; otherwise people can search for one or leave it empty.
 */
export default function LostFoundForm({ mosque: fixedMosque = null, onClose, onCreated }) {
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
    <Modal title="Report a lost or found item" onClose={onClose} busy={busy}>
      <form onSubmit={submit} id="lost-found-form">
        <div className="btn-group w-100 mb-3" role="group" aria-label="Did you lose or find it?">
          {[["lost", "I lost something"], ["found", "I found something"]].map(([value, label]) => (
            <button type="button" key={value} className={`btn ${type === value ? "btn-mc" : "btn-outline-mc"}`} aria-pressed={type === value} onClick={() => setType(value)}>{label}</button>
          ))}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-title">What is it?</label>
          <input id="lf-title" name="title" className="form-control" required maxLength={255} placeholder="e.g. Black leather wallet" />
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-category">Category</label>
            <select id="lf-category" name="category" className="form-select" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {LOST_FOUND_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-date">{type === "lost" ? "Date lost" : "Date found"}</label>
            <input id="lf-date" name="occurred_on" type="date" className="form-control" required max={today()} defaultValue={today()} />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-description">Description</label>
          <textarea id="lf-description" name="description" className="form-control" rows={3} required maxLength={5000} placeholder="Colour, brand, anything that helps the owner recognise it" />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="lf-mosque">Mosque (optional)</label>
          {mosque ? (
            <div className="d-flex align-items-center gap-2">
              <span className="form-control-plaintext fw-semibold">{mosque.name || mosque.title}</span>
              {!fixedMosque && <button type="button" className="btn btn-sm btn-link" onClick={() => { setMosque(null); setMosqueQuery(""); }}>Change</button>}
            </div>
          ) : (
            <>
              <input id="lf-mosque" className="form-control" value={mosqueQuery} onChange={(e) => setMosqueQuery(e.target.value)} placeholder="Search by mosque name or area" autoComplete="off" />
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
          <label className="form-label" htmlFor="lf-location">Where exactly? (optional)</label>
          <input id="lf-location" name="location_note" className="form-control" maxLength={255} placeholder="e.g. Shoe rack by the main gate" />
        </div>
        <div className="row g-2 mb-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-phone">Contact phone (optional)</label>
            <input id="lf-phone" name="contact_phone" className="form-control" maxLength={30} inputMode="tel" />
            <p className="form-text mb-0">Shown on the item so people can reach you.</p>
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="lf-photo">Photo (optional)</label>
            <input id="lf-photo" name="photo" type="file" className="form-control" accept="image/jpeg,image/png,image/webp" />
          </div>
        </div>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? "Posting…" : "Post item"}</button>
        </div>
      </form>
    </Modal>
  );
}
