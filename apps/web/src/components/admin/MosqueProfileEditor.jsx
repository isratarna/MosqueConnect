import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import LocationPicker from "./LocationPicker";
import { FACILITY_META } from "../../data/mosques";
import { removeMosquePhoto, updateMosqueProfile, uploadMosquePhoto } from "../../utils/dashboardApi";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function useSaveState() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const run = async (task, success) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, message, run, setError };
}

/** Cover photo: preview, replace and remove. */
function PhotoField({ mosque, onSaved }) {
  const { busy, error, message, run, setError } = useSaveState();

  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > MAX_PHOTO_BYTES) return setError("The photo must be 4 MB or smaller.");
    run(async () => onSaved(await uploadMosquePhoto(mosque.id, file)), "Photo updated.");
  };

  return (
    <div className="mb-4">
      <span className="form-label d-block fw-semibold">Cover photo</span>
      <div className="mc-dash-photo">
        {mosque.photo_url
          ? <img src={mosque.photo_url} alt={`Cover photo of ${mosque.name}`} />
          : <div className="mc-dash-photo__empty">No photo yet. Mosques with a photo are easier to recognise.</div>}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-2">
        <label className={`btn btn-sm btn-outline-mc mb-0 ${busy ? "disabled" : ""}`}>
          <ImagePlus size={15} aria-hidden="true" /> {mosque.photo_url ? "Replace photo" : "Upload photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onFile} disabled={busy} />
        </label>
        {mosque.photo_url && (
          <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => run(async () => onSaved(await removeMosquePhoto(mosque.id)), "Photo removed.")}>
            <Trash2 size={15} aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      <div className="form-text">JPG, PNG or WebP, up to 4 MB.</div>
      {busy && <div className="small text-muted" role="status">Uploading…</div>}
      {error && <div className="small text-danger" role="alert">{error}</div>}
      {message && <div className="small text-success" role="status">{message}</div>}
    </div>
  );
}

/** Dashboard section "Mosque Profile". */
export function ProfileForm({ mosque, onSaved }) {
  const [values, setValues] = useState({});
  const [point, setPoint] = useState(null);
  const { busy, error, message, run } = useSaveState();

  useEffect(() => {
    setValues({
      name: mosque.name || "",
      address: mosque.address || "",
      district: mosque.district || "",
      area: mosque.area || "",
      phone: mosque.phone || "",
      description: mosque.description || "",
    });
    setPoint({ lat: Number(mosque.latitude), lng: Number(mosque.longitude) });
  }, [mosque.id]);

  const input = (key) => ({ id: `mosque-${key}`, name: key, value: values[key] ?? "", onChange: (e) => setValues((v) => ({ ...v, [key]: e.target.value })) });

  const onSubmit = (event) => {
    event.preventDefault();
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) return;
    run(async () => {
      const saved = await updateMosqueProfile(mosque.id, {
        ...values,
        district: values.district || null,
        area: values.area || null,
        phone: values.phone || null,
        description: values.description || null,
        latitude: point.lat,
        longitude: point.lng,
      });
      onSaved(saved);
    }, "Profile saved.");
  };

  return (
    <div>
      <h2 className="h4 mb-3">Mosque Profile</h2>
      <PhotoField mosque={mosque} onSaved={onSaved} />
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-name">Mosque name</label>
            <input className="form-control" required maxLength={255} {...input("name")} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-address">Street address</label>
            <input className="form-control" required {...input("address")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-district">District</label>
            <input className="form-control" maxLength={100} placeholder="e.g. Dhaka" {...input("district")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-area">Area</label>
            <input className="form-control" maxLength={100} placeholder="e.g. Mirpur 10" {...input("area")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-phone">Phone number</label>
            <input className="form-control" type="tel" maxLength={255} {...input("phone")} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-description">Description</label>
            <textarea className="form-control" rows={3} {...input("description")} />
          </div>
          <div className="col-12">
            <span className="form-label d-block">Map location</span>
            <LocationPicker value={point} onChange={setPoint} idPrefix="mosque-location" hint="Click the map or drag the pin to the mosque's entrance." />
          </div>
        </div>
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        {message && <div className="alert alert-success py-2 mt-3" role="status">{message}</div>}
        <button className="btn btn-mc mt-3" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}

/** Dashboard section "Facilities". */
export function FacilitiesForm({ mosque, onSaved }) {
  const { busy, error, message, run } = useSaveState();

  const onSubmit = (event) => {
    event.preventDefault();
    const facilities = new FormData(event.currentTarget).getAll("facilities");
    run(async () => onSaved(await updateMosqueProfile(mosque.id, { facilities })), "Facilities saved.");
  };

  return (
    <form onSubmit={onSubmit}>
      <h2 className="h4 mb-3">Facilities</h2>
      <div className="row row-cols-1 row-cols-sm-2 g-2 mb-3">
        {Object.entries(FACILITY_META).map(([key, meta]) => (
          <div className="col" key={key}>
            <label className="form-check">
              <input className="form-check-input" name="facilities" type="checkbox" value={key} defaultChecked={mosque.facilities?.some((item) => item.facility_key === key)} />
              {meta.label}
            </label>
          </div>
        ))}
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}
      <button className="btn btn-mc" disabled={busy}>{busy ? "Saving…" : "Save facilities"}</button>
    </form>
  );
}
