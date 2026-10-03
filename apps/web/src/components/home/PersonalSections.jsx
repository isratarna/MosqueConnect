import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import { BookOpen, Clock3, Heart, MapPin } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import { apiRequest } from "../../utils/api";
import { formatApiDate } from "../../utils/intl";
import { fetchFollowedMosques } from "../../utils/mosqueDiscovery";
import { formatClockTime, nextJamaat } from "../../utils/prayerTime";

const MY_MOSQUES_LIMIT = 4;
const FEED_LIMIT = 5;
const BLOOD_LIMIT = 2;

/** Run `load(signal)` once and return { status, data }; failures resolve to an empty "error" state. */
// [Urmee · F5 Part 1] Tiny data hook: runs a loader once, aborts on unmount, ignores AbortError.
// Failures become an "error" state so a section just hides.
function useLoad(load) {
  const [state, setState] = useState({ status: "loading", data: null });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ status: "error", data: null });
      });
    return () => controller.abort();
    // `load` is a module-level function, so it never changes.
  }, [load]);
  return state;
}

// Followed mosques plus the next jamat for each (one schedule request per mosque shown).
// [Urmee · F5 Part 1] Followed mosques + the next jamat of each: one prayer-schedule request per
// mosque shown (max 4).
const loadMyMosques = async (signal) => {
  const mosques = (await fetchFollowedMosques()).slice(0, MY_MOSQUES_LIMIT);
  return Promise.all(mosques.map(async (mosque) => {
    try {
      const { data } = await apiRequest(`/api/mosques/${mosque.id}/prayer-schedule`, { signal });
      return { mosque, next: nextJamaat(data?.prayer_schedule) };
    } catch {
      return { mosque, next: null };
    }
  }));
};

// Latest announcements from followed mosques. GET /api/me/feed doesn't exist yet,
// so this filters the public announcement feed (newest first) by the followed ids.
// [Urmee · F5 Part 1] GET /api/me/feed doesn't exist yet (#243), so we filter the public announcement
// feed by the followed mosque ids. Swap this loader when the endpoint lands.
const loadMyFeed = async (signal) => {
  const [followed, feed] = await Promise.all([fetchFollowedMosques(), apiRequest("/api/announcements", { signal })]);
  const ids = new Set(followed.map((mosque) => String(mosque.id)));
  return (feed.data || []).filter((item) => ids.has(String(item.mosque_id))).slice(0, FEED_LIMIT);
};

// [Urmee · F5 Part 1] Only high/critical blood requests are "urgent"; critical sorts first.
const URGENT = { critical: 0, high: 1 };
const loadUrgentBlood = async (signal) => {
  const { data } = await apiRequest("/api/blood-requests", { signal });
  return (data || [])
    .filter((request) => request.open !== false && request.urgency in URGENT)
    .sort((a, b) => URGENT[a.urgency] - URGENT[b.urgency])
    .slice(0, BLOOD_LIMIT);
};

function Section({ title, action, className = "", children }) {
  return (
    <section className={`py-4 mc-motion-section ${className}`}>
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h3 mb-0">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

const Skeleton = ({ count }) => (
  <div className="row g-3" aria-busy="true">
    {Array.from({ length: count }, (_, index) => (
      <div className="col-md-6" key={index}><div className="card mc-card p-3"><span className="mc-skeleton-line mc-skeleton-line--lg" /><span className="mc-skeleton-line" /></div></div>
    ))}
  </div>
);

export function MyMosques() {
  const { t, locale } = useLocale();
  const { status, data } = useLoad(loadMyMosques);
  if (status === "error" || (status === "success" && data.length === 0)) {
    // No follows (or the list failed): invite the user to follow instead of leaving a gap.
    return status === "error" ? null : (
      <Section title={t("home.personal.myMosques")}>
        <p className="text-muted mb-0"><Trans i18nKey="home.personal.noFollows" components={{ browse: <Link to="/browse" /> }} /></p>
      </Section>
    );
  }
  return (
    <Section title={t("home.personal.myMosques")} action={<Link to="/browse" className="btn btn-outline-mc btn-sm">{t("home.personal.browse")}</Link>}>
      {status === "loading" ? <Skeleton count={2} /> : (
        <div className="row g-3">
          {data.map(({ mosque, next }) => (
            <div className="col-md-6" key={mosque.id}>
              <div className="card mc-card p-3 d-flex flex-row align-items-center gap-3">
                <div className="flex-grow-1">
                  <h3 className="h5 mb-1">{mosque.name}</h3>
                  <div className="text-muted small mb-2"><MapPin size={14} className="me-1" aria-hidden="true" />{mosque.address}</div>
                  <div className="small">
                    <Clock3 size={14} className="me-1 text-muted" aria-hidden="true" />
                    <span className="text-muted me-1">{t("home.personal.nextJamat")}</span>
                    {next ? <strong>{t(`prayer.${next.label.toLowerCase()}`, { defaultValue: next.label })} {formatClockTime(next.time, locale)}{next.tomorrow ? ` (${t("prayer.tomorrow")})` : ""}</strong> : <span className="text-muted">{t("home.personal.notPublished")}</span>}
                  </div>
                </div>
                <Link to={`/mosque/${mosque.id}`} className="btn btn-outline-mc btn-sm">{t("mosque.view")}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function MyFeed() {
  const { t, locale } = useLocale();
  const { status, data } = useLoad(loadMyFeed);
  if (status !== "success" || data.length === 0) return null; // Quiet when there is nothing to say.
  return (
    <Section title={t("home.personal.fromYourMosques")} action={<Link to="/community?category=announcement" className="btn btn-outline-mc btn-sm">{t("home.personal.seeAll")}</Link>}>
      <div className="d-flex flex-column gap-2">
        {data.map((item) => (
          <Link key={item.id} to={`/community/announcements/${item.id}`} className="card mc-card p-3 text-decoration-none">
            <div className="d-flex align-items-center gap-2 mb-1 text-muted small">
              <BookOpen size={14} aria-hidden="true" />
              <span>{item.mosque?.name}</span>
              <span aria-hidden="true">•</span>
              <span>{formatApiDate(item.date, locale)}</span>
            </div>
            <h3 className="h6 mb-0">{item.title}</h3>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function UrgentBloodRequests() {
  const { t, locale } = useLocale();
  const { status, data } = useLoad(loadUrgentBlood);
  if (status !== "success" || data.length === 0) return null;
  return (
    <Section
      title={<span className="text-danger d-inline-flex align-items-center gap-2"><Heart size={22} fill="currentColor" aria-hidden="true" /> {t("home.personal.urgentBlood")}</span>}
      action={<Link to="/blood-donation" className="btn btn-outline-danger btn-sm">{t("mosque.viewAll")}</Link>}
    >
      <div className="row g-3">
        {data.map((request) => (
          <div className="col-md-6" key={request.id}>
            <Link to={`/blood-donation/${request.id}`} className="card mc-card border-danger border-opacity-25 p-3 text-decoration-none">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="text-danger mb-1 h4">{request.blood_group}</h3>
                  <div className="fw-semibold mb-1">{request.hospital_or_location}</div>
                  <div className="text-muted small">{t("home.personal.bloodDetail", { count: request.units, date: formatApiDate(request.required_date, locale) })}</div>
                </div>
                <span className="badge bg-danger">{t(`urgency.${request.urgency}`, { defaultValue: request.urgency })}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}
