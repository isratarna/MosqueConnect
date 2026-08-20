import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterX, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import CommunityCard, { CommunityCategoryIcon } from "../components/CommunityCard";
import EventList from "../components/events/EventList";
import {
  COMMUNITY_UPDATES,
  isCommunityCategory,
} from "../data/community";
import { fetchPublishedEvents } from "../utils/eventApi";

const CATEGORY_FILTERS = [
  { key: "announcement", label: "Announcement" },
  { key: "event", label: "Event" },
  { key: "blood", label: "Blood Request" },
  { key: "volunteer", label: "Volunteer" },
  { key: "lost-found", label: "Lost & Found" },
  { key: "complaint", label: "Complaint" },
  { key: "suggestion", label: "Suggestion" },
  { key: "notice", label: "Other Notices" },
];
const INITIAL_VISIBLE_ITEMS = 5;

export default function Community() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const activeCategory = isCommunityCategory(requestedCategory) ? requestedCategory : "all";
  const [search, setSearch] = useState("");
  const [mosque, setMosque] = useState("");
  const [area, setArea] = useState("");
  const [dateGroup, setDateGroup] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [visibleItems, setVisibleItems] = useState(INITIAL_VISIBLE_ITEMS);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventRequestKey, setEventRequestKey] = useState(0);

  const retryEvents = useCallback(() => {
    setEventRequestKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setEventsLoading(true);
    setEventsError("");

    fetchPublishedEvents({ signal: controller.signal })
      .then(setEvents)
      .catch((error) => {
        if (error.name !== "AbortError") {
          setEventsError(error.message || "Published events could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventsLoading(false);
      });

    return () => controller.abort();
  }, [eventRequestKey]);

  const mosques = useMemo(
    () => [...new Set(COMMUNITY_UPDATES.map((item) => item.mosqueName))].sort(),
    [],
  );
  const areas = useMemo(
    () => [...new Set(COMMUNITY_UPDATES.map((item) => item.area))].sort(),
    [],
  );

  const hasFilters = Boolean(search || mosque || area || dateGroup || urgentOnly || activeCategory !== "all");

  const setCategory = (category) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (category === "all") next.delete("category");
      else next.set("category", category);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setMosque("");
    setArea("");
    setDateGroup("");
    setUrgentOnly(false);
    setCategory("all");
  };

  useEffect(() => {
    setVisibleItems(INITIAL_VISIBLE_ITEMS);
  }, [search, mosque, area, dateGroup, urgentOnly, activeCategory]);

  const filteredUpdates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return COMMUNITY_UPDATES.filter((item) => {
      const matchesSearch = !normalizedSearch || [item.title, item.summary, item.mosqueName, item.area]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesMosque = !mosque || item.mosqueName === mosque;
      const matchesArea = !area || item.area === area;
      const matchesDate = !dateGroup || item.dateGroup === dateGroup;
      const matchesUrgency = !urgentOnly || item.urgency === "urgent" || item.urgency === "important";

      return matchesSearch && matchesCategory && matchesMosque && matchesArea && matchesDate && matchesUrgency;
    });
  }, [activeCategory, area, dateGroup, mosque, search, urgentOnly]);

  const feedItems = filteredUpdates.slice(0, visibleItems);

  return (
    <section className="mc-community-page mc-atmospheric-section">
      <div className="container py-5">
        <header className="mc-community-page__intro mc-motion-section">
          <p className="mc-kicker">Community hub</p>
          <h1>Stay connected to your mosque community</h1>
          <p>Find official mosque announcements, prayer updates, events, support requests, and community notices in one place.</p>
        </header>

        <section className="mc-community-filter mc-card mc-motion-section" aria-label="Search and filter community updates">
          <div className="mc-community-filter__search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              className="form-control"
              placeholder="Search announcements, events, or community notices"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search community updates"
            />
            <div className="mc-community-filter__categories" role="group" aria-label="Filter by category">
              {CATEGORY_FILTERS.map(({ key, label }) => {
                const isActive = activeCategory === key;

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
              <select className="form-select" value={mosque} onChange={(event) => setMosque(event.target.value)} aria-label="Filter by mosque">
                <option value="">All mosques</option>
                {mosques.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg">
              <select className="form-select" value={area} onChange={(event) => setArea(event.target.value)} aria-label="Filter by area">
                <option value="">All areas</option>
                {areas.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="col-sm-6 col-lg">
              <select className="form-select" value={dateGroup} onChange={(event) => setDateGroup(event.target.value)} aria-label="Filter by date">
                <option value="">Any date</option>
                <option value="today">Today</option>
                <option value="this-week">This week</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
            <div className="col-sm-6 col-lg-auto d-flex align-items-center">
              <div className="form-check form-switch mc-community-filter__urgent">
                <input id="urgent-community-only" className="form-check-input" type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />
                <label className="form-check-label" htmlFor="urgent-community-only">Urgent only</label>
              </div>
            </div>
            {hasFilters && (
              <div className="col-sm-6 col-lg-auto">
                <button type="button" className="btn btn-outline-mc w-100" onClick={clearFilters}>
                  <FilterX size={15} aria-hidden="true" /> Clear
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mc-community-section mc-motion-section" aria-labelledby="upcoming-events-heading">
          <div className="mc-community-section__heading">
            <div>
              <p className="mc-kicker">Published by mosques</p>
              <h2 id="upcoming-events-heading">Community events</h2>
            </div>
            {!eventsLoading && !eventsError && (
              <span className="mc-community-section__count" aria-live="polite">{events.length} published</span>
            )}
          </div>
          <EventList
            events={events.slice(0, 3)}
            loading={eventsLoading}
            error={eventsError}
            onRetry={retryEvents}
          />
        </section>

        <section className="mc-community-section mc-motion-section" aria-labelledby="community-feed-heading">
          <div className="mc-community-section__heading">
            <div>
              <p className="mc-kicker">Community feed</p>
              <h2 id="community-feed-heading">Latest community updates</h2>
            </div>
            <span className="mc-community-section__count" aria-live="polite">{filteredUpdates.length} updates</span>
          </div>
          {feedItems.length ? (
            <>
              <div className="mc-community-feed-list mc-motion-stagger">
                {feedItems.map((item) => (
                  <CommunityCard item={item} key={item.id} />
                ))}
              </div>
              {visibleItems < filteredUpdates.length && (
                <div className="text-center mt-4">
                  <button type="button" className="btn btn-outline-mc" onClick={() => setVisibleItems((current) => current + INITIAL_VISIBLE_ITEMS)}>
                    Load more updates
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState onClear={clearFilters} />
          )}
        </section>

        <p className="mc-community-page__note mb-0">
          Published events are loaded from the MosqueConnect API. Other community notices remain illustrative until their backend modules are introduced; registration and notifications will follow in later event work.
        </p>
      </div>
    </section>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="mc-community-empty mc-card text-center">
      <Search size={30} aria-hidden="true" />
      <h3>No matching updates</h3>
      <p>Try a different search or clear the current filters.</p>
      <button type="button" className="btn btn-outline-mc" onClick={onClear}>Clear filters</button>
    </div>
  );
}
