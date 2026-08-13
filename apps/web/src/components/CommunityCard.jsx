import { Link } from "react-router-dom";
import {
  BellRing,
  CalendarDays,
  Clock3,
  Droplets,
  HandHeart,
  Info,
  MapPin,
  Megaphone,
  MessageSquareText,
  SearchCheck,
  UsersRound,
} from "lucide-react";
import { getCommunityCategoryLabel } from "../data/community";
import VerifiedBadge from "./VerifiedBadge";

const CATEGORY_ICONS = {
  announcement: Megaphone,
  prayer: Clock3,
  event: CalendarDays,
  blood: Droplets,
  volunteer: UsersRound,
  "lost-found": SearchCheck,
  complaint: MessageSquareText,
  suggestion: MessageSquareText,
  notice: Info,
};

const URGENCY_LABELS = {
  urgent: "Urgent",
  important: "Important",
};

export function CommunityCategoryIcon({ category, size = 18, ...props }) {
  const Icon = CATEGORY_ICONS[category] || BellRing;
  return <Icon size={size} aria-hidden="true" {...props} />;
}

export default function CommunityCard({ item, featured = false }) {
  const urgencyLabel = URGENCY_LABELS[item.urgency];

  return (
    <article className={`mc-community-card mc-card${featured ? " mc-community-card--featured" : ""}${item.urgency === "urgent" ? " is-urgent" : ""}`}>
      <div className="mc-community-card__meta">
        <span className="mc-community-card__category">
          <CommunityCategoryIcon category={item.category} size={15} />
          {getCommunityCategoryLabel(item.category)}
        </span>
        {urgencyLabel && <span className={`mc-community-card__urgency is-${item.urgency}`}>{urgencyLabel}</span>}
      </div>

      <h3>{item.title}</h3>
      <p>{item.summary}</p>

      <div className="mc-community-card__details">
        <span>
          <MapPin size={14} aria-hidden="true" />
          {item.area}
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {item.publishedLabel}
        </span>
      </div>

      <div className="mc-community-card__source">
        <span>{item.mosqueName}</span>
        {item.mosqueVerified && <VerifiedBadge />}
        {item.mosqueId && (
          <Link to={`/mosque/${item.mosqueId}`} className="mc-community-card__link">
            View mosque
          </Link>
        )}
      </div>
    </article>
  );
}
