import { Link } from "react-router-dom";
import { Clock3, Heart, MapPin, Navigation, Star } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { formatNumber } from "../utils/intl";
import { directionsUrl } from "../utils/mosqueDiscovery";
import { dhuhrJamaatLabel, isEstimatedPrayer } from "../utils/prayerTime";
import { useFollow } from "../context/FollowContext";
import EstimatedBadge from "./EstimatedBadge";
import FacilityBadge from "./FacilityBadge";
import VerifiedBadge from "./VerifiedBadge";

// A mosque result card used on the Browse page.
export default function MosqueCard({ mosque }) {
  const { t, locale } = useLocale();
  const { isFollowing: following, toggleFollow } = useFollow(mosque?.id);
  const directions = directionsUrl(mosque);

  return (
    <div className="card mc-card h-100">
      <img
        src={mosque.photo}
        className="mc-card-img"
        alt={mosque.name}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/uiRef.jpeg";
        }}
      />

      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h6 className="fw-bold mb-1">{mosque.name}</h6>
          </div>

          <span className="badge mc-badge ms-2 text-nowrap">
            {t("common.distanceKm", { distance: mosque.distance })}
          </span>
        </div>

        <div className="text-muted small mb-2">
          <MapPin size={14} className="me-1" aria-hidden="true" />
          {mosque.address}
        </div>

        <div className="small mb-2">
          {mosque.rating !== null && (
            <>
              <Star size={14} className="text-warning me-1" fill="currentColor" aria-hidden="true" />
              {formatNumber(mosque.rating, locale)}
            </>
          )}
          {mosque.verified && <VerifiedBadge className={mosque.rating !== null ? "ms-1" : "ms-0"} />}

          {dhuhrJamaatLabel(mosque.prayer, locale, t("prayer.dhuhr")) && (
            <span className="text-muted ms-2">
              <Clock3 size={14} className="me-1" aria-hidden="true" />
              {dhuhrJamaatLabel(mosque.prayer, locale, t("prayer.dhuhr"))}
              {isEstimatedPrayer(mosque.prayer_sources, "Dhuhr") && <EstimatedBadge className="ms-1" />}
            </span>
          )}
        </div>

        <div className="mb-3">
          {mosque.facilities.slice(0, 3).map((f) => (
            <FacilityBadge key={f} facilityKey={f} />
          ))}

          {mosque.facilities.length > 3 && (
            <span className="badge mc-badge">
              {t("mosque.moreFacilities", { count: mosque.facilities.length - 3 })}
            </span>
          )}
        </div>

        <div className="mt-auto d-flex gap-2">
          <Link
            to={`/mosque/${mosque.id}`}
            className="btn btn-mc btn-sm flex-fill"
          >
            {t("mosque.view")}
          </Link>

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-mc btn-sm"
              title={t("mosque.getDirections")}
              aria-label={t("mosque.getDirections")}
            >
              <Navigation size={16} aria-hidden="true" />
            </a>
          )}

          <button
            className={`btn btn-sm ${
              following ? "btn-danger" : "btn-outline-secondary"
            }`}
            title={following ? t("mosque.unfollow") : t("mosque.follow")}
            aria-label={following ? t("mosque.unfollow") : t("mosque.follow")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFollow(mosque);
            }}
          >
            <Heart
              size={16}
              fill={following ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
