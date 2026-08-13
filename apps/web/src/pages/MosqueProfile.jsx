import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Heart,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Phone,
  Star,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { getMosque, directionsUrl, urgencyClass } from "../data/mosques";
import { getAnnouncementDetailsPath, getMosqueAnnouncementId } from "../data/announcements";
import FacilityBadge from "../components/FacilityBadge";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";

const DAILY_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export default function MosqueProfile() {
  const { id } = useParams();
  const mosque = getMosque(id);
  const [following, setFollowing] = useState(false);
  const jummahSessions = [
    { label: "First Jummah", time: mosque.prayer.Jummah || "—" },
    { label: "Second Jummah", time: "—" },
    { label: "Third Jummah", time: "—" },
  ];

  if (!mosque) {
    return (
      <div className="container py-5 text-center">
        <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
        <h4 className="mt-3">Mosque not found</h4>
        <p className="text-muted">This mosque doesn't exist in our demo data.</p>
        <Link to="/browse" className="btn btn-mc"><ArrowLeft size={16} aria-hidden="true" />Back to Browse</Link>
      </div>
    );
  }

  return (
    <div className="container py-4 mc-motion-stagger">
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
          <div><MapPin size={15} className="me-1" aria-hidden="true" />{mosque.address}</div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        <span className="badge bg-success"><Star size={13} className="me-1" fill="currentColor" aria-hidden="true" />{mosque.rating}</span>
        {mosque.verified && <VerifiedBadge />}
        <span className="text-muted small"><Phone size={14} className="me-1" aria-hidden="true" />{mosque.phone}</span>
        <div className="ms-auto d-flex gap-2">
          <a href={directionsUrl(mosque)} target="_blank" rel="noopener noreferrer" className="btn btn-mc btn-sm">
            <Navigation size={16} aria-hidden="true" />Get Directions
          </a>
          <button
            className={"btn btn-sm " + (following ? "btn-danger" : "btn-outline-mc")}
            onClick={() => setFollowing((v) => !v)}
          >
            <Heart size={16} fill={following ? "currentColor" : "none"} aria-hidden="true" />
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* prayer times */}
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Clock3 size={18} className="text-mc me-2" aria-hidden="true" />Prayer &amp; Jamat Times</h5>
              <div className="row row-cols-2 row-cols-md-5 g-2">
                {DAILY_PRAYERS.map((p) => (
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

          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Sun size={18} className="text-mc me-2" aria-hidden="true" />Jummah Prayer</h5>
              <div className="row row-cols-1 row-cols-md-2 g-2">
                {jummahSessions.map((session) => (
                  <div className="col" key={session.label}>
                    <div className="mc-prayer-cell bg-light rounded-3">
                      <small className="text-muted d-block">{session.label}</small>
                      <span className="h5">{session.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* announcements */}
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Megaphone size={18} className="text-mc me-2" aria-hidden="true" />Announcements</h5>
              {mosque.announcements.length ? (
                mosque.announcements.map((a, i) => {
                  const announcementId = getMosqueAnnouncementId(mosque.id, a, i);

                  return (
                    <div className={`border-start border-4 border-${urgencyClass(a.urgency)} ps-3 mb-3`} key={announcementId}>
                      <div className="d-flex justify-content-between">
                        <strong><Link to={getAnnouncementDetailsPath(announcementId)} className="text-dark text-decoration-none">{a.title}</Link></strong>
                        <span className={`badge bg-${urgencyClass(a.urgency)} text-uppercase`}>{a.urgency}</span>
                      </div>
                      <p className="mb-1 small text-muted">{a.body}</p>
                      <div className="d-flex align-items-center gap-3">
                        <small className="text-muted"><CalendarDays size={14} className="me-1" aria-hidden="true" />{a.date}</small>
                        <Link to={getAnnouncementDetailsPath(announcementId)} className="small text-mc text-decoration-none">Read details</Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted mb-0">No announcements right now.</p>
              )}
            </div>
          </div>

          {/* events */}
          <div className="card mc-card">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><CalendarDays size={18} className="text-mc me-2" aria-hidden="true" />Events</h5>
              {mosque.events.length ? (
                mosque.events.map((e, i) => (
                  <div className="d-flex mb-3" key={i}>
                    <div className="mc-feature-icon me-3"><CalendarCheck size={22} aria-hidden="true" /></div>
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
              <h6 className="fw-bold mb-3"><Building2 size={18} className="text-mc me-2" aria-hidden="true" />Facilities</h6>
              <div>{mosque.facilities.map((f) => <FacilityBadge key={f} facilityKey={f} />)}</div>
            </div>
          </div>
          <div className="card mc-card">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><MapIcon size={18} className="text-mc me-2" aria-hidden="true" />Location</h6>
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
