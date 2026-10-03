import { Link } from "react-router-dom";
import { Clock3, Heart, MapPin, Navigation, Star } from "lucide-react";
import { directionsUrl } from "../utils/mosqueDiscovery";
import { isEstimatedPrayer, nextJamaatLabel } from "../utils/prayerTime";
import { useNow } from "../hooks/useNow";
import { useFollow } from "../context/FollowContext";
import EstimatedBadge from "./EstimatedBadge";
import FacilityBadge from "./FacilityBadge";
import VerifiedBadge from "./VerifiedBadge";

// A mosque result card used on the Browse page.
export default function MosqueCard({ mosque }) {
  const { isFollowing: following, toggleFollow } = useFollow(mosque?.id);
  const directions = directionsUrl(mosque);
  // [Urmee · F1 Part 3] useNow() re-renders each minute so "Next jamat" moves on by itself.
  const nextJamaat = nextJamaatLabel(mosque.prayer, useNow());

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
            <h3 className="h6 fw-bold mb-1">{mosque.name}</h3>
          </div>

          <span className="badge mc-badge ms-2 text-nowrap">
            {mosque.distance} km
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
              {mosque.rating}
            </>
          )}
          {mosque.verified && <VerifiedBadge className={mosque.rating !== null ? "ms-1" : "ms-0"} />}

          {nextJamaat && (
            <span className="text-muted ms-2">
              <Clock3 size={14} className="me-1" aria-hidden="true" />
              {nextJamaat.text}
              {isEstimatedPrayer(mosque.prayer_sources, nextJamaat.prayer) && <EstimatedBadge className="ms-1" />}
            </span>
          )}
        </div>

        <div className="mb-3">
          {mosque.facilities.slice(0, 3).map((f) => (
            <FacilityBadge key={f} facilityKey={f} />
          ))}

          {mosque.facilities.length > 3 && (
            <span className="badge mc-badge">
              +{mosque.facilities.length - 3}
            </span>
          )}
        </div>

        <div className="mt-auto d-flex gap-2">
          <Link
            to={`/mosque/${mosque.id}`}
            className="btn btn-mc btn-sm flex-fill"
          >
            View
          </Link>

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-mc btn-sm"
              title="Get directions"
              aria-label={`Get directions to ${mosque.name} (opens in a new tab)`}
            >
              <Navigation size={16} aria-hidden="true" />
            </a>
          )}

          <button
            className={`btn btn-sm ${
              following ? "btn-danger" : "btn-outline-secondary"
            }`}
            title={following ? "Unfollow" : "Follow"}
            aria-label={following ? `Unfollow ${mosque.name}` : `Follow ${mosque.name}`}
            aria-pressed={following}
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
