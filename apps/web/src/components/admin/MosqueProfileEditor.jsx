import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import LocationPicker from "./LocationPicker";
import PhotoGalleryManager from "./PhotoGalleryManager";
import { FACILITY_META } from "../../data/mosques";
import { removeMosquePhoto, updateMosqueProfile, uploadMosquePhoto } from "../../utils/dashboardApi";
import { useLocale } from "../../hooks/useLocale";

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
  const { t } = useLocale(); // [Urmee · i18n dashboard] text from the locale files
  const { busy, error, message, run, setError } = useSaveState();

  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError(t("profileAdmin.photoType"));
    if (file.size > MAX_PHOTO_BYTES) return setError(t("profileAdmin.photoSize"));
    run(async () => onSaved(await uploadMosquePhoto(mosque.id, file)), t("profileAdmin.photoUpdated"));
  };

  return (
    <div className="mb-4">
      <span className="form-label d-block fw-semibold">{t("profileAdmin.coverPhoto")}</span>
      <div className="mc-dash-photo">
        {mosque.photo_url
          ? <img src={mosque.photo_url} alt={t("profileAdmin.coverAlt", { name: mosque.name })} />
          : <div className="mc-dash-photo__empty">{t("profileAdmin.noPhoto")}</div>}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-2">
        <label className={`btn btn-sm btn-outline-mc mb-0 ${busy ? "disabled" : ""}`}>
          <ImagePlus size={15} aria-hidden="true" /> {mosque.photo_url ? t("profileAdmin.replacePhoto") : t("profileAdmin.uploadPhoto")}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onFile} disabled={busy} />
        </label>
        {mosque.photo_url && (
          <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => run(async () => onSaved(await removeMosquePhoto(mosque.id)), t("profileAdmin.photoRemoved"))}>
            <Trash2 size={15} aria-hidden="true" /> {t("profileAdmin.removePhoto")}
          </button>
        )}
      </div>
      <div className="form-text">{t("profileAdmin.photoHelp")}</div>
      {busy && <div className="small text-muted" role="status">{t("profileAdmin.uploading")}</div>}
      {error && <div className="small text-danger" role="alert">{error}</div>}
      {message && <div className="small text-success" role="status">{message}</div>}
    </div>
  );
}

/** Dashboard section "Mosque Profile". */
export function ProfileForm({ mosque, onSaved }) {
  const { t } = useLocale();
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

  // The picker also reports address, district and area for the pin; copy whatever it found into the form.
  // [Urmee · F2 Part 1] The picker reports address, district and area for the pin; copy whatever it
  // found into the form fields.
  const onLocation = ({ lat, lng, address, district, area }) => {
    setPoint({ lat, lng });
    setValues((current) => ({
      ...current,
      ...(address ? { address } : {}),
      ...(district ? { district } : {}),
      ...(area ? { area } : {}),
    }));
  };

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
    }, t("profileAdmin.saved"));
  };

  return (
    <div>
      <h2 className="h4 mb-3">{t("profileAdmin.heading")}</h2>
      <PhotoField mosque={mosque} onSaved={onSaved} />
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-name">{t("profileAdmin.name")}</label>
            <input className="form-control" required maxLength={255} {...input("name")} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-address">{t("profileAdmin.address")}</label>
            <input className="form-control" required {...input("address")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-district">{t("profileAdmin.district")}</label>
            <input className="form-control" maxLength={100} placeholder={t("profileAdmin.districtPlaceholder")} {...input("district")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-area">{t("profileAdmin.area")}</label>
            <input className="form-control" maxLength={100} placeholder={t("profileAdmin.areaPlaceholder")} {...input("area")} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="mosque-phone">{t("profileAdmin.phone")}</label>
            <input className="form-control" type="tel" maxLength={255} {...input("phone")} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="mosque-description">{t("profileAdmin.description")}</label>
            <textarea className="form-control" rows={3} {...input("description")} />
          </div>
          <div className="col-12">
            <span className="form-label d-block">{t("profileAdmin.mapLocation")}</span>
            <LocationPicker value={point} onChange={onLocation} idPrefix="mosque-location" hint={t("profileAdmin.mapHint")} />
          </div>
        </div>
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        {message && <div className="alert alert-success py-2 mt-3" role="status">{message}</div>}
        <button className="btn btn-mc mt-3" disabled={busy}>{busy ? t("profileAdmin.saving") : t("profileAdmin.save")}</button>
      </form>
      {/* [Urmee · F3 Part 2] Placed in the existing Mosque Profile section so AdminDashboard.jsx (being rebuilt by others) is not touched. */}
      <PhotoGalleryManager mosque={mosque} onCoverChanged={(url) => onSaved({ ...mosque, photo_url: url })} />
    </div>
  );
}

/** Dashboard section "Facilities". */
export function FacilitiesForm({ mosque, onSaved }) {
  const { t } = useLocale();
  const { busy, error, message, run } = useSaveState();

  const onSubmit = (event) => {
    event.preventDefault();
    const facilities = new FormData(event.currentTarget).getAll("facilities");
    run(async () => onSaved(await updateMosqueProfile(mosque.id, { facilities })), t("profileAdmin.facilitiesSaved"));
  };

  return (
    <form onSubmit={onSubmit}>
      <h2 className="h4 mb-3">{t("profileAdmin.facilitiesHeading")}</h2>
      <div className="row row-cols-1 row-cols-sm-2 g-2 mb-3">
        {Object.entries(FACILITY_META).map(([key, meta]) => (
          <div className="col" key={key}>
            <label className="form-check">
              <input className="form-check-input" name="facilities" type="checkbox" value={key} defaultChecked={mosque.facilities?.some((item) => item.facility_key === key)} />
              {t(meta.labelKey, { defaultValue: meta.label })}
            </label>
          </div>
        ))}
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}
      <button className="btn btn-mc" disabled={busy}>{busy ? t("profileAdmin.saving") : t("profileAdmin.saveFacilities")}</button>
    </form>
  );
}
