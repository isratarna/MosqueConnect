import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Clock3, Languages, MapPin, Navigation, Share2, UsersRound } from "lucide-react";
import { directionsUrl } from "../../utils/mosqueDiscovery";
import { googleCalendarUrl } from "../../utils/eidCalendar";
import { downloadEidJamaatIcs, shareEidJamaat } from "../../utils/eidApi";
import { formatClockTime } from "../../utils/prayerTime";
import { useLocale } from "../../hooks/useLocale";
import { formatNumber } from "../../utils/intl";

// [Urmee · i18n dashboard] Pass the active locale ("bn-BD") to get Bangla weekday, month and digits.
export function formatEidDate(date, locale) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date || "";
  return parsed.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * One Eid jamaat with add-to-calendar and share actions. `showMosque` adds the
 * mosque name and a profile link, for lists that mix several mosques.
 */
export default function EidJamaatCard({ jamaat, showMosque = false, active = false, onSelect }) {
  const { t, locale } = useLocale();
  const [shareStatus, setShareStatus] = useState("");
  const directions = directionsUrl(jamaat);
  const googleUrl = googleCalendarUrl(jamaat);

  async function share() {
    try {
      const result = await shareEidJamaat(jamaat);
      setShareStatus(result === "copied" ? t("eid.copied") : "");
    } catch {
      setShareStatus(t("eid.shareFailed"));
    }
  }

  return (
    <article
      className={`mc-eid-jamaat ${onSelect ? "is-selectable" : ""} ${active ? "is-active" : ""}`}
      onClick={onSelect ? () => onSelect(jamaat.id) : undefined}
      aria-current={active || undefined}
    >
      <div className="mc-eid-jamaat__time">
        <Clock3 size={16} aria-hidden="true" />
        <strong>{formatClockTime(jamaat.jamaat_time, locale)}</strong>
        <span>{formatEidDate(jamaat.date, locale)}</span>
      </div>

      <div className="mc-eid-jamaat__body">
        {showMosque && jamaat.mosque && (
          <h3 className="h6 mb-1">
            <Link to={`/mosque/${jamaat.mosque.id}`} className="text-dark text-decoration-none" onClick={(e) => e.stopPropagation()}>
              {jamaat.mosque.name}
            </Link>
          </h3>
        )}
        <div className="small text-muted">
          <MapPin size={14} className="me-1" aria-hidden="true" />
          {jamaat.location_name || (jamaat.at_mosque ? t("eid.atMosque") : t("eid.separateLocation"))}
          {!jamaat.at_mosque && <span className="badge mc-badge ms-2">{t("eid.awayFromMosque")}</span>}
          {jamaat.distance_km !== undefined && <span className="ms-2">· {t("eid.kmAway", { km: formatNumber(Number(jamaat.distance_km).toFixed(1), locale) })}</span>}
        </div>
        <div className="d-flex flex-wrap gap-2 mt-2 small">
          {jamaat.women_arrangement && (
            <span className="badge text-bg-light border"><UsersRound size={13} className="me-1" aria-hidden="true" />{t("eid.womenArrangement")}</span>
          )}
          {jamaat.khutbah_language && (
            <span className="badge text-bg-light border"><Languages size={13} className="me-1" aria-hidden="true" />{t("eid.khutbahLanguage", { language: jamaat.khutbah_language })}</span>
          )}
        </div>
        {jamaat.notes && <p className="small text-muted mb-0 mt-2">{jamaat.notes}</p>}

        <div className="d-flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-mc btn-sm" title={t("eid.addToGoogle")} aria-label={t("eid.addToGoogleAria")}>
              <CalendarPlus size={15} aria-hidden="true" /> {t("eid.googleCalendar")}
            </a>
          )}
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => downloadEidJamaatIcs(jamaat)} title={t("eid.calendarFileTitle")}>
            <CalendarPlus size={15} aria-hidden="true" /> {t("eid.calendarFile")}
          </button>
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={share}>
            <Share2 size={15} aria-hidden="true" /> {t("eid.share")}
          </button>
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-outline-mc btn-sm" aria-label={t("eid.getDirections")}>
              <Navigation size={15} aria-hidden="true" /> {t("eid.directions")}
            </a>
          )}
          {shareStatus && <span className="small text-muted align-self-center" role="status">{shareStatus}</span>}
        </div>
      </div>
    </article>
  );
}
