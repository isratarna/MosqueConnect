import { Link } from "react-router-dom";
import { CalendarDays, ImageOff, MapPin } from "lucide-react";
import { labelOf, LOST_FOUND_CATEGORIES, LOST_FOUND_STATUS } from "../../utils/communityHubApi";

export default function LostFoundCard({ item, compact = false }) {
  const [statusLabel, statusClass] = LOST_FOUND_STATUS[item.status] || [item.status, "bg-secondary"];

  return (
    <article className="card mc-card h-100 mc-lost-found-card">
      <Link to={`/community/lost-found/${item.id}`} className="text-decoration-none text-reset">
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="card-img-top mc-lost-found-card__photo" loading="lazy" />
        ) : !compact && (
          <div className="mc-lost-found-card__photo mc-lost-found-card__photo--empty" aria-hidden="true"><ImageOff size={28} /></div>
        )}
        <div className="card-body">
          <div className="d-flex flex-wrap gap-1 mb-2">
            <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"} text-uppercase`}>{item.type}</span>
            <span className="badge bg-light text-dark border">{labelOf(LOST_FOUND_CATEGORIES, item.category)}</span>
            {item.status !== "open" && <span className={`badge ${statusClass}`}>{statusLabel}</span>}
          </div>
          <h3 className="h6 fw-bold mb-1">{item.title}</h3>
          {!compact && <p className="small text-muted mb-2 mc-line-clamp-2">{item.description}</p>}
          <p className="small text-muted mb-0">
            <CalendarDays size={13} className="me-1" aria-hidden="true" />{item.occurred_on}
            {item.mosque && <><span className="mx-1">·</span><MapPin size={13} className="me-1" aria-hidden="true" />{item.mosque.name}</>}
          </p>
        </div>
      </Link>
    </article>
  );
}
