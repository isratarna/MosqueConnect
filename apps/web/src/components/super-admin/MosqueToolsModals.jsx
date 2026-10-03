import { useId, useState } from "react";
import { GitMerge, Search } from "lucide-react";
import Modal from "../Modal";
import { fetchManagedMosques, mergeMosque, updateManagedMosque } from "../../utils/systemAdminApi";

const FIELDS = [
  ["name", "Name", "text", true],
  ["address", "Address", "text", true],
  ["district", "District", "text", false],
  ["area", "Area", "text", false],
  ["phone", "Phone", "text", false],
  ["latitude", "Latitude", "number", true],
  ["longitude", "Longitude", "number", true],
];

/** Edits a mosque's public details. */
export function MosqueEditModal({ mosque, onClose, onSaved }) {
  const formId = useId();
  const [form, setForm] = useState(() => Object.fromEntries([...FIELDS.map(([key]) => [key, mosque[key] ?? ""]), ["description", mosque.description ?? ""]]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const changes = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
      ["district", "area", "phone", "description"].forEach((key) => { if (changes[key] === "") changes[key] = null; });
      await updateManagedMosque(mosque.id, changes);
      onSaved?.();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Edit ${mosque.name}`}
      onClose={onClose}
      busy={busy}
      size="modal-lg"
      footer={<><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" form={formId} className="btn btn-mc" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></>}
    >
      <form id={formId} onSubmit={save} className="row g-3">
        {FIELDS.map(([key, label, type, required]) => (
          <div className={key === "address" || key === "name" ? "col-12" : "col-md-6"} key={key}>
            <label className="form-label fw-semibold" htmlFor={`${formId}-${key}`}>{label}{required && <span className="text-danger"> *</span>}</label>
            <input id={`${formId}-${key}`} className="form-control" type={type} step={type === "number" ? "any" : undefined} required={required} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </div>
        ))}
        <div className="col-12">
          <label className="form-label fw-semibold" htmlFor={`${formId}-description`}>Description</label>
          <textarea id={`${formId}-description`} className="form-control" rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        {error && <div className="col-12"><div className="alert alert-danger small mb-0" role="alert">{error}</div></div>}
      </form>
    </Modal>
  );
}

/** Merges a duplicate mosque into another one, found by search. */
export function MosqueMergeModal({ mosque, onClose, onMerged }) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [target, setTarget] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const find = async (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetchManagedMosques({ search: search.trim(), per_page: 10 });
      setResults((response.data || []).filter((item) => item.id !== mosque.id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const merge = async () => {
    setBusy(true);
    setError("");
    try {
      await mergeMosque(mosque.id, target.id);
      onMerged?.();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Merge “${mosque.name}” into another mosque`}
      onClose={onClose}
      busy={busy}
      size="modal-lg"
      footer={<><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="btn btn-danger d-flex align-items-center gap-1" disabled={busy || !target || confirmText.trim().toUpperCase() !== "MERGE"} onClick={merge}><GitMerge size={16} aria-hidden="true" />{busy ? "Merging…" : "Merge and delete duplicate"}</button></>}
    >
      <p className="small">Followers, events, announcements, campaigns, volunteer opportunities, claims and reports move to the mosque you choose. Then <strong>{mosque.name}</strong> is deleted. This cannot be undone.</p>
      <form className="d-flex gap-2 mb-3" onSubmit={find}>
        <label className="visually-hidden" htmlFor={searchId}>Search for the mosque to keep</label>
        <input id={searchId} className="form-control" placeholder="Search the mosque to keep" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="btn btn-outline-secondary d-flex align-items-center gap-1" disabled={busy}><Search size={16} aria-hidden="true" />Search</button>
      </form>
      {results && results.length === 0 && <p className="small text-muted">No other mosque matches.</p>}
      {results && results.length > 0 && (
        <div className="list-group mb-3" role="radiogroup" aria-label="Mosque to keep">
          {results.map((item) => (
            <label key={item.id} className={`list-group-item list-group-item-action d-flex gap-2 ${target?.id === item.id ? "active" : ""}`}>
              <input type="radio" className="form-check-input mt-1" name="merge-target" checked={target?.id === item.id} onChange={() => setTarget(item)} />
              <span><strong>{item.name}</strong> <span className="small">#{item.id}</span><br /><span className="small">{item.address}</span><br /><span className="small">{item.followers_count} followers · {item.events_count} events · {item.verification_status}</span></span>
            </label>
          ))}
        </div>
      )}
      {target && (
        <div>
          <label className="form-label small fw-semibold" htmlFor={`${searchId}-confirm`}>Type MERGE to confirm merging #{mosque.id} into #{target.id}</label>
          <input id={`${searchId}-confirm`} className="form-control" autoComplete="off" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
        </div>
      )}
      {error && <div className="alert alert-danger small mt-3 mb-0" role="alert">{error}</div>}
    </Modal>
  );
}
