import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import LocationPicker from "../components/admin/LocationPicker";
import FacilityIcon from "../components/FacilityIcon";
import { FACILITY_META } from "../data/mosques";
import { apiRequest } from "../utils/api";
import { fetchMosqueById } from "../utils/mosqueDiscovery";
import { useLocale } from "../hooks/useLocale";

/**
 * [Urmee · F3 Part 3] "Suggest a mosque": for a mosque that isn't in the database yet.
 * Needs a name, address, district and a pin (the LocationPicker also fills address, district and area).
 * POST /api/mosque-suggestions answers 409 with the id of a mosque that already exists nearby; we then
 * show that mosque with a "Claim this mosque instead" button. A super admin approves or rejects the suggestion.
 */
export default function SuggestMosque() {
  const { t } = useLocale(); // [Urmee · i18n pages] text from the locale files
  const [values, setValues] = useState({ name: "", address: "", district: "", area: "", phone: "", notes: "" });
  const [facilities, setFacilities] = useState(() => new Set());
  const [point, setPoint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicate, setDuplicate] = useState(null); // existing mosque found nearby
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = t("suggestMosque.pageTitle"); }, [t]);

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
      setError(t("suggestMosque.pinFirst"));
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
        setDuplicate(existing || { id: requestError.data?.mosque_id, name: t("suggestMosque.nearby") });
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
        <h1 className="h3">{t("suggestMosque.thanks")}</h1>
        <p className="text-muted">{t("suggestMosque.sentBody")} <Link to="/profile?tab=claims">{t("suggestMosque.sentLink")}</Link>.</p>
        <Link to="/browse" className="btn btn-mc">{t("suggestMosque.browse")}</Link>
      </div>
    );
  }

  const invalid = (field) => (fieldErrors[field] ? "is-invalid" : "");
  const errorText = (field) => fieldErrors[field] && <div className="invalid-feedback">{fieldErrors[field][0]}</div>;

  return (
    <div className="container py-4 py-lg-5 mc-page-narrow">
      <h1 className="h3 fw-bold">{t("suggestMosque.heading")}</h1>
      <p className="text-muted">{t("suggestMosque.intro")} <Link to="/browse">{t("suggestMosque.browse")}</Link>.</p>

      {duplicate && (
        <div className="alert alert-warning" role="alert">
          <strong>{duplicate.name}</strong> {t("suggestMosque.alreadyExists")}
          <div className="mt-2 d-flex flex-wrap gap-2">
            <Link to={`/mosque-admin/claim?mosque=${duplicate.id}`} className="btn btn-mc btn-sm">{t("suggestMosque.claimInstead")}</Link>
            <Link to={`/mosque/${duplicate.id}`} className="btn btn-outline-secondary btn-sm">{t("suggestMosque.viewIt")}</Link>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <form onSubmit={submit} className="card border-0 shadow-sm">
        <div className="card-body p-4 row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-name">{t("suggestMosque.name")} <span className="text-danger">*</span></label>
            <input id="sm-name" className={`form-control ${invalid("name")}`} required maxLength={255} value={values.name} onChange={set("name")} />
            {errorText("name")}
          </div>
          <div className="col-12">
            <span className="form-label fw-semibold d-block">{t("suggestMosque.location")} <span className="text-danger">*</span></span>
            <LocationPicker idPrefix="suggest-mosque" value={point} onChange={onLocation} hint={t("suggestMosque.mapHint")} />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-address">{t("suggestMosque.address")} <span className="text-danger">*</span></label>
            <input id="sm-address" className={`form-control ${invalid("address")}`} required value={values.address} onChange={set("address")} />
            {errorText("address")}
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-district">{t("suggestMosque.district")} <span className="text-danger">*</span></label>
            <input id="sm-district" className={`form-control ${invalid("district")}`} required maxLength={100} value={values.district} onChange={set("district")} />
            {errorText("district")}
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-area">{t("suggestMosque.area")}</label>
            <input id="sm-area" className="form-control" maxLength={100} value={values.area} onChange={set("area")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-semibold" htmlFor="sm-phone">{t("suggestMosque.phone")}</label>
            <input id="sm-phone" type="tel" className="form-control" maxLength={255} value={values.phone} onChange={set("phone")} />
          </div>
          <fieldset className="col-12">
            <legend className="form-label fw-semibold">{t("suggestMosque.facilities")}</legend>
            <div className="row row-cols-1 row-cols-sm-2 g-1">
              {Object.entries(FACILITY_META).map(([key, meta]) => (
                <div className="col" key={key}>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id={`sm-f-${key}`} checked={facilities.has(key)} onChange={() => toggleFacility(key)} />
                    <label className="form-check-label" htmlFor={`sm-f-${key}`}><FacilityIcon facilityKey={key} size={14} className="me-1 text-mc" />{t(meta.labelKey, { defaultValue: meta.label })}</label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="sm-notes">{t("suggestMosque.notes")}</label>
            <textarea id="sm-notes" className="form-control" rows="3" maxLength={5000} value={values.notes} onChange={set("notes")} />
          </div>
          <div className="col-12 text-end">
            <button className="btn btn-mc" disabled={busy}>{busy ? t("suggestMosque.sending") : t("suggestMosque.send")}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
