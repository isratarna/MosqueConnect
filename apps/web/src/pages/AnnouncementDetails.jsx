import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  getAnnouncementById,
} from "../data/announcements";
import { CommunityCategoryIcon } from "../components/CommunityCard";
import VerifiedBadge from "../components/VerifiedBadge";

export default function AnnouncementDetails() {
  const { id } = useParams();
  const announcement = getAnnouncementById(id);

  if (!announcement) {
    return <AnnouncementNotFound />;
  }

  return (
    <section className="mc-announcement-details mc-atmospheric-section">
      <div className="container py-5">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item"><Link to="/" className="text-mc text-decoration-none">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/community" className="text-mc text-decoration-none">Community</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Announcement details</li>
          </ol>
        </nav>

        <div className="mc-announcement-details__layout mc-motion-stagger">
          <article className="mc-announcement-details__content mc-card">
            <div className="mc-announcement-details__meta">
              <span className="mc-community-card__category">
                <CommunityCategoryIcon category={announcement.category} size={16} />
                {announcement.typeLabel}
              </span>
              <span className={`mc-announcement-details__urgency is-${announcement.urgency.tone}`}>
                {announcement.urgency.label}
              </span>
            </div>

            <h1>{announcement.title}</h1>
            <div className="mc-announcement-details__published">
              <Clock3 size={15} aria-hidden="true" />
              <span>Published {announcement.publishedLabel}</span>
            </div>

            <div className="mc-announcement-details__body">
              <p>{announcement.description}</p>
            </div>

            <div className="mc-announcement-details__actions">
              <Link to="/community" className="btn btn-outline-mc">
                <ArrowLeft size={16} aria-hidden="true" /> Back to Community
              </Link>
              {announcement.mosqueId && (
                <Link to={`/mosque/${announcement.mosqueId}`} className="btn btn-mc">
                  View mosque
                </Link>
              )}
            </div>
          </article>

          <aside className="mc-announcement-details__sidebar">
            <section className="mc-card mc-announcement-details__info">
              <h2>Announcement information</h2>
              <dl>
                <div>
                  <dt><CalendarDays size={15} aria-hidden="true" /> Type</dt>
                  <dd>{announcement.typeLabel}</dd>
                </div>
                <div>
                  <dt><Clock3 size={15} aria-hidden="true" /> Published</dt>
                  <dd>{announcement.publishedLabel}</dd>
                </div>
                <div>
                  <dt><MapPin size={15} aria-hidden="true" /> Location</dt>
                  <dd>{announcement.location}</dd>
                </div>
                <div>
                  <dt><UserRound size={15} aria-hidden="true" /> Published by</dt>
                  <dd>{announcement.publishedBy}</dd>
                </div>
                {announcement.contact && (
                  <div>
                    <dt><Phone size={15} aria-hidden="true" /> Contact</dt>
                    <dd><a href={`tel:${announcement.contact.replace(/\s/g, "")}`}>{announcement.contact}</a></dd>
                  </div>
                )}
              </dl>
            </section>

            {announcement.mosqueName && (
              <section className="mc-card mc-announcement-details__source">
                <p className="mc-card-eyebrow">Source</p>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <h2>{announcement.mosqueName}</h2>
                  {announcement.mosqueVerified && <VerifiedBadge />}
                </div>
                {announcement.area && <p>{announcement.area}</p>}
              </section>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function AnnouncementNotFound() {
  return (
    <section className="mc-announcement-details mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-announcement-details__not-found mc-card text-center">
          <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
          <h1>Announcement not found</h1>
          <p>This announcement may no longer be available.</p>
          <Link to="/community" className="btn btn-mc">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Community
          </Link>
        </div>
      </div>
    </section>
  );
}
