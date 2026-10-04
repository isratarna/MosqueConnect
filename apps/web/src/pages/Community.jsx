import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterX, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import CommunityCard, { CommunityCategoryIcon } from "../components/CommunityCard";
import EventList from "../components/events/EventList";
import LostFoundSection from "../components/community/LostFoundSection";
import EventRegistrationFeedback from "../components/events/EventRegistrationFeedback";
import useEventRegistration from "../hooks/useEventRegistration";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";
import { translate } from "../i18n/translate";
import { eventCategoryLabel } from "../utils/labels";
import { BLOOD_SOURCE, isCommunityCategory } from "../data/community";
import { fetchFollowedMosques } from "../utils/mosqueDiscovery";
import { apiRequest } from "../utils/api";
import { fetchEventCollection } from "../utils/eventApi";
import { filterEvents, getEventMosqueName } from "../utils/eventFilters";
import { ListRowsSkeleton, SkeletonRegion } from "../components/skeletons";

const CATEGORY_FILTERS = [
  { key: "announcement", labelKey: "community.filters.announcement" },
  { key: "event", labelKey: "community.filters.event" },
  { key: "blood", labelKey: "community.filters.blood" },
  { key: "volunteer", labelKey: "community.filters.volunteer" },
  { key: "lost_found", labelKey: "community.filters.lost_found" },
];
const INITIAL_VISIBLE_ITEMS = 5;
const sameText = (value, needle) => String(value || "").toLowerCase().includes(needle.toLowerCase());

// The API stores urgency as low/medium/high (plus critical for blood requests);
// the feed card and the "urgent only" filter speak urgent/important/normal.
function feedUrgency(urgency) {
  if (urgency === "critical" || urgency === "high") return "urgent";
  if (urgency === "medium") return "important";
  return "normal";
}

export default function Community() {
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const activeCategory = isCommunityCategory(requestedCategory) ? requestedCategory : "all";
  const { user } = useAuth();
  // Every filter lives in the URL, so a refresh or a shared link reproduces the same view.
  // [Urmee · F5 Part 3] Every filter lives in the URL (useSearchParams) so a refresh or a shared link
  // reproduces the same view. Empty values are removed to keep URLs short.
  const search = searchParams.get("search") || "";
  const mosque = searchParams.get("mosque") || "";
  const area = searchParams.get("area") || "";
  const dateGroup = searchParams.get("date") || "";
  const urgentOnly = searchParams.get("urgent") === "1";
  const followingOnly = Boolean(user) && searchParams.get("following") === "1";
  const eventCategory = searchParams.get("event_category") || "";
  const upcomingEventsOnly = searchParams.get("all_events") !== "1";
  const [areaOptions, setAreaOptions] = useState([]);
  const [followedIds, setFollowedIds] = useState(null);
  const [visibleItems, setVisibleItems] = useState(INITIAL_VISIBLE_ITEMS);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventsMeta, setEventsMeta] = useState(null);
  const [eventRequestKey, setEventRequestKey] = useState(0);
  const registration = useEventRegistration();
  const [communityUpdates, setCommunityUpdates] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setFeedLoading(true); setFeedError("");
    Promise.all([
      apiRequest("/api/announcements", { signal: controller.signal }),
      apiRequest("/api/blood-requests", { signal: controller.signal }),
      apiRequest("/api/volunteer-opportunities", { signal: controller.signal }),
      apiRequest("/api/campaigns?per_page=20", { signal: controller.signal }),
    ]).then(([announcements, blood, volunteers, campaigns]) => {
      const updates = [
        ...announcements.data.map((item) => ({ ...item, category: "announcement", summary: item.body, area: item.mosque?.address, mosqueId: item.mosque_id, mosqueName: item.mosque?.name, mosqueVerified: item.mosque?.verified, urgency: feedUrgency(item.urgency), publishedAt: item.published_at })),
        // [Urmee · F6 Part 1] Blood cards now open that specific request instead of the general list.
        ...blood.data.map((item) => ({ ...item, id: "blood-" + item.id, category: "blood", summary: item.notes, area: item.hospital_or_location, mosqueName: BLOOD_SOURCE, urgency: feedUrgency(item.urgency), publishedAt: item.created_at, actionPath: `/blood-donation/${item.id}`, actionLabel: "community.viewRequest" })),
        ...volunteers.data.map((item) => ({ ...item, id: "volunteer-" + item.id, category: "volunteer", summary: item.description, area: item.location, mosqueId: item.mosque_id, mosqueName: item.mosque?.name, publishedAt: item.created_at, actionPath: `/volunteers?opportunity=${item.id}`, actionLabel: "community.viewOpportunity" })),
        ...campaigns.data.map((item) => ({ ...item, id: "campaign-" + item.id, category: "campaign", summary: item.summary, area: item.mosque?.address, mosqueId: item.mosque_id, mosqueName: item.mosque?.name, mosqueVerified: item.mosque?.verified, publishedAt: item.created_at, actionPath: `/campaigns/${item.id}`, actionLabel: "community.viewCampaign" })),
      ].map((item) => {
        const days = (Date.now() - new Date(item.publishedAt).getTime()) / 86400000;
        return { ...item, publishedLabel: item.publishedAt?.slice(0, 10) || "", dateGroup: days < 1 ? "today" : days < 7 ? "this-week" : "older" };
      }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      setCommunityUpdates(updates);
    }).catch((err) => { if (err.name !== "AbortError") setFeedError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setFeedLoading(false); });
    return () => controller.abort();
  }, [eventRequestKey]);

  const retryEvents = useCallback(() => {
    setEventRequestKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setEventsLoading(true);
    setEventsError("");

    fetchEventCollection({ signal: controller.signal })
      .then(({ events: publishedEvents, meta }) => {
        setEvents(publishedEvents);
        setEventsMeta(meta);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setEventsError(error.message || translate("community.events.loadError"));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });

    return () => controller.abort();
  }, [eventRequestKey]);

  const mosqueOptions = useMemo(
    () => [...new Set([
      ...communityUpdates.map((item) => item.mosqueName),
      ...events.map((event) => getEventMosqueName(event, t("event.mosqueTbd"))),
    ].filter(Boolean))]
      .map((value) => ({ value, label: value === BLOOD_SOURCE ? t("community.bloodSource") : value }))
      .sort((first, second) => first.label.localeCompare(second.label, locale)),
    [events, communityUpdates, t, locale],
  );
  const eventCategories = useMemo(
    () => [...new Set(events.map((event) => event.category).filter(Boolean))].sort(),
    [events],
  );

  const hasFilters = Boolean(search
    || mosque
    || area
    || dateGroup
    || urgentOnly
    || eventCategory
    || followingOnly
    || !upcomingEventsOnly
    || activeCategory !== "all");

  // An empty value (or false) removes the key, keeping shared URLs short.
  // [Urmee · F5 Part 3] Single writer for URL filters; replace:true so typing doesn't fill the browser
  // history.
  const setParam = useCallback((key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value === true ? "1" : value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const setSearch = (value) => setParam("search", value);
  const setMosque = (value) => setParam("mosque", value);
  const setArea = (value) => setParam("area", value);
  const setDateGroup = (value) => setParam("date", value);
  const setUrgentOnly = (value) => setParam("urgent", value);
  const setFollowingOnly = (value) => setParam("following", value);
  const setEventCategory = (value) => setParam("event_category", value);
  const setUpcomingEventsOnly = (value) => setParam("all_events", !value);
  const setCategory = (category) => setParam("category", category === "all" ? "" : category);

  const clearFilters = () => setSearchParams({}, { replace: true });

  useEffect(() => {
    // [Urmee · F5 Part 3] Area filter options come from the API (real districts/areas) instead of
    // free-text venue names.
    apiRequest("/api/mosques/filters")
      .then(({ data }) => setAreaOptions([...new Set((data || []).flatMap((group) => group.areas || []))].sort()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!followingOnly) return;
    fetchFollowedMosques()
      .then((followed) => setFollowedIds(new Set(followed.map((item) => String(item.id)))))
      .catch(() => setFollowedIds(new Set()));
  }, [followingOnly]);

  useEffect(() => {
    setVisibleItems(INITIAL_VISIBLE_ITEMS);
  }, [search, mosque, area, dateGroup, urgentOnly, followingOnly, activeCategory]);

  const filteredUpdates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return communityUpdates.filter((item) => {
      if (item.category === "event") return false;

      const title = item.category === "blood" ? t("community.bloodRequested", { group: item.blood_group }) : item.title;
      const mosqueLabel = item.mosqueName === BLOOD_SOURCE ? t("community.bloodSource") : item.mosqueName;
      const matchesSearch = !normalizedSearch || [title, item.summary, mosqueLabel, item.area]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesMosque = !mosque || item.mosqueName === mosque;
      const matchesArea = !area || sameText(item.area, area);
      // [Urmee · F5 Part 3] "From mosques I follow": keep only items whose mosque is in the followed set.
      const matchesFollowing = !followingOnly || followedIds?.has(String(item.mosqueId));
      const matchesDate = !dateGroup || item.dateGroup === dateGroup;
      const matchesUrgency = !urgentOnly || item.urgency === "urgent" || item.urgency === "important";

      return matchesSearch && matchesCategory && matchesMosque && matchesArea && matchesFollowing && matchesDate && matchesUrgency;
    });
  }, [activeCategory, area, dateGroup, followedIds, followingOnly, mosque, search, urgentOnly, communityUpdates, t]);

  const filteredEvents = useMemo(() => filterEvents(followingOnly ? events.filter((event) => followedIds?.has(String(event.mosque_id ?? event.mosque?.id))) : events, {
    search,
    mosque,
    location: area,
    category: eventCategory,
    dateGroup,
    upcomingOnly: upcomingEventsOnly,
    mosqueFallback: t("event.mosqueTbd"),
  }), [area, dateGroup, eventCategory, events, followedIds, followingOnly, mosque, search, upcomingEventsOnly, t]);

  const feedItems = filteredUpdates.slice(0, visibleItems);
  const showLostFound = activeCategory === "lost_found";
  const showEvents = activeCategory === "all" || activeCategory === "event";
  const showCommunityFeed = activeCategory !== "event" && !showLostFound;

  return (
    <section className="mc-community-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-community-page__intro mc-motion-section">
          <p className="mc-kicker">{t("community.kicker")}</p>
          <h1>{t("community.title")}</h1>
          <p>{t("community.copy")}</p>
        </header>

        {showLostFound && (
          <div className="mc-community-filter__categories mb-3" role="group" aria-label={t("community.sections")}>
            <button type="button" className="btn btn-sm btn-outline-mc" onClick={() => setCategory("all")}>{t("community.backToAll")}</button>
          </div>
        )}
        <section className={`mc-community-filter mc-card mc-motion-section${showLostFound ? " d-none" : ""}`} aria-label={t("community.filterSection")}>
          <div className="mc-community-filter__search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              className="form-control"
              placeholder={t("community.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t("community.searchAria")}
            />
            <div className="mc-community-filter__categories" role="group" aria-label={t("community.categoryGroup")}>
              {CATEGORY_FILTERS.map(({ key, labelKey }) => {
                const isActive = activeCategory === key;
                const label = t(labelKey);

                return (
                  <button
                    type="button"
                    key={key}
                    className={`mc-community-filter__category${isActive ? " is-active" : ""}`}
                    aria-label={label}
                    aria-pressed={isActive}
                    title={label}
                    onClick={() => setCategory(isActive ? "all" : key)}
                  >
                    <CommunityCategoryIcon category={key} size={17} />
                    <span className="visually-hidden">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="row g-2 mt-1">
            <div className="col-sm-6 col-lg">
              <select className="form-select" value={mosque} onChange={(event) => setMosque(event.target.value)} aria-label={t("community.mosqueAria")}>
                <option value="">{t("community.allMosques")}</option>
                {mosqueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg">
              <select className="form-select" value={area} onChange={(event) => setArea(event.target.value)} aria-label={t("community.areaAria")}>
                <option value="">{t("community.allAreas")}</option>
                {areaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg">
              <select className="form-select" value={dateGroup} onChange={(event) => setDateGroup(event.target.value)} aria-label={t("community.dateAria")}>
                <option value="">{t("community.anyDate")}</option>
                <option value="today">{t("community.today")}</option>
                <option value="this-week">{t("community.thisWeek")}</option>
                <option value="upcoming">{t("community.upcoming")}</option>
              </select>
            </div>
            <div className="col-sm-6 col-lg-auto d-flex align-items-center">
              <div className="form-check form-switch mc-community-filter__urgent">
                <input id="urgent-community-only" className="form-check-input" type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />
                <label className="form-check-label" htmlFor="urgent-community-only">{t("community.urgentOnly")}</label>
              </div>
            </div>
            {user && (
              <div className="col-sm-6 col-lg-auto d-flex align-items-center">
                <div className="form-check form-switch mc-community-filter__urgent">
                  <input id="following-only" className="form-check-input" type="checkbox" checked={followingOnly} onChange={(event) => setFollowingOnly(event.target.checked)} />
                  <label className="form-check-label" htmlFor="following-only">{t("communityFollow.only")}</label>
                </div>
              </div>
            )}
            {hasFilters && (
              <div className="col-sm-6 col-lg-auto">
                <button type="button" className="btn btn-outline-mc w-100" onClick={clearFilters}>
                  <FilterX size={15} aria-hidden="true" /> {t("community.clear")}
                </button>
              </div>
            )}
          </div>
        </section>

        {showLostFound && <LostFoundSection />}

        {showEvents && (
          <section className="mc-community-section mc-motion-section" aria-labelledby="upcoming-events-heading">
            <div className="mc-community-section__heading">
              <div>
                <p className="mc-kicker">{t("community.events.kicker")}</p>
                <h2 id="upcoming-events-heading">{t("community.events.title")}</h2>
              </div>
              {!eventsLoading && !eventsError && (
                <span className="mc-community-section__count" aria-live="polite">
                  {eventsMeta?.total > events.length
                    ? t("community.events.matchingOf", { count: filteredEvents.length, total: eventsMeta.total })
                    : t("community.events.matching", { count: filteredEvents.length })}
                </span>
              )}
            </div>

            <div className="mc-event-discovery-controls" aria-label={t("community.events.filterLabel")}>
              <select className="form-select" value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} aria-label={t("community.events.categoryAria")}>
                <option value="">{t("community.events.allCategories")}</option>
                {eventCategories.map((category) => <option value={category} key={category}>{eventCategoryLabel(t, category)}</option>)}
              </select>
              <div className="form-check form-switch mb-0">
                <input id="upcoming-events-only" className="form-check-input" type="checkbox" checked={upcomingEventsOnly} onChange={(event) => setUpcomingEventsOnly(event.target.checked)} />
                <label className="form-check-label" htmlFor="upcoming-events-only">{t("community.events.upcomingOnly")}</label>
              </div>
            </div>

            <EventRegistrationFeedback feedback={registration.feedback} onDismiss={registration.clearFeedback} />
            <EventList
              events={filteredEvents}
              loading={eventsLoading}
              error={eventsError}
              onRetry={retryEvents}
              onRegister={registration.register}
              onUnregister={registration.unregister}
              registeredEventIds={registration.registeredEventIds}
              registrationLoadingIds={registration.registrationLoadingIds}
              registrationEnabled={registration.registrationEnabled}
              emptyMessage={t("community.events.empty")}
              layout="rail"
            />
          </section>
        )}

        {showCommunityFeed && <section className="mc-community-section mc-motion-section" aria-labelledby="community-feed-heading">
          <div className="mc-community-section__heading">
            <div>
              <p className="mc-kicker">{t("community.feed.kicker")}</p>
              <h2 id="community-feed-heading">{t("community.feed.title")}</h2>
            </div>
            <span className="mc-community-section__count" aria-live="polite">{t("community.feed.updates", { count: filteredUpdates.length })}</span>
          </div>
          {feedLoading ? <SkeletonRegion label={t("community.feed.loading")}><ListRowsSkeleton rows={4} /></SkeletonRegion> : feedError ? <div className="alert alert-danger" role="alert">{feedError} <button className="btn btn-sm btn-outline-danger" onClick={retryEvents}>{t("common.retry")}</button></div> : feedItems.length ? (
            <>
              <div className="mc-community-feed-list mc-motion-stagger">
                {feedItems.map((item) => (
                  <CommunityCard item={item} key={item.id} />
                ))}
              </div>
              {visibleItems < filteredUpdates.length && (
                <div className="text-center mt-4">
                  <button type="button" className="btn btn-outline-mc" onClick={() => setVisibleItems((current) => current + INITIAL_VISIBLE_ITEMS)}>
                    {t("community.feed.loadMore")}
                  </button>
                </div>
              )}
            </>
          ) : (
            followingOnly && followedIds?.size === 0
              ? <div className="mc-community-empty mc-card text-center"><h3>{t("communityFollow.title")}</h3><p>{t("communityFollow.body")}</p><Link to="/browse" className="btn btn-mc">{t("communityFollow.browse")}</Link></div>
              : <EmptyState onClear={clearFilters} />
          )}
        </section>}
      </div>
    </section>
  );
}

function EmptyState({ onClear }) {
  const { t } = useLocale();

  return (
    <div className="mc-community-empty mc-card text-center">
      <Search size={30} aria-hidden="true" />
      <h3>{t("community.feed.emptyTitle")}</h3>
      <p>{t("community.feed.emptyCopy")}</p>
      <button type="button" className="btn btn-outline-mc" onClick={onClear}>{t("community.feed.clearFilters")}</button>
    </div>
  );
}
