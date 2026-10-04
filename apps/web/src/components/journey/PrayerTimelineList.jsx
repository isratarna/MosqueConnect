import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import EstimatedBadge from "../EstimatedBadge";
import FacilityBadge from "../FacilityBadge";
import VerifiedBadge from "../VerifiedBadge";
import { PRAYER_COLORS, prayerKey } from "../../utils/journeyApi";
import { formatMinutesT, formatTimeT, prayerNameT } from "../../utils/journeyFormat";
import { useLocale } from "../../hooks/useLocale";

/*
 * Vertical timeline: ek row te ek namaz. Option bechhe nile map ar
 * "Open in Google Maps" link update hoy. Shudhu time ar option, kono ruling na.
 */
export default function PrayerTimelineList({ prayers, selection, onSelect }) {
  const { t, locale } = useLocale();
  if (!prayers?.length) {
    return <p className="text-muted small">{t("journey.timeline.none")}</p>;
  }

  return (
    <ol className="mc-journey-timeline list-unstyled mb-0">
      {prayers.map((prayer) => {
        const key = prayerKey(prayer);
        const color = PRAYER_COLORS[prayer.prayer] || "#12775c";
        const chosen = selection[key] ?? prayer.options?.[0]?.mosque.id;
        const near = prayer.window.near_label ? t("journey.timeline.near", { place: prayer.window.near_label }) : "";
        const prayerName = prayerNameT(t, prayer.label, prayer.prayer);

        return (
          <li key={key} className="mc-journey-timeline__row" style={{ "--mc-prayer-color": color }}>
            <div className="d-flex flex-wrap align-items-baseline gap-2 mb-2">
              <h3 className="h6 mb-0">{prayerName}</h3>
              <span className="small text-muted">
                {formatTimeT(prayer.window.starts_at, locale)} – {formatTimeT(prayer.window.ends_at, locale)}{near}
              </span>
            </div>

            {prayer.status === "none_reachable" && (
              <div className="alert alert-warning py-2 small mb-2">
                <TriangleAlert size={14} aria-hidden="true" /> {t("journey.timeline.noneReachable", { prayer: prayerName, time: formatTimeT(prayer.window.ends_at, locale), near })}
                {prayer.options.length > 0 && ` ${t("journey.timeline.closest")}`}
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
                      {t("journey.timeline.option", { prayer: prayerNameT(t, option.label, prayer.prayer), jamaat: formatTimeT(option.jamaat_at, locale), pass: formatTimeT(option.pass_at, locale) })}
                      {option.feasible
                        ? t("journey.timeline.feasible", { detour: formatMinutesT(t, option.detour_min), wait: formatMinutesT(t, option.wait_min), delay: formatMinutesT(t, option.delay_min) })
                        : t("journey.timeline.offRoute", { km: (option.off_route_m / 1000).toFixed(1) })}
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
