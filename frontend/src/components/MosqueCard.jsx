import { useState } from "react";
import { Link } from "react-router-dom";
import { directionsUrl } from "../data/mosques";
import FacilityBadge from "./FacilityBadge";
import VerifiedBadge from "./VerifiedBadge";

// A mosque result card used on the Browse page.
export default function MosqueCard({ mosque }) {
  const [following, setFollowing] = useState(false);

  return (
    <div className="card mc-card h-100">
      <img src={mosque.photo} className="mc-card-img" alt={mosque.name} loading="lazy" />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h6 className="fw-bold mb-1">{mosque.name}</h6>
            {mosque.verified && <VerifiedBadge className="ms-0" />}
          </div>
          <span className="badge mc-badge ms-2 text-nowrap">{mosque.distance} km</span>
        </div>
        <div className="text-muted small mb-2">
          <i className="bi bi-geo-alt me-1" />
          {mosque.address}
        </div>
        <div className="small mb-2">
          <i className="bi bi-star-fill text-warning" /> {mosque.rating}
          <span className="text-muted ms-2">
            <i className="bi bi-clock" /> Dhuhr {mosque.prayer.Dhuhr} PM
          </span>
        </div>
        <div className="mb-3">
          {mosque.facilities.slice(0, 3).map((f) => (
            <FacilityBadge key={f} facilityKey={f} />
          ))}
          {mosque.facilities.length > 3 && (
            <span className="badge mc-badge">+{mosque.facilities.length - 3}</span>
          )}
        </div>
        <div className="mt-auto d-flex gap-2">
          <Link to={`/mosque/${mosque.id}`} className="btn btn-mc btn-sm flex-fill">
            View
          </Link>
          <a
            href={directionsUrl(mosque)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-mc btn-sm"
            title="Get directions"
          >
            <i className="bi bi-compass" />
          </a>
          <button
            className={`btn btn-sm ${following ? "btn-danger" : "btn-outline-secondary"}`}
            title="Follow"
            onClick={() => setFollowing((v) => !v)}
          >
            <i className={`bi ${following ? "bi-heart-fill" : "bi-heart"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
