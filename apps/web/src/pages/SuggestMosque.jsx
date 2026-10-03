import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import LocationPicker from "../components/admin/LocationPicker";
import FacilityIcon from "../components/FacilityIcon";
import { FACILITY_META } from "../data/mosques";
import { apiRequest } from "../utils/api";
import { fetchMosqueById } from "../utils/mosqueDiscovery";

/**
 * [Urmee · F3 Part 3] "Suggest a mosque": for a mosque that isn't in the database yet.
 * Needs a name, address, district and a pin (the LocationPicker also fills address, district and area).
 * POST /api/mosque-suggestions answers 409 with the id of a mosque that already exists nearby; we then
 * show that mosque with a "Claim this mosque instead" button. A super admin approves or rejects the suggestion.
 */
export default function SuggestMosque() {
  const [values, setValues] = useState({ name: "", address: "", district: "", area: "", phone: "", notes: "" });
  const [facilities, setFacilities] = useState(() => new Set());
  const [point, setPoint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicate, setDuplicate] = useState(null); // existing mosque found nearby
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = "Suggest a mosque · MosqueConnect"; }, []);

  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const toggleFacility = (key) => setFacilities((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // The picker reports address, district and area for the pin; fill in whatever the person hasn't typed.
  // [Urmee · F3 Part 3] The picker reports address, district and area for the pin; they fill the form so
  // it matches the map (the person can still edit them).
  const onLocation = ({ lat, lng, address, district, area }) => {
    setPoint({ lat, lng });
    setValues((current) => ({
      ...current,
      address: address || current.address,
      district: district || current.district,
      area: area || current.area,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setDuplicate(null);
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) {
      setError("Please pin the mosque's location on the map first.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/mosque-suggestions", {
        method: "POST",
        body: {
          name: values.name.trim(),
          address: values.address.trim(),
          district: values.district.trim(),
          area: values.area.trim() || null,
          phone: values.phone.trim() || null,
          notes: values.notes.trim() || null,
          facilities: [...facilities],
          latitude: point.lat,
          longitude: point.lng,
        },
      });
      setDone(true);
    } catch (requestError) {
      // [Urmee · F3 Part 3] 409 = a mosque already exists nearby; the API sends its id, so we show it and
      // offer "Claim this mosque instead".
      if (requestError.status === 409) {
        // A mosque already exists nearby: show it so they can claim it instead.
        const existing = requestError.data?.mosque_id ? await fetchMosqueById(requestError.data.mosque_id).catch(() => null) : null;
        setDuplicate(existing || { id: requestError.data?.mosque_id, name: "A mosque near this location" });
      } else {
        setFieldErrors(requestError.errors || {});
        setError(requestError.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="container py-5 mc-page-narrow text-center">
        <CheckCircle2 size={56} className="text-success mb-3" aria-hidden="true" />
        <h1 className="h3">Thank you!</h1>
        <p className="text-muted">Your suggestion was sent for review. Once a super admin approves it, the mosque will appear in search and can be claimed. You can follow its status under <Link to="/profile?tab=claims">Profile → Mosque Applications</Link>.</p>
        <Link to="/browse" className="btn btn-mc">Browse mosques</Link>
      </div>
    );
  }

  const invalid = (field) => (fieldErrors[field] ? "is-invalid" : "");
  const errorText = (field) => fieldErrors[field] && <div className="invalid-feedback">{fieldErrors[field][0]}</div>;

  return (
    <div className="container py-4 py-lg-5 mc-page-narrow">
      <h1 className="h3 fw-bold">Suggest a mosque</h1>
      <p className="text-muted">Can&apos;t find your mosque? Tell us about it. Search first, so we don&apos;t end up with duplicates: <Link to="/browse">Browse mosques</Link>.</p>

      {duplicate && (
        <div className="alert alert-warning" role="alert">
          <strong>{duplicate.name}</strong> already exists near this location.
          <div className="mt-2 d-flex flex-wrap gap-2">
            <Link to={`/mosque-admin/claim?mosque=${duplicate.id}`} className="btn btn-mc btn-sm">Claim this mosque instead</Link>
            <Link to={`/mosque/${duplicate.id}`} className="btn btn-outline-secondary btn-sm">View it</Link>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <form onSubmit={submit} className="card border-0 shadow-sm">
        <div className="card-body p-4 row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-name">Mosque name <span className="text-danger">*</span></label>
            <input id="sm-name" className={`form-control ${invalid("name")}`} required maxLength={255} value={values.name} onChange={set("name")} />
            {errorText("name")}
          </div>
          <div className="col-12">
            <span className="form-label fw-semibold d-block">Location on the map <span className="text-danger">*</span></span>
            <LocationPicker idPrefix="suggest-mosque" value={point} onChange={onLocation} hint="Search for the address, or click the map or drag the pin to the mosque's entrance." />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-address">Address <span className="text-danger">*</span></label>
            <input id="sm-address" className={`form-control ${invalid("address")}`} required value={values.address} onChange={set("address")} />
            {errorText("address")}
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-district">District <span className="text-danger">*</span></label>
            <input id="sm-district" className={`form-control ${invalid("district")}`} required maxLength={100} value={values.district} onChange={set("district")} />
            {errorText("district")}
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-area">Area</label>
            <input id="sm-area" className="form-control" maxLength={100} value={values.area} onChange={set("area")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-phone">Phone</label>
            <input id="sm-phone" type="tel" className="form-control" maxLength={255} value={values.phone} onChange={set("phone")} />
          </div>
          <fieldset className="col-12">
            <legend className="form-label fw-semibold">Facilities</legend>
            <div className="row row-cols-1 row-cols-sm-2 g-1">
              {Object.entries(FACILITY_META).map(([key, meta]) => (
                <div className="col" key={key}>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id={`sm-f-${key}`} checked={facilities.has(key)} onChange={() => toggleFacility(key)} />
                    <label className="form-check-label" htmlFor={`sm-f-${key}`}><FacilityIcon facilityKey={key} size={14} className="me-1 text-mc" />{meta.label}</label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-notes">Anything else we should know?</label>
            <textarea id="sm-notes" className="form-control" rows="3" maxLength={5000} value={values.notes} onChange={set("notes")} />
          </div>
          <div className="col-12 text-end">
            <button className="btn btn-mc" disabled={busy}>{busy ? "Sending…" : "Send suggestion"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
