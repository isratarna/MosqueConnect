import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  Info,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  Images,
  Mail,
  Map as MapIcon,
  MessageCircle,
  Moon,
  MapPin,
  Megaphone,
  Navigation,
  PencilLine,
  Phone,
  Share2,
  Star,
  Sun,
  TriangleAlert, MessageSquareText, PackageOpen, UsersRound, Pin } from "lucide-react";
import { urgencyClass } from "../data/mosques";
import { getAnnouncementDetailsPath } from "../data/announcements";
import FacilityBadge from "../components/FacilityBadge";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import PrayerTimeline from "../components/PrayerTimeline";
import RamadanCard from "../components/RamadanCard";
import MosqueEventsSection from "../components/events/MosqueEventsSection";
import MosqueCampaignsSection from "../components/campaigns/MosqueCampaignsSection";
import { directionsUrl, fetchMosqueById } from "../utils/mosqueDiscovery";
import { formatApiDate } from "../utils/intl";
import { formatClockTime } from "../utils/prayerTime";
import { useFollow } from "../context/FollowContext";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";
import MosqueClaimForm from "../components/MosqueClaimForm";
import EidJamaatCard from "../components/eid/EidJamaatCard";
import { trackMosqueEvent, trackMosqueView } from "../utils/trackMosque";
import SuggestCorrectionModal from "../components/suggestions/SuggestCorrectionModal";
import MosqueLostFoundCard from "../components/community/MosqueLostFoundCard";
import ComplaintForm from "../components/community/ComplaintForm";
import GoodsPledgeForm from "../components/community/GoodsPledgeForm";
import { communityConfirmedLabel } from "../utils/suggestionFormat";
import { clampText, latestAnnouncements, linkifyParts, safeWebUrl, updatedAgoLabel, whatsappUrl } from "../utils/mosqueProfile";
import { ProfileSkeleton, SkeletonRegion } from "../components/skeletons";
import ReportButton from "../components/ReportButton";
import PhotoGallery from "../components/profile/PhotoGallery";
import ReviewsSection from "../components/profile/ReviewsSection";
import { Stars } from "../components/profile/Stars";

// [Urmee · F3 Part 1] Section anchors for the in-page nav. The ids match the existing links
// (/mosque/5#prayer-schedule), so old URLs keep working.
const SECTIONS = [
  ["overview", "mosque.sections.overview"],
  ["prayer-schedule", "mosque.sections.prayer"],
  ["announcements", "mosque.sections.announcements"],
  ["events", "mosque.sections.events"],
  ["donations", "mosque.sections.donations"],
  ["photos", "mosque.sections.photos"],
  ["reviews", "mosque.sections.reviews"],
  ["about", "mosque.sections.about"],
];

/** Small "Suggest a correction" link shown on each card with editable details. */
function SuggestLink({ onClick, label }) {
  const { t } = useLocale();
  return (
    <button type="button" className="btn btn-link btn-sm p-0 text-mc text-decoration-none mc-suggest-link" onClick={onClick}>
      <PencilLine size={14} className="me-1" aria-hidden="true" />{label || t("mosque.suggestCorrection")}
    </button>
  );
}

/** Plain text with line breaks kept (CSS pre-line) and URLs turned into links; never renders raw HTML. */
// [Urmee · F3 Part 1] Keeps line breaks (CSS pre-line) and links URLs; never uses
// dangerouslySetInnerHTML.
function Linkified({ text }) {
  return (
    <span className="mc-prewrap">
      {linkifyParts(text).map((part, index) => (part.type === "link"
        ? <a key={index} href={part.value} target="_blank" rel="noopener noreferrer nofollow">{part.value}</a>
        : part.value))}
    </span>
  );
}

/** One announcement: long bodies are clamped with "Show more". */
// [Urmee · F3 Part 1] One announcement with a "Show more" for long text and a Pinned badge.
function AnnouncementItem({ announcement }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLocale();
  const { text, clamped } = clampText(announcement.body);
  const publishedOn = announcement.date || (announcement.published_at || "").slice(0, 10);
  const detailsPath = getAnnouncementDetailsPath(announcement.id);
  const pinned = Boolean(announcement.pinned || announcement.is_pinned);
  // [Urmee · F9] Janazah notices get calm, distinct styling (no alarm colours) instead of the urgency colours.
  // [Urmee · VIVA] F9: janazah category hole calm styling (alarm color na), ar niche image ar pin icon ao ei item e dekhai.
  const janazah = announcement.category === "janazah";

  return (
    <div className={janazah ? "mc-announcement--janazah ps-3 py-2 mb-3" : `border-start border-4 border-${urgencyClass(announcement.urgency)} ps-3 mb-3`}>
      {/* [Urmee · F9] Image from the editor, with the title as alt text. */}
      {announcement.image_url && <img src={announcement.image_url} alt={t("announcement.imageAlt", { title: announcement.title })} className="mc-announcement-image mb-2" loading="lazy" />}
      <div className="d-flex justify-content-between gap-2">
        <strong>
          <Link to={detailsPath} className="text-body text-decoration-none">{announcement.title}</Link>
          {/* [Urmee · F9] Pin icon next to the Pinned badge. */}
          {pinned && <span className="badge text-bg-secondary ms-2"><Pin size={11} aria-hidden="true" /> {t("mosque.pinned")}</span>}
        </strong>
        {janazah
          ? <span className="badge text-bg-light border align-self-start">{t("announcement.categories.janazah")}</span>
          : <span className={`badge bg-${urgencyClass(announcement.urgency)} text-uppercase align-self-start`}>{announcement.urgency}</span>}
      </div>
      <p className="mb-1 small text-muted"><Linkified text={expanded ? announcement.body : text} /></p>
      {clamped && (
        <button type="button" className="btn btn-link btn-sm p-0 mb-1" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded}>
          {expanded ? t("mosque.showLess") : t("mosque.showMore")}
        </button>
      )}
      <div className="d-flex align-items-center gap-3">
        {publishedOn && (
          <small className="text-muted"><CalendarDays size={14} className="me-1" aria-hidden="true" />{publishedOn}</small>
        )}
        <Link to={detailsPath} className="small text-mc text-decoration-none">{t("mosque.readDetails")}</Link>
      </div>
    </div>
  );
}

/** Tap-to-call, WhatsApp, email, website and Facebook, only for the details the mosque has listed. */
// [Urmee · F3 Part 1] Tap-to-call, WhatsApp, email, website and Facebook; only details the mosque
// listed are shown.
function ContactLinks({ mosque }) {
  const { t } = useLocale();
  const whatsapp = whatsappUrl(mosque.whatsapp);
  const website = mosque.website_url ? safeWebUrl(mosque.website_url) : null;
  const facebook = mosque.facebook_url ? safeWebUrl(mosque.facebook_url) : null;
  const links = [
    mosque.phone && { href: `tel:${mosque.phone.replace(/\s/g, "")}`, icon: Phone, label: mosque.phone, event: "call" },
    whatsapp && { href: whatsapp, icon: MessageCircle, label: "WhatsApp", external: true },
    mosque.email && { href: `mailto:${mosque.email}`, icon: Mail, label: mosque.email },
    website && { href: website, icon: Globe, label: t("mosque.websiteLabel"), external: true },
    facebook && { href: facebook, icon: ExternalLink, label: "Facebook", external: true },
  ].filter(Boolean);
  if (!links.length) return <p className="small text-muted mb-0">{t("mosque.noContact")}</p>;

  return (
    <ul className="list-inline mb-0 mc-contact-links">
      {links.map(({ href, icon: Icon, label, external, event }) => (
        <li className="list-inline-item" key={label}>
          <a
            href={href}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            onClick={event ? () => trackMosqueEvent(mosque.id, event) : undefined}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function MosqueProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  // [Urmee · i18n restore] The mosque profile (rebuilt in F3) is translated again; times and dates use
  // the active locale.
  const { t, locale } = useLocale();
  const [mosque, setMosque] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [suggestField, setSuggestField] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [goodsOpen, setGoodsOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const applied = useRef(false);
  const { isFollowing: following, toggleFollow } = useFollow(id);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    setMosque(null);

    fetchMosqueById(id)
      .then((result) => {
        if (!active) return;
        setMosque(result);
        setStatus("success");
        trackMosqueView(result.id);
      })
      .catch((requestError) => {
        if (!active) return;
        setMosque(null);
        setStatus("error");
        setError(requestError.message || t("mosque.loadFailedFull"));
      });

    return () => {
      active = false;
    };
  }, [id, retryKey]);

  // After a review is saved or deleted, refresh just the numbers (no skeleton flash).
  // [Urmee · F3 Part 2] After a review is saved or deleted we refresh only the numbers (average rating,
  // count) without the skeleton flash.
  const refreshMosque = useCallback(() => {
    fetchMosqueById(id).then(setMosque).catch(() => {});
  }, [id]);

  // /mosque/5#prayer-schedule etc.: the page renders after loading, so scroll to the anchor once it exists.
  useEffect(() => {
    if (status !== "success" || !window.location.hash) return;
    // [Urmee · F3 Part 1] The page renders after loading, so the browser can't jump to #prayer-schedule on
    // its own; scroll once the section exists.
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [status]);

  if (status === "loading") {
    return (
      <SkeletonRegion label={t("mosque.loading")} delay={0}>
        <ProfileSkeleton />
      </SkeletonRegion>
    );
  }

  if (status === "error" || !mosque) {
    return (
      <div className="container py-5 text-center">
        <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
        <h4 className="mt-3">{t("mosque.notFound")}</h4>
        <p className="text-muted">{error || t("mosque.loadFailed")}</p>
        <div className="d-flex justify-content-center gap-2 flex-wrap">
          <button type="button" className="btn btn-outline-mc" onClick={() => setRetryKey((value) => value + 1)}>
            {t("common.tryAgain")}
          </button>
          <Link to="/browse" className="btn btn-mc">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("mosque.backToBrowse")}
          </Link>
        </div>
      </div>
    );
  }

  const prayer = mosque.prayer || {};
  const announcements = Array.isArray(mosque.announcements) ? mosque.announcements : [];
  const shownAnnouncements = latestAnnouncements(announcements, 5);
  const facilities = Array.isArray(mosque.facilities) ? mosque.facilities : [];
  const photos = Array.isArray(mosque.photos) ? mosque.photos : [];
  const jumuahSessions = Array.isArray(mosque.jumuah_sessions) ? mosque.jumuah_sessions : [];
  const prayerSchedule = Array.isArray(mosque.prayer_schedule) ? mosque.prayer_schedule : [];
  const eidJamaats = Array.isArray(mosque.eid_jamaats) ? mosque.eid_jamaats : [];
  const hasDailyPrayer = Object.values(prayer).some(Boolean) || prayerSchedule.length > 0;
  const directions = directionsUrl(mosque);
  const confirmedLabel = communityConfirmedLabel(mosque.times_confirmed_by_community_at, new Date(), t, locale);
  const freshness = updatedAgoLabel(mosque.schedule_updated_at, new Date(), t, locale);
  const place = [mosque.area, mosque.district].filter(Boolean).join(", ");
  // The claim box only helps where a claim can succeed: no admin yet, and the viewer is a visitor or a normal user.
  // [Urmee · F3 Part 1] The claim box only appears where a claim can succeed: the mosque has no admin
  // yet and the viewer is a visitor or a normal user (admins and super admins would get a 409).
  const canClaim = mosque.has_admin === false && (!user || user.role === "normal_user");
  const details = [
    [t("mosque.detail.capacity"), mosque.capacity ? t("mosque.detail.people", { count: mosque.capacity }) : null],
    [t("mosque.detail.established"), mosque.established_year],
    [t("mosque.detail.khutbahLanguage"), mosque.khutbah_language],
    [t("mosque.detail.womenArea"), mosque.women_facility_notes],
    [t("mosque.detail.accessibility"), mosque.accessibility_notes],
  ].filter(([, value]) => value);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  // [Urmee · F3 Part 1] Uses the phone's share sheet when available, otherwise copies the link.
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: mosque.name, text: `${mosque.name} on MosqueConnect`, url });
      } catch { /* the user closed the share sheet */ }
    } else {
      copy(url, "link");
    }
  };

  return (
    <div className="container py-4 mc-motion-stagger mc-profile-page">
      <nav aria-label={t("common.breadcrumb")} className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item"><Link to="/" className="text-mc text-decoration-none">{t("nav.home")}</Link></li>
          <li className="breadcrumb-item"><Link to="/browse" className="text-mc text-decoration-none">{t("mosque.breadcrumbBrowse")}</Link></li>
          <li className="breadcrumb-item active">{mosque.name}</li>
        </ol>
      </nav>

      {mosque.has_admin === false && (
        <div className="alert alert-warning d-flex align-items-start gap-2 py-2 small" role="note">
          <TriangleAlert size={16} className="mt-1 flex-shrink-0" aria-hidden="true" />
          <span>{t("mosque.noAdmin")}</span>
        </div>
      )}

      <div className="mc-profile-hero mb-3" role="img" aria-label={t("mosque.photoOf", { name: mosque.name })} style={{ backgroundImage: `url('${mosque.photo}')` }}>
        <div className="mc-profile-title">
          <h1 className="h3 fw-bold mb-1">{mosque.name}</h1>
          <div><MapPin size={15} className="me-1" aria-hidden="true" />{mosque.address}</div>
          <div className="d-flex flex-wrap align-items-center gap-3 mt-1 small">
            {mosque.rating !== null && (
              <a href="#reviews" className="text-white d-inline-flex align-items-center gap-1 text-decoration-none">
                <Star size={14} fill="currentColor" aria-hidden="true" />{mosque.rating.toFixed(1)} <span className="opacity-75">({mosque.reviews_count})</span>
              </a>
            )}
            <span className="d-inline-flex align-items-center gap-1"><UsersRound size={14} aria-hidden="true" />{t("mosque.followers", { count: mosque.followers_count ?? 0 })}</span>
            {mosque.verified && <VerifiedBadge />}
          </div>
        </div>
      </div>

      {/* [Urmee · F3 Part 1] Sticky action bar: under the navbar on desktop, fixed to the bottom of the screen on phones so Follow and Directions stay reachable. */}
      {/* Action bar: sticks under the navbar on desktop and to the bottom of the screen on phones. */}
      <div className="mc-profile-actions" role="toolbar" aria-label={t("mosque.actionsLabel")}>
        <button
          type="button"
          className={"btn btn-sm " + (following ? "btn-danger" : "btn-outline-mc")}
          onClick={() => toggleFollow(mosque)}
          aria-pressed={following}
        >
          <Heart size={16} fill={following ? "currentColor" : "none"} aria-hidden="true" />
          {following ? t("mosque.following") : t("mosque.follow")}
        </button>
        {directions && (
          <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-mc btn-sm" onClick={() => trackMosqueEvent(mosque.id, "directions")}>
            <Navigation size={16} aria-hidden="true" /> {t("mosque.getDirectionsButton")}
          </a>
        )}
        {mosque.phone && (
          <a href={`tel:${mosque.phone.replace(/\s/g, "")}`} className="btn btn-outline-secondary btn-sm" onClick={() => trackMosqueEvent(mosque.id, "call")}>
            <Phone size={16} aria-hidden="true" /> {t("mosque.call")}
          </a>
        )}
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={share}>
          {copied === "link" ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />} {copied === "link" ? t("mosque.linkCopied") : t("mosque.share")}
        </button>
      </div>

      <nav className="mc-profile-nav" aria-label={t("mosque.pageSections")}>
        {SECTIONS.map(([anchor, label]) => <a key={anchor} href={`#${anchor}`}>{t(label)}</a>)}
      </nav>

      <section id="overview" className="mc-profile-section mb-4" aria-label={t("mosque.sections.overview")}>
        {mosque.description && <p className="text-muted mb-3"><Linkified text={mosque.description} /></p>}
        <ContactLinks mosque={mosque} />
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <span className="small text-muted"><MapPin size={14} className="me-1" aria-hidden="true" />{mosque.address}</span>
          <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none d-inline-flex align-items-center gap-1" onClick={() => copy(mosque.address, "address")}>
            {copied === "address" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied === "address" ? t("mosque.copied") : t("mosque.copyAddress")}
          </button>
        </div>
      </section>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* [Urmee · VIVA] Ramadan card shudhu tokhoni jokhon mosque.period.is_ramadan true (API mosque response e period pathay). */}
          {/* [Urmee · F4] Ramadan card first while the mosque is in a Ramadan period; nothing Ramadan-specific otherwise. */}
          {mosque.period?.is_ramadan && <RamadanCard mosqueId={mosque.id} />}

          {eidJamaats.length > 0 && (
            <div className="card mc-card mc-eid-card mb-4" id="eid-jamaat">
              <div className="card-body">
                <h5 className="fw-bold mb-3">
                  <Moon size={18} className="text-mc me-2" aria-hidden="true" />
                  {eidJamaats[0].eid_label} {eidJamaats[0].year} jamaat{eidJamaats.length > 1 ? "s" : ""}
                </h5>
                <div className="d-grid gap-3">
                  {eidJamaats.map((jamaat) => <EidJamaatCard key={jamaat.id} jamaat={jamaat} />)}
                </div>
                <Link to="/eid" className="small text-mc text-decoration-none d-inline-block mt-3">{t("mosque.findEid")}</Link>
              </div>
            </div>
          )}

          <div className="card mc-card mb-4" id="prayer-schedule">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3">
                <h5 className="fw-bold mb-0"><Clock3 size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.prayerTimes")}</h5>
                <SuggestLink onClick={() => setSuggestField("prayer_time")} label={t("mosque.suggestTime")} />
              </div>
              {/* [Urmee · VIVA] Prayer timeline er upore period er naam: "Winter timetable · until 28 Feb". */}
              {mosque.period && (
                <p className="small text-muted mb-2" data-testid="period-label">{t("mosque.periodLabel", { name: mosque.period.name, date: formatApiDate(mosque.period.ends_on, locale) })}</p>
              )}
              {hasDailyPrayer ? (
                <PrayerTimeline prayers={prayer} schedule={prayerSchedule} />
              ) : (
                <p className="text-muted mb-0">{t("mosque.prayerNotPublished")}</p>
              )}
              {freshness && <p className="small text-muted mt-2 mb-0">{freshness}</p>}
              {confirmedLabel && (
                <p className="small text-success mt-2 mb-0 mc-community-confirmed">
                  <BadgeCheck size={15} className="me-1" aria-hidden="true" />{confirmedLabel}
                </p>
              )}
            </div>
          </div>

          <div className="card mc-card mb-4">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3">
                <h5 className="fw-bold mb-0"><Sun size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.jummahPrayer")}</h5>
                <SuggestLink onClick={() => setSuggestField("jumuah")} />
              </div>
              {jumuahSessions.length ? (
                <div className="row row-cols-1 row-cols-md-2 g-2">
                  {jumuahSessions.map((session) => (
                    <div className="col" key={session.id || session.sequence || session.label}>
                      <div className="mc-prayer-cell bg-light rounded-3">
                        <small className="text-muted d-block">{session.label}</small>
                        <span className="h5">{formatClockTime(session.jamaat_time, locale)}</span>
                        {session.khutbah_time && (
                          <small className="text-muted d-block">{t("mosque.khutbah", { time: formatClockTime(session.khutbah_time, locale) })}</small>
                        )}
                        {session.notes && (
                          <small className="text-muted d-block">{session.notes}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">{t("mosque.jumuahNotPublished")}</p>
              )}
            </div>
          </div>

          <div className="card mc-card mb-4" id="announcements">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3">
                <h5 className="fw-bold mb-0"><Megaphone size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.announcements")}</h5>
                {announcements.length > 0 && (
                  <Link to={`/community?category=announcement&mosque=${encodeURIComponent(mosque.name)}`} className="small text-mc text-decoration-none">{t("mosque.viewAll")}</Link>
                )}
              </div>
              {shownAnnouncements.length ? (
                shownAnnouncements.map((announcement) => <AnnouncementItem key={announcement.id} announcement={announcement} />)
              ) : (
                <p className="text-muted mb-0">{t("mosque.noAnnouncements")}</p>
              )}
            </div>
          </div>

          <div id="events"><MosqueEventsSection mosqueId={mosque.id} /></div>
          <div id="donations"><MosqueCampaignsSection mosqueId={mosque.id} /></div>

          <div className="card mc-card mb-4" id="photos">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><Images size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.sections.photos")}</h5>
              {photos.length ? <PhotoGallery photos={photos} mosqueName={mosque.name} /> : <p className="text-muted mb-0">{t("mosque.noPhotos")}</p>}
            </div>
          </div>

          <ReviewsSection mosque={mosque} onChanged={refreshMosque} />
        </div>

        <div className="col-lg-4">
          <div className="card mc-card mb-4" id="about">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><Info size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.sections.about")}</h6>
              <dl className="mc-about-list small mb-3">
                <dt>{t("mosque.address")}</dt>
                <dd>{mosque.address}{place && <span className="d-block text-muted">{place}</span>}</dd>
                {details.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd className="mc-prewrap">{value}</dd></div>
                ))}
              </dl>
              <div className="d-flex flex-wrap gap-3">
                <SuggestLink onClick={() => setSuggestField("address")} label={t("mosque.fixAddress")} />
                <SuggestLink onClick={() => setSuggestField("phone")} label={t("mosque.fixPhone")} />
                <SuggestLink onClick={() => setSuggestField("other")} label={t("mosque.somethingElse")} />
              </div>
              <div className="mt-2">
                <ReportButton type="mosque" id={mosque.id} label={t("mosque.reportIncorrect")} className="btn btn-link btn-sm p-0 text-muted text-decoration-none d-inline-flex align-items-center gap-1" />
              </div>
              <hr />
              <button type="button" className="btn btn-sm btn-outline-mc w-100" onClick={() => setFeedbackOpen(true)}>
                <MessageSquareText size={15} aria-hidden="true" /> {t("mosque.sendFeedback")}
              </button>
              <p className="form-text">{t("mosque.feedbackPrivate")}</p>
              <button type="button" className="btn btn-sm btn-outline-mc w-100" onClick={() => setGoodsOpen(true)}>
                <PackageOpen size={15} aria-hidden="true" /> {t("mosque.donateGoods")}
              </button>
              {canClaim && <div className="mt-3"><MosqueClaimForm key={id} mosqueId={id} /></div>}
            </div>
          </div>
          <MosqueLostFoundCard mosque={mosque} />
          <div className="card mc-card mb-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><Building2 size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.facilities")}</h6>
              {facilities.length ? (
                <div>{facilities.map((facility) => <FacilityBadge key={facility} facilityKey={facility} />)}</div>
              ) : (
                <p className="text-muted mb-0 small">{t("mosque.facilitiesNotPublished")}</p>
              )}
              <div className="mt-2"><SuggestLink onClick={() => setSuggestField("facilities")} /></div>
            </div>
          </div>
          <div className="card mc-card">
            <div className="card-body">
              <h6 className="fw-bold mb-3"><MapIcon size={18} className="text-mc me-2" aria-hidden="true" />{t("mosque.location")}</h6>
              <MapView
                center={{ lat: mosque.lat, lng: mosque.lng }}
                zoom={15}
                mosques={[mosque]}
                selectedMosqueId={mosque.id}
                className="mc-map mc-map--sm"
              />
              <div className="mt-2"><SuggestLink onClick={() => setSuggestField("location")} label={t("mosque.pinWrong")} /></div>
            </div>
          </div>
        </div>
      </div>
      {goodsOpen && <GoodsPledgeForm mosque={mosque} onClose={() => setGoodsOpen(false)} />}
      {feedbackOpen && <ComplaintForm mosque={mosque} onClose={() => setFeedbackOpen(false)} />}
      {suggestField && (
        <SuggestCorrectionModal
          key={suggestField}
          mosque={mosque}
          initialField={suggestField}
          onSubmitted={(suggestion) => { applied.current = suggestion?.status === "accepted"; }}
          onClose={() => {
            setSuggestField(null);
            // A trusted contributor's fix is live straight away, so show it.
            if (applied.current) {
              applied.current = false;
              setRetryKey((value) => value + 1);
            }
          }}
        />
      )}
    </div>
  );
}
