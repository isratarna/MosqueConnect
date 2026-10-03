import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, UploadCloud, X } from "lucide-react";
import { apiUrl } from "../../config";
import { apiRequest } from "../../utils/api";
import { getAuthHeaders } from "../../utils/authApi";
import { fetchMosqueById } from "../../utils/mosqueDiscovery";
import ConfirmDialog from "../ConfirmDialog";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";
import { translate } from "../../i18n/translate";

const MAX_PHOTOS = 10;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** fetch() has no upload progress, so photos go up with XMLHttpRequest and report upload.onprogress. */
// [Urmee · F3 Part 2] fetch() has no upload progress, so photos go up with XMLHttpRequest and report
// upload.onprogress for the progress bar.
function uploadPhoto(mosqueId, file, caption, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("photo", file);
    if (caption) body.append("caption", caption);
    const request = new XMLHttpRequest();
    request.open("POST", apiUrl(`/api/admin/mosques/${mosqueId}/photos`));
    Object.entries(getAuthHeaders()).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => {
      let payload = {};
      try { payload = JSON.parse(request.responseText); } catch { /* keep {} */ }
      if (request.status >= 200 && request.status < 300) resolve(payload);
      else reject(new Error(Object.values(payload.errors || {}).flat().join(" ") || payload.message || translate("gallery.uploadFailed")));
    };
    request.onerror = () => reject(new Error(translate("gallery.uploadFailedNetwork")));
    request.send(body);
  });
}

/**
 * Admin gallery manager: drag-and-drop or choose files, client-side checks (type, ≤ 4 MB, ≤ 10 photos),
 * preview + caption before uploading, progress bar, then set cover / edit caption / delete.
 */
export default function PhotoGalleryManager({ mosque, onCoverChanged }) {
  const { t } = useLocale(); // [Urmee · i18n dashboard]
  const [photos, setPhotos] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [queue, setQueue] = useState([]); // { key, file, preview, caption, progress, error }
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const inputRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchMosqueById(mosque.id);
      setPhotos(fresh.photos || []);
      setCoverUrl(fresh.photo_url || null);
    } catch (loadError) {
      setError(loadError.message);
      setPhotos((current) => current || []);
    }
  }, [mosque.id]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => () => queue.forEach((item) => URL.revokeObjectURL(item.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // [Urmee · F3 Part 2] Client-side checks before anything is sent: JPG/PNG/WebP, ≤ 4 MB, and at most 10
  // photos in total (existing + queued). The server checks again.
  const addFiles = (fileList) => {
    setMessage("");
    setError("");
    const room = MAX_PHOTOS - (photos?.length ?? 0) - queue.length;
    const accepted = [];
    const problems = [];
    [...fileList].forEach((file) => {
      if (!TYPES.includes(file.type)) problems.push(t("gallery.badType", { name: file.name }));
      else if (file.size > MAX_BYTES) problems.push(t("gallery.badSize", { name: file.name }));
      else if (accepted.length >= room) problems.push(t("gallery.tooMany", { name: file.name, max: MAX_PHOTOS }));
      else accepted.push({ key: `${file.name}-${file.size}-${Math.random()}`, file, preview: URL.createObjectURL(file), caption: "", progress: 0, error: "" });
    });
    if (problems.length) setError(problems.join(" "));
    if (accepted.length) setQueue((current) => [...current, ...accepted]);
  };

  const patchQueue = (key, patch) => setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const dropFromQueue = (key) => setQueue((current) => {
    current.filter((item) => item.key === key).forEach((item) => URL.revokeObjectURL(item.preview));
    return current.filter((item) => item.key !== key);
  });

  const uploadAll = async () => {
    setUploading(true);
    setError("");
    setMessage("");
    let done = 0;
    for (const item of queue) {
      try {
        await uploadPhoto(mosque.id, item.file, item.caption.trim(), (progress) => patchQueue(item.key, { progress, error: "" }));
        dropFromQueue(item.key);
        done += 1;
      } catch (uploadError) {
        patchQueue(item.key, { error: uploadError.message, progress: 0 });
      }
    }
    setUploading(false);
    if (done) setMessage(t("gallery.uploaded", { count: done }));
    await reload();
  };

  const act = async (task, success) => {
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
      await reload();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const base = `/api/admin/mosques/${mosque.id}/photos`;
  // [Urmee · F3 Part 2] "Set as cover" decides which photo cards, the map popup and the profile hero
  // show.
  const setCover = (photo) => act(async () => {
    await apiRequest(`${base}/${photo.id}/cover`, { method: "PATCH" });
    onCoverChanged?.(photo.url);
  }, t("gallery.coverUpdated"));
  const saveCaption = (photo, caption) => act(() => apiRequest(`${base}/${photo.id}`, { method: "PATCH", body: { caption: caption.trim() || null } }), t("gallery.captionSaved"));

  const full = (photos?.length ?? 0) + queue.length >= MAX_PHOTOS;

  return (
    <section className="mt-4" aria-labelledby="gallery-manager-title">
      <h3 id="gallery-manager-title" className="h5 mb-1">{t("gallery.title")}</h3>
      <p className="small text-muted">{t("gallery.intro", { max: MAX_PHOTOS })}</p>

      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2 small" role="status">{message}</div>}

      <div
        className={`mc-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!full) addFiles(event.dataTransfer.files); }}
      >
        <UploadCloud size={26} aria-hidden="true" />
        <p className="mb-2">{t("gallery.dragHere")}</p>
        <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => inputRef.current?.click()} disabled={full || uploading}>
          <ImagePlus size={15} aria-hidden="true" /> {t("gallery.choose")}
        </button>
        <input ref={inputRef} type="file" accept={TYPES.join(",")} multiple className="visually-hidden" aria-label={t("gallery.chooseAria")} onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        {full && <p className="small text-muted mt-2 mb-0">{t("gallery.full")}</p>}
      </div>

      {queue.length > 0 && (
        <div className="mt-3">
          <h4 className="h6">{t("gallery.ready")}</h4>
          <ul className="list-unstyled d-grid gap-2">
            {queue.map((item) => (
              <li key={item.key} className="d-flex gap-3 align-items-start border rounded p-2">
                <img src={item.preview} alt="" width="84" height="64" className="rounded" style={{ objectFit: "cover" }} />
                <div className="flex-grow-1">
                  <label className="visually-hidden" htmlFor={`caption-${item.key}`}>{t("gallery.captionFor", { name: item.file.name })}</label>
                  <input id={`caption-${item.key}`} className="form-control form-control-sm" placeholder={t("gallery.captionOptional")} maxLength={255} value={item.caption} disabled={uploading} onChange={(event) => patchQueue(item.key, { caption: event.target.value })} />
                  {(uploading || item.progress > 0) && (
                    <div className="progress mt-2" role="progressbar" aria-label={t("gallery.uploadingAria", { name: item.file.name })} aria-valuenow={item.progress} aria-valuemin="0" aria-valuemax="100" style={{ height: 6 }}>
                      <div className="progress-bar bg-success" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.error && <div className="small text-danger mt-1" role="alert">{item.error}</div>}
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => dropFromQueue(item.key)} disabled={uploading} aria-label={t("gallery.removeFromList", { name: item.file.name })}><X size={14} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-mc btn-sm" onClick={uploadAll} disabled={uploading}>{uploading ? t("gallery.uploading") : t("gallery.upload", { count: queue.length })}</button>
        </div>
      )}

      <div className="mt-4">
        <SkeletonRegion label={t("gallery.loading")} loading={photos === null}><BlockStack heights={[96]} /></SkeletonRegion>
        {photos && photos.length === 0 && <p className="text-muted small">{t("gallery.none")}</p>}
        {photos && photos.length > 0 && (
          <ul className="mc-admin-photos list-unstyled">
            {photos.map((photo) => {
              const isCover = coverUrl === photo.url;
              return (
                <li key={photo.id} className="mc-admin-photos__item">
                  <img src={photo.url} alt={photo.caption || t("gallery.mosquePhoto")} loading="lazy" width="320" height="240" />
                  {isCover && <span className="badge bg-success mc-admin-photos__badge"><Star size={11} fill="currentColor" aria-hidden="true" /> {t("gallery.cover")}</span>}
                  <CaptionEditor photo={photo} onSave={saveCaption} />
                  <div className="d-flex gap-2 mt-2">
                    {!isCover && <button type="button" className="btn btn-sm btn-outline-mc" onClick={() => setCover(photo)}>{t("gallery.setCover")}</button>}
                    <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={() => setConfirm(photo)} aria-label={photo.caption ? t("gallery.deleteAriaCaption", { caption: photo.caption }) : t("gallery.deleteAria")}><Trash2 size={14} aria-hidden="true" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={t("gallery.deleteTitle")}
          message={t("gallery.deleteMessage")}
          confirmLabel={t("gallery.deleteConfirm")}
          tone="danger"
          onConfirm={() => act(() => apiRequest(`${base}/${confirm.id}`, { method: "DELETE" }), t("gallery.deleted"))}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

function CaptionEditor({ photo, onSave }) {
  const { t } = useLocale();
  const [value, setValue] = useState(photo.caption || "");
  const changed = value !== (photo.caption || "");
  return (
    <div className="d-flex gap-1 mt-2">
      <label className="visually-hidden" htmlFor={`photo-caption-${photo.id}`}>{t("gallery.caption")}</label>
      <input id={`photo-caption-${photo.id}`} className="form-control form-control-sm" placeholder={t("gallery.addCaption")} maxLength={255} value={value} onChange={(event) => setValue(event.target.value)} />
      {changed && <button type="button" className="btn btn-sm btn-mc" onClick={() => onSave(photo, value)}>{t("gallery.save")}</button>}
    </div>
  );
}
