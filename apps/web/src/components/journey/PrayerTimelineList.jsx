import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import EstimatedBadge from "../EstimatedBadge";
import FacilityBadge from "../FacilityBadge";
import VerifiedBadge from "../VerifiedBadge";
import { PRAYER_COLORS, formatMinutes, formatTime, prayerKey } from "../../utils/journeyApi";

/*
 * Vertical timeline: ek row te ek namaz. Option bechhe nile map ar
 * "Open in Google Maps" link update hoy. Shudhu time ar option, kono ruling na.
 */
export default function PrayerTimelineList({ prayers, selection, onSelect }) {
  if (!prayers?.length) {
    return <p className="text-muted small">No prayer times fall during this trip.</p>;
  }

  return (
    <ol className="mc-journey-timeline list-unstyled mb-0">
      {prayers.map((prayer) => {
        const key = prayerKey(prayer);
        const color = PRAYER_COLORS[prayer.prayer] || "#12775c";
        const chosen = selection[key] ?? prayer.options?.[0]?.mosque.id;
        const near = prayer.window.near_label ? ` near ${prayer.window.near_label}` : "";

        return (
          <li key={key} className="mc-journey-timeline__row" style={{ "--mc-prayer-color": color }}>
            <div className="d-flex flex-wrap align-items-baseline gap-2 mb-2">
              <h3 className="h6 mb-0">{prayer.label}</h3>
              <span className="small text-muted">
                {formatTime(prayer.window.starts_at)} – {formatTime(prayer.window.ends_at)}{near}
              </span>
            </div>

            {prayer.status === "none_reachable" && (
              <div className="alert alert-warning py-2 small mb-2">
                <TriangleAlert size={14} aria-hidden="true" /> No mosque on the way fits a {prayer.label} jamaat.{" "}
                {prayer.label} lasts until about {formatTime(prayer.window.ends_at)}{near}.
                {prayer.options.length > 0 && " Closest mosques on the route:"}
              </div>
            )}

            <div className="d-grid gap-2">
              {prayer.options.map((option) => (
                <label
                  key={option.mosque.id}
                  className={`mc-journey-option ${prayer.status === "ok" && chosen === option.mosque.id ? "is-selected" : ""}`}
                >
                  {prayer.status === "ok" && (
                    <input
                      type="radio"
                      className="form-check-input me-2"
                      name={key}
                      checked={chosen === option.mosque.id}
                      onChange={() => onSelect(key, option.mosque.id)}
                    />
                  )}
                  <span className="flex-grow-1">
                    <span className="d-block fw-semibold">
                      <Link to={`/mosque/${option.mosque.id}`} onClick={(e) => e.stopPropagation()}>{option.mosque.name}</Link>
                      {option.mosque.verified && <VerifiedBadge className="ms-1" />}
                      {option.estimated && <> <EstimatedBadge /></>}
                    </span>
                    <span className="d-block small">
                      {option.label} jamaat {formatTime(option.jamaat_at)} · you pass at {formatTime(option.pass_at)}
                      {option.feasible
                        ? ` · ${formatMinutes(option.detour_min)} detour · ${formatMinutes(option.wait_min)} wait · arrive ${formatMinutes(option.delay_min)} later`
                        : ` · ${(option.off_route_m / 1000).toFixed(1)} km off route`}
                    </span>
                    {option.mosque.facilities.length > 0 && (
                      <span className="d-block mt-1">
                        {option.mosque.facilities.map((facility) => <FacilityBadge key={facility} facilityKey={facility} />)}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
