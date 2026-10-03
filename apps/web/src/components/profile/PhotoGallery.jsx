import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "../Modal";
import { useLocale } from "../../hooks/useLocale";

/**
 * Thumbnail grid for a mosque's photos. Clicking one opens a lightbox: ← → keys move between photos,
 * Esc closes it, and focus stays inside (the shared Modal handles Esc, focus trap and focus return).
 */
// [Urmee · F3 Part 2] Responsive thumbnail grid + lightbox. ← → change photo, Esc closes; the shared
// Modal keeps focus inside and returns it afterwards.
export default function PhotoGallery({ photos, mosqueName }) {
  const { t } = useLocale(); // [Urmee · i18n profile]
  const [openIndex, setOpenIndex] = useState(null);
  const count = photos.length;

  useEffect(() => {
    if (openIndex === null) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowRight") setOpenIndex((index) => (index + 1) % count);
      if (event.key === "ArrowLeft") setOpenIndex((index) => (index - 1 + count) % count);
    };
    // [Urmee · F3 Part 2] Arrow keys only listen while the lightbox is open; the % count makes the gallery
    // wrap around.
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, count]);

  if (!count) return null;
  const photo = openIndex === null ? null : photos[openIndex];
  const step = (delta) => setOpenIndex((index) => (index + delta + count) % count);

  return (
    <>
      <ul className="mc-gallery list-unstyled mb-0">
        {photos.map((item, index) => (
          <li key={item.id}>
            <button type="button" className="mc-gallery__thumb" onClick={() => setOpenIndex(index)} aria-label={item.caption ? t("gallery.openPhotoCaption", { n: index + 1, count, caption: item.caption }) : t("gallery.openPhoto", { n: index + 1, count })}>
              <img src={item.url} alt={item.caption || t("gallery.photoAlt", { n: index + 1, mosque: mosqueName })} loading="lazy" width="320" height="240" />
            </button>
          </li>
        ))}
      </ul>

      {photo && (
        <Modal
          size="modal-xl"
          title={t("gallery.lightboxTitle", { mosque: mosqueName, n: openIndex + 1, count })}
          onClose={() => setOpenIndex(null)}
          footer={count > 1 && (
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={() => step(-1)}><ChevronLeft size={16} aria-hidden="true" /> {t("gallery.previous")}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => step(1)}>{t("gallery.next")} <ChevronRight size={16} aria-hidden="true" /></button>
            </>
          )}
        >
          <figure className="mb-0 text-center">
            <img src={photo.url} alt={photo.caption || t("gallery.photoAlt", { n: openIndex + 1, mosque: mosqueName })} className="mc-gallery__large" />
            {photo.caption && <figcaption className="small text-muted mt-2">{photo.caption}</figcaption>}
          </figure>
        </Modal>
      )}
    </>
  );
}
