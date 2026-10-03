import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Clock3, Languages, MapPin, Navigation, Share2, UsersRound } from "lucide-react";
import { directionsUrl } from "../../utils/mosqueDiscovery";
import { googleCalendarUrl } from "../../utils/eidCalendar";
import { downloadEidJamaatIcs, shareEidJamaat } from "../../utils/eidApi";
import { formatClockTime } from "../../utils/prayerTime";

export function formatEidDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date || "";
  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * One Eid jamaat with add-to-calendar and share actions. `showMosque` adds the
 * mosque name and a profile link, for lists that mix several mosques.
 */
export default function EidJamaatCard({ jamaat, showMosque = false, active = false, onSelect }) {
  const [shareStatus, setShareStatus] = useState("");
  const directions = directionsUrl(jamaat);
  const googleUrl = googleCalendarUrl(jamaat);

  async function share() {
    try {
      const result = await shareEidJamaat(jamaat);
      setShareStatus(result === "copied" ? "Copied to clipboard" : "");
    } catch {
      setShareStatus("Could not share");
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
        <strong>{formatClockTime(jamaat.jamaat_time)}</strong>
        <span>{formatEidDate(jamaat.date)}</span>
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
          {jamaat.location_name || (jamaat.at_mosque ? "At the mosque" : "Separate location")}
          {!jamaat.at_mosque && <span className="badge mc-badge ms-2">Away from the mosque</span>}
          {jamaat.distance_km !== undefined && <span className="ms-2">· {Number(jamaat.distance_km).toFixed(1)} km away</span>}
        </div>
        <div className="d-flex flex-wrap gap-2 mt-2 small">
          {jamaat.women_arrangement && (
            <span className="badge text-bg-light border"><UsersRound size={13} className="me-1" aria-hidden="true" />Women's arrangement</span>
          )}
          {jamaat.khutbah_language && (
            <span className="badge text-bg-light border"><Languages size={13} className="me-1" aria-hidden="true" />Khutbah: {jamaat.khutbah_language}</span>
          )}
        </div>
        {jamaat.notes && <p className="small text-muted mb-0 mt-2">{jamaat.notes}</p>}

        <div className="d-flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-mc btn-sm" title="Add to Google Calendar" aria-label="Add to Google Calendar (opens in a new tab)">
              <CalendarPlus size={15} aria-hidden="true" /> Google Calendar
            </a>
          )}
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => downloadEidJamaatIcs(jamaat)} title="Download for Apple Calendar, Outlook and others">
            <CalendarPlus size={15} aria-hidden="true" /> Calendar file
          </button>
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={share}>
            <Share2 size={15} aria-hidden="true" /> Share
          </button>
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-outline-mc btn-sm" aria-label="Get directions">
              <Navigation size={15} aria-hidden="true" /> Directions
            </a>
          )}
          {shareStatus && <span className="small text-muted align-self-center" role="status">{shareStatus}</span>}
        </div>
      </div>
    </article>
  );
}
