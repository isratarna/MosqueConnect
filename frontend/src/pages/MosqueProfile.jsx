import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMosque, directionsUrl, urgencyClass } from "../data/mosques";
import FacilityBadge from "../components/FacilityBadge";
import MapView from "../components/MapView";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Jummah"];

export default function MosqueProfile() {
  const { id } = useParams();
  const mosque = getMosque(id);
  const [following, setFollowing] = useState(false);

  if (!mosque) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-exclamation-triangle fs-1 text-warning" />
        <h4 className="mt-3">Mosque not found</h4>
        <p className="text-muted">This mosque doesn't exist in our demo data.</p>
        <Link to="/browse" className="btn btn-mc"><i className="bi bi-arrow-left me-1" />Back to Browse</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item"><Link to="/" className="text-mc text-decoration-none">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/browse" className="text-mc text-decoration-none">Browse</Link></li>
          <li className="breadcrumb-item active">{mosque.name}</li>
        </ol>
      </nav>

      <div className="mc-profile-hero mb-4" style={{ backgroundImage: `url('${mosque.photo}')` }}>
        <div className="mc-profile-title">
          <h1 className="h3 fw-bold mb-1">{mosque.name}</h1>
          <div><i className="bi bi-geo-alt me-1" />{mosque.address}</div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        <span className="badge bg-success"><i className="bi bi-star-fill me-1" />{mosque.rating}</span>
        <span className="text-muted small"><i className="bi bi-telephone me-1" />{mosque.phone}</span>
        <div className="ms-auto d-flex gap-2">
          <a href={directionsUrl(mosque)} target="_blank" rel="noopener noreferrer" className="btn btn-mc btn-sm">
            <i className="bi bi-compass me-1" />Get Directions
          </a>
          <button
            className={"btn btn-sm " + (following ? "btn-danger" : "btn-outline-mc")}
            onClick={() => setFollowing((v) => !v)}
          >
            <i className={"bi me-1 " + (following ? "bi-heart-fill" : "bi-heart")} />
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* prayer times */}
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><i className="bi bi-clock-history text-mc me-2" />Prayer &amp; Jamat Times</h5>
              <div className="row row-cols-3 row-cols-md-6 g-2">
                {PRAYER_ORDER.map((p) => (
                  <div className="col" key={p}>
                    <div className="mc-prayer-cell bg-light rounded-3">
                      <small className="text-muted d-block">{p}</small>
                      <span className="h5">{mosque.prayer[p]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* announcements */}
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><i className="bi bi-megaphone text-mc me-2" />Announcements</h5>
              {mosque.announcements.length ? (
                mosque.announcements.map((a, i) => (
                  <div className={`border-start border-4 border-${urgencyClass(a.urgency)} ps-3 mb-3`} key={i}>
                    <div className="d-flex justify-content-between">
                      <strong>{a.title}</strong>
                      <span className={`badge bg-${urgencyClass(a.urgency)} text-uppercase`}>{a.urgency}</span>
                    </div>
                    <p className="mb-1 small text-muted">{a.body}</p>
                    <small className="text-muted"><i className="bi bi-calendar3 me-1" />{a.date}</small>
                  </div>
                ))
              ) : (
                <p className="text-muted mb-0">No announcements right now.</p>
              )}
            </div>
          </div>

          {/* events */}
          <div className="card mc-card">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><i className="bi bi-calendar-event text-mc me-2" />Events</h5>
              {mosque.events.length ? (
                mosque.events.map((e, i) => (
                  <div className="d-flex mb-3" key={i}>
                    <div className="mc-feature-icon me-3"><i className="bi bi-calendar-check" /></div>
                    <div>
                      <strong>{e.title}</strong>
                      <div className="small text-mc">{e.when}</div>
                      <div className="small text-muted">{e.desc}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted mb-0">No upcoming events.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><i className="bi bi-building-check text-mc me-2" />Facilities</h6>
              <div>{mosque.facilities.map((f) => <FacilityBadge key={f} facilityKey={f} />)}</div>
            </div>
          </div>
          <div className="card mc-card">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><i className="bi bi-map text-mc me-2" />Location</h6>
              <MapView
                center={{ lat: mosque.lat, lng: mosque.lng }}
                zoom={15}
                mosques={[mosque]}
                className="mc-map mc-map--sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
