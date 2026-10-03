import { Link } from "react-router-dom";
import {
  BellRing,
  CalendarDays,
  Clock3,
  Droplets,
  MapPin,
  Megaphone,
  HandCoins,
  UsersRound, PackageSearch } from "lucide-react";
import { BLOOD_SOURCE, getCommunityCategoryLabelKey } from "../data/community";
import { useLocale } from "../hooks/useLocale";
import { formatApiDate } from "../utils/intl";
import { getAnnouncementDetailsPath, isAnnouncementItem } from "../data/announcements";
import VerifiedBadge from "./VerifiedBadge";

const CATEGORY_ICONS = {
  announcement: Megaphone,
  event: CalendarDays,
  blood: Droplets,
  volunteer: UsersRound,
  lost_found: PackageSearch,
  campaign: HandCoins,
};

const URGENCY_LABEL_KEYS = {
  urgent: "urgency.urgent",
  important: "urgency.important",
};

export function CommunityCategoryIcon({ category, size = 18, ...props }) {
  const Icon = CATEGORY_ICONS[category] || BellRing;
  return <Icon size={size} aria-hidden="true" {...props} />;
}

export default function CommunityCard({ item, featured = false }) {
  const { t, locale } = useLocale();
  const isBlood = item.category === "blood";
  const title = isBlood ? t("community.bloodRequested", { group: item.blood_group }) : item.title;
  const summary = isBlood ? item.summary || t("community.contactToHelp") : item.summary;
  const sourceName = item.mosqueName === BLOOD_SOURCE ? t("community.bloodSource") : item.mosqueName;
  const urgencyLabelKey = URGENCY_LABEL_KEYS[item.urgency];
  const announcementDetailsPath = isAnnouncementItem(item)
    ? getAnnouncementDetailsPath(item.id)
    : null;

  return (
    <article className={`mc-community-card mc-card${featured ? " mc-community-card--featured" : ""}${item.urgency === "urgent" ? " is-urgent" : ""}`}>
      <div className="mc-community-card__meta">
        <span className="mc-community-card__category">
          <CommunityCategoryIcon category={item.category} size={15} />
          {t(getCommunityCategoryLabelKey(item.category))}
        </span>
        {urgencyLabelKey && <span className={`mc-community-card__urgency is-${item.urgency}`}>{t(urgencyLabelKey)}</span>}
      </div>

      <h3>
        {announcementDetailsPath ? (
          <Link to={announcementDetailsPath} className="mc-community-card__title-link">{title}</Link>
        ) : title}
      </h3>
      <p>{summary}</p>

      <div className="mc-community-card__details">
        <span>
          <MapPin size={14} aria-hidden="true" />
          {item.area}
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {formatApiDate(item.publishedLabel, locale)}
        </span>
      </div>

      <div className="mc-community-card__source">
        <span>{sourceName}</span>
        {item.mosqueVerified && <VerifiedBadge />}
        {(announcementDetailsPath || item.mosqueId || item.actionPath) && (
          <span className="mc-community-card__actions">
            {item.actionPath && <Link to={item.actionPath}>{t(item.actionLabel || "community.viewRequests")}</Link>}
            {announcementDetailsPath && <Link to={announcementDetailsPath}>{t("community.readDetails")}</Link>}
            {item.mosqueId && <Link to={`/mosque/${item.mosqueId}`}>{t("community.viewMosque")}</Link>}
          </span>
        )}
      </div>
    </article>
  );
}
