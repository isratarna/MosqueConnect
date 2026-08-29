import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Heart,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Phone,
  Star,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { urgencyClass } from "../data/mosques";
import { getAnnouncementDetailsPath, getMosqueAnnouncementId } from "../data/announcements";
import FacilityBadge from "../components/FacilityBadge";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import PrayerTimeline from "../components/PrayerTimeline";
import MosqueEventsSection from "../components/events/MosqueEventsSection";
import MosqueCampaignsSection from "../components/campaigns/MosqueCampaignsSection";
import { directionsUrl, fetchMosqueById } from "../utils/mosqueDiscovery";
import { formatClockTime } from "../utils/prayerTime";
import { useFollow } from "../context/FollowContext";

export default function MosqueProfile() {
  const { id } = useParams();
  const [mosque, setMosque] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const { isFollowing: following, toggleFollow } = useFollow(id);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    setMosque(null);
    setFollowing(false);

    fetchMosqueById(id)
      .then((result) => {
        if (!active) return;
        setMosque(result);
        setStatus("success");
      })
      .catch((requestError) => {
        if (!active) return;
        setMosque(null);
        setStatus("error");
        setError(requestError.message || "Mosque details could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [id, retryKey]);

  if (status === "loading") {
    return (
      <div className="container py-5 text-center" role="status">
        <LoaderCircle size={36} className="text-mc spin" aria-hidden="true" />
        <p className="text-muted mt-3 mb-0">Loading mosque profile…</p>
      </div>
    );
  }

  if (status === "error" || !mosque) {
    return (
      <div className="container py-5 text-center">
        <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
        <h4 className="mt-3">Mosque not found</h4>
        <p className="text-muted">{error || "This mosque could not be loaded."}</p>
        <div className="d-flex justify-content-center gap-2 flex-wrap">
          <button type="button" className="btn btn-outline-mc" onClick={() => setRetryKey((value) => value + 1)}>
            Try again
          </button>
          <Link to="/browse" className="btn btn-mc">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const prayer = mosque.prayer || {};
  const announcements = Array.isArray(mosque.announcements) ? mosque.announcements : [];
  const facilities = Array.isArray(mosque.facilities) ? mosque.facilities : [];
  const jumuahSessions = Array.isArray(mosque.jumuah_sessions) ? mosque.jumuah_sessions : [];
  const prayerSchedule = Array.isArray(mosque.prayer_schedule) ? mosque.prayer_schedule : [];
  const hasDailyPrayer = Object.values(prayer).some(Boolean) || prayerSchedule.length > 0;
  const directions = directionsUrl(mosque);

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
        {mosque.rating !== null && (
          <span className="badge bg-success">
            <Star size={13} className="me-1" fill="currentColor" aria-hidden="true" />
            {mosque.rating}
          </span>
        )}
        {mosque.verified && <VerifiedBadge />}
        {mosque.phone && (
          <span className="text-muted small">
            <Phone size={14} className="me-1" aria-hidden="true" />
            {mosque.phone}
          </span>
        )}
        <div className="ms-auto d-flex gap-2">
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-mc btn-sm">
              <Navigation size={16} aria-hidden="true" />
              Get Directions
            </a>
          )}
          <button
            className={"btn btn-sm " + (following ? "btn-danger" : "btn-outline-mc")}
            onClick={() => toggleFollow(mosque)}
          >
            <Heart size={16} fill={following ? "currentColor" : "none"} aria-hidden="true" />
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {mosque.description && (
        <p className="text-muted mb-4">{mosque.description}</p>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card mc-card mb-4" id="prayer-schedule">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Clock3 size={18} className="text-mc me-2" aria-hidden="true" />Prayer &amp; Jamat Times</h5>
              {hasDailyPrayer ? (
                <PrayerTimeline prayers={prayer} schedule={prayerSchedule} />
              ) : (
                <p className="text-muted mb-0">Prayer times have not been published for this mosque yet.</p>
              )}
            </div>
          </div>

          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Sun size={18} className="text-mc me-2" aria-hidden="true" />Jummah Prayer</h5>
              {jumuahSessions.length ? (
                <div className="row row-cols-1 row-cols-md-2 g-2">
                  {jumuahSessions.map((session) => (
                    <div className="col" key={session.id || session.sequence || session.label}>
                      <div className="mc-prayer-cell bg-light rounded-3">
                        <small className="text-muted d-block">{session.label}</small>
                        <span className="h5">{formatClockTime(session.jamaat_time)}</span>
                        {session.khutbah_time && (
                          <small className="text-muted d-block">Khutbah {formatClockTime(session.khutbah_time)}</small>
                        )}
                        {session.notes && (
                          <small className="text-muted d-block">{session.notes}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">Jumuah times have not been published for this mosque yet.</p>
              )}
            </div>
          </div>

          <div className="card mc-card mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Megaphone size={18} className="text-mc me-2" aria-hidden="true" />Announcements</h5>
              {announcements.length ? (
                announcements.map((announcement, index) => {
                  const announcementId = announcement.id || getMosqueAnnouncementId(mosque.id, announcement, index);
                  const publishedOn = announcement.date || (announcement.published_at || "").slice(0, 10);

                  return (
                    <div className={`border-start border-4 border-${urgencyClass(announcement.urgency)} ps-3 mb-3`} key={announcementId}>
                      <div className="d-flex justify-content-between">
                        <strong>
                          <Link to={getAnnouncementDetailsPath(announcementId)} className="text-dark text-decoration-none">
                            {announcement.title}
                          </Link>
                        </strong>
                        <span className={`badge bg-${urgencyClass(announcement.urgency)} text-uppercase`}>{announcement.urgency}</span>
                      </div>
                      <p className="mb-1 small text-muted">{announcement.body}</p>
                      <div className="d-flex align-items-center gap-3">
                        {publishedOn && (
                          <small className="text-muted">
                            <CalendarDays size={14} className="me-1" aria-hidden="true" />
                            {publishedOn}
                          </small>
                        )}
                        <Link to={getAnnouncementDetailsPath(announcementId)} className="small text-mc text-decoration-none">
                          Read details
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted mb-0">No announcements right now.</p>
              )}
            </div>
          </div>

          <MosqueEventsSection mosqueId={mosque.id} />
          <MosqueCampaignsSection mosqueId={mosque.id} />
        </div>

        <div className="col-lg-4">
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><Building2 size={18} className="text-mc me-2" aria-hidden="true" />Facilities</h6>
              {facilities.length ? (
                <div>{facilities.map((facility) => <FacilityBadge key={facility} facilityKey={facility} />)}</div>
              ) : (
                <p className="text-muted mb-0 small">Facility details have not been published yet.</p>
              )}
            </div>
          </div>
          <div className="card mc-card">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><MapIcon size={18} className="text-mc me-2" aria-hidden="true" />Location</h6>
              <MapView
                center={{ lat: mosque.lat, lng: mosque.lng }}
                zoom={15}
                mosques={[mosque]}
                selectedMosqueId={mosque.id}
                className="mc-map mc-map--sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
