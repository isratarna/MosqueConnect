import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import GlobalSearch from "../components/GlobalSearch";
import ContactForm from "../components/home/ContactForm";
import ImpactStats from "../components/home/ImpactStats";
import ManualLocationDialog from "../components/home/ManualLocationDialog";
import { MyFeed, MyMosques, UrgentBloodRequests } from "../components/home/PersonalSections";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  HandHeart,
  Heart,
  Landmark,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Moon,
  Navigation,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useGeolocation, requestGeolocation, hasLocation } from "../hooks/useGeolocation";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_CENTER } from "../config";
import { useMosqueDiscovery } from "../hooks/useMosqueDiscovery";
import { directionsUrl } from "../utils/mosqueDiscovery";
import { isEstimatedPrayer, nextJamaatLabel } from "../utils/prayerTime";
import { useNow } from "../hooks/useNow";
import { fetchEventCollection } from "../utils/eventApi";
import { formatEventDate, formatEventTimeRange, getEventMosqueName, isEventPast } from "../utils/eventFilters";
import EstimatedBadge from "../components/EstimatedBadge";
import EidBanner from "../components/EidBanner";
import CatchableJamaatCard, { JourneyEntryCard } from "../components/journey/CatchableJamaatCard";
import { EventCardSkeleton, SkeletonRegion } from "../components/skeletons";

const MIN_CARD_WIDTH = 240;
const CARD_GAP = 16;
// Auto-advance delay for the nearby mosques carousel (WCAG: slow enough to read).
// [Urmee · F5 Part 1] 5.5 s per slide (was 1.6 s, too fast to read).
const CAROUSEL_INTERVAL_MS = 5500;
const UPCOMING_EVENTS_COUNT = 3;

const DATE_FORMAT_OPTIONS = { day: "numeric", month: "long", year: "numeric" };

/** Tracks the user's `prefers-reduced-motion` setting, updating if it changes. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const origin = useGeolocation();
  const discovery = useMosqueDiscovery(origin);
  const nearby = discovery.mosques;
  const nearest = nearby[0];
  const [selectedMosqueId, setSelectedMosqueId] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    if (!nearby.length) {
      setSelectedMosqueId(null);
      return;
    }

    setSelectedMosqueId((current) => {
      if (current != null && nearby.some((mosque) => String(mosque.id) === String(current))) {
        return current;
      }
      return nearest?.id ?? nearby[0].id;
    });
  }, [nearby, nearest]);

  if (authLoading) {
    return <div className="mc-home-auth-loading" aria-label="Loading homepage" />;
  }

  return (
    <>
      <EidBanner />
      {user ? (
        <div className="mc-auth-experience mc-auth-nearby-experience">
          <MyMosques />
          <MyFeed />
          <UrgentBloodRequests />
          <JourneyCards origin={origin} />
          <AuthenticatedNearbySection
            origin={origin}
            discovery={discovery}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
            onManualLocationClick={() => setIsLocationModalOpen(true)}
          />
          <NearbySection
            origin={origin}
            nearby={nearby}
            nearest={nearest}
            showMap={false}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
            onManualLocationClick={() => setIsLocationModalOpen(true)}
          />
        </div>
      ) : (
        <>
          <Hero origin={origin} nearby={nearby} nearest={nearest} onRequestLocation={() => requestGeolocation({ force: origin.status === "failure" || origin.status === "manual" })} onManualLocationClick={() => setIsLocationModalOpen(true)} />
          <JourneyCards origin={origin} />
          <NearbySection
            origin={origin}
            nearby={nearby}
            nearest={nearest}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
          />
        </>
      )}
      <SupportSection />
      <ImpactStats />
      <AboutSection />
      <UpcomingEventsSection />
      {isLocationModalOpen && <ManualLocationDialog onClose={() => setIsLocationModalOpen(false)} />}
    </>
  );
}

// "Next jamat you can catch" ar journey planner-e jawar card pashapashi.
function JourneyCards({ origin }) {
  return (
    <section className="mc-journey-cards" aria-label="Catch a jamaat">
      <div className="container">
        <div className="row g-3">
          <div className="col-lg-7">
            <CatchableJamaatCard origin={origin} />
          </div>
          <div className="col-lg-5">
            <JourneyEntryCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthenticatedNearbySection({ origin, discovery, selectedMosqueId, onMosqueSelect, onManualLocationClick }) {
  const { mosques, status: apiStatus, error: apiError, retry: retryApi } = discovery;

  useEffect(() => {
    requestGeolocation();
  }, []);

  const isFindingLocation = ["idle", "requesting", "locating"].includes(origin.status);
  const isLoadingMosques = hasLocation(origin) && ["idle", "loading"].includes(apiStatus);

  return (
    <section
      className="mc-auth-home-map"
      aria-labelledby="nearby-map-title"
      data-selected-mosque-id={selectedMosqueId ?? ""}
    >
      <div className="container">
        <div className="mc-auth-home-map__map-wrap">
          <MapView
            className="mc-map mc-auth-home-map__map"
            center={hasLocation(origin) ? { lat: origin.lat, lng: origin.lng } : DEFAULT_CENTER}
            zoom={14}
            mosques={mosques}
            userPos={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : null}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={onMosqueSelect}
          />

          <div className="mc-auth-home-map__label">
            <MapPin size={14} aria-hidden="true" />
            <h1 id="nearby-map-title">Nearby mosques</h1>
          </div>
          <Link to="/browse" className="mc-auth-home-map__browse btn btn-sm">
            Browse mosques <ChevronRight size={14} aria-hidden="true" />
          </Link>

          <div className="mc-auth-home-map__feedback-stack">
            {(isFindingLocation || isLoadingMosques) && (
              <MapFeedback
                icon={<LoaderCircle className="spin" size={20} aria-hidden="true" />}
                title={isFindingLocation ? "Finding your location" : "Finding nearby mosques"}
                message={isFindingLocation ? "Your browser may ask for location permission." : "Checking mosques closest to you."}
              />
            )}

            {origin.status === "failure" && (
              <MapFeedback
                icon={<TriangleAlert size={21} aria-hidden="true" />}
                title={origin.errorCode === "denied" ? "Location permission denied" : "Location unavailable"}
                message={origin.message || "We could not determine your current location."}
              >
                <button type="button" className="btn btn-mc btn-sm" onClick={() => requestGeolocation({ force: true })}>
                  <RefreshCw size={14} aria-hidden="true" /> Try again
                </button>
                <Link to="/browse" className="btn btn-outline-mc btn-sm">Browse manually</Link>
              </MapFeedback>
            )}

            {apiStatus === "error" && hasLocation(origin) && (
              <MapFeedback
                icon={<TriangleAlert size={21} aria-hidden="true" />}
                title="Could not load nearby mosques"
                message={apiError}
              >
                <button type="button" className="btn btn-mc btn-sm" onClick={retryApi}>
                  <RefreshCw size={14} aria-hidden="true" /> Retry
                </button>
              </MapFeedback>
            )}

            {apiStatus === "success" && mosques.length === 0 && (
              <MapFeedback
                icon={<Landmark size={21} aria-hidden="true" />}
                title="No nearby mosques found"
                message="There are no mosque records near this location yet."
              >
                <Link to="/browse" className="btn btn-outline-mc btn-sm">Browse all mosques</Link>
              </MapFeedback>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MapFeedback({ icon, title, message, children }) {
  return (
    <div className="mc-auth-home-map__feedback" role="status">
      <div className="mc-auth-home-map__feedback-icon">{icon}</div>
      <div className="mc-auth-home-map__feedback-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {children && <div className="mc-auth-home-map__feedback-actions">{children}</div>}
    </div>
  );
}

/** Today's Gregorian date plus the approximate (Umm al-Qura) Hijri date. */
// [Urmee · F5 Part 1] Hijri date uses Intl's islamic-umalqura calendar. Moon sighting in Bangladesh
// can differ by a day, hence the "(approx.)" label.
function HeroDates() {
  const { gregorian, hijri } = useMemo(() => {
    const now = new Date();
    const format = (locale) => {
      try {
        return new Intl.DateTimeFormat(locale, DATE_FORMAT_OPTIONS).format(now);
      } catch {
        return null;
      }
    };
    return {
      gregorian: format("en-GB"),
      hijri: format("en-u-ca-islamic-umalqura"),
    };
  }, []);

  return (
    <div className="mc-hero__dates">
      {gregorian && (
        <span className="mc-date-chip">
          <CalendarDays size={14} aria-hidden="true" />
          <span>{gregorian}</span>
        </span>
      )}
      {hijri && (
        <span className="mc-date-chip mc-date-chip--hijri">
          <Moon size={14} aria-hidden="true" />
          <span>{hijri}</span>
          <span className="mc-date-chip__approx">(approx.)</span>
        </span>
      )}
    </div>
  );
}

function Hero({ origin, nearby, nearest, onRequestLocation, onManualLocationClick }) {
  return (
    <header className="mc-hero mc-home-hero" data-mc-parallax="0.26">
      <div className="container mc-hero__inner">
        <div className="mc-hero__content">
          <HeroDates />
          <h1>Find. Connect. Pray.</h1>
          <p className="mc-hero__copy">
            Discover mosques near you and stay connected to your faith and community.
          </p>
          <div className="mc-hero__search">
            <GlobalSearch id="hero-search" variant="hero" placeholder="Search mosques, events, campaigns…" />
            <a href="#map" className="mc-hero__nearby" title="Find nearby" aria-label="Find nearby">
              <LocateFixed size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="mc-location-card">
          <div className="mc-location-card__icon"><MapPin size={22} aria-hidden="true" /></div>
          <div>
            <h2>Enable your location</h2>
            <p>Find mosques, prayer times, and nearby Islamic facilities around you.</p>
          </div>
          <LocationControls origin={origin} nearby={nearby} nearest={nearest} onRequest={onRequestLocation} onManualLocationClick={onManualLocationClick} />
          <button type="button" onClick={onManualLocationClick} className="btn btn-light mc-location-card__secondary w-100">
            Enter location manually
          </button>
        </div>
      </div>
    </header>
  );
}

function LocationControls({ origin, nearby, nearest, onRequest, onManualLocationClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    onRequest();
  };

  return (
    <div>
      <div className="mb-2" aria-live="polite">
        {origin.status === "idle" && <small className="text-muted">Location not set</small>}
        {origin.status === "requesting" && <small className="text-muted">Requesting permission…</small>}
        {origin.status === "locating" && <small className="text-muted">Locating…</small>}
        {origin.status === "success" && (
          <div>
            <div className="fw-semibold">{nearby.length} mosques nearby</div>
            <div className="small text-muted">Closest: {nearest ? nearest.name : "—"}</div>
          </div>
        )}
        {origin.status === "manual" && (
          <div>
            <div className="fw-semibold">Showing mosques near {origin.areaName || "you"} · <button type="button" className="btn btn-link p-0 text-decoration-none fw-semibold" onClick={onManualLocationClick}>Change</button></div>
          </div>
        )}
        {origin.status === "failure" && <small className="text-danger">Location unavailable — try manual search</small>}
      </div>

      <button className="btn btn-mc w-100 mb-2" onClick={handleClick} aria-pressed={origin.status === "success"}>
        <LocateFixed size={16} aria-hidden="true" /> {origin.status === "success" ? "Location set" : "Use my location"}
      </button>
    </div>
  );
}

function NearbySection({ origin, nearby, nearest, showMap = true, selectedMosqueId, onMosqueSelect }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const now = useNow();
  const pointerStartX = useRef(0);
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Auto-advance stops on hover, on keyboard focus within the carousel, via the
  // pause button, and entirely when the user prefers reduced motion.
  // [Urmee · F5 Part 1] Auto-advance stops on hover, keyboard focus, the pause button and
  // prefers-reduced-motion.
  const autoAdvanceStopped = isPaused || isHovered || isFocused || reducedMotion;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => setViewportWidth(viewport.clientWidth);
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // As many cards as fit at their minimum width, kept odd so the active card
  // stays centred, then stretched so the row spans the viewport edge to edge.
  const fittingCards = Math.max(1, Math.floor((viewportWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)));
  const visibleCount = Math.max(1, Math.min(
    fittingCards % 2 ? fittingCards : fittingCards - 1,
    nearby.length % 2 ? nearby.length : nearby.length - 1,
  ));
  const maxOffset = (visibleCount - 1) / 2;
  const slideWidth = viewportWidth
    ? (viewportWidth - (visibleCount - 1) * CARD_GAP) / visibleCount
    : MIN_CARD_WIDTH;

  useEffect(() => {
    if (!nearby.length) {
      setActiveIndex(0);
      return;
    }

    if (selectedMosqueId != null) {
      const selectedIndex = nearby.findIndex((mosque) => String(mosque.id) === String(selectedMosqueId));
      if (selectedIndex >= 0) {
        setActiveIndex((current) => (current === selectedIndex ? current : selectedIndex));
        return;
      }
    }

    const fallbackIndex = nearest
      ? Math.max(0, nearby.findIndex((mosque) => String(mosque.id) === String(nearest.id)))
      : 0;
    setActiveIndex(fallbackIndex >= 0 ? fallbackIndex : 0);
  }, [selectedMosqueId, nearby, nearest]);

  const selectIndex = useCallback((index) => {
    if (!nearby.length) return;
    const nextIndex = ((index % nearby.length) + nearby.length) % nearby.length;
    setActiveIndex(nextIndex);
    const nextId = nearby[nextIndex]?.id ?? null;
    if (nextId != null && String(nextId) !== String(selectedMosqueId)) {
      onMosqueSelect?.(nextId);
    }
  }, [nearby, selectedMosqueId, onMosqueSelect]);

  useEffect(() => {
    if (!nearby.length || isInteracting || autoAdvanceStopped) return;

    const timer = window.setTimeout(() => {
      const nextIndex = (activeIndex + 1) % nearby.length;
      setActiveIndex(nextIndex);
      const nextId = nearby[nextIndex]?.id ?? null;
      if (nextId != null && String(nextId) !== String(selectedMosqueId)) {
        onMosqueSelect?.(nextId);
      }
    }, CAROUSEL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, nearby, isInteracting, autoAdvanceStopped, onMosqueSelect, selectedMosqueId]);

  const goToPrevious = useCallback(() => selectIndex(activeIndex - 1), [activeIndex, selectIndex]);
  const goToNext = useCallback(() => selectIndex(activeIndex + 1), [activeIndex, selectIndex]);

  const handlePointerDown = useCallback((event) => {
    setIsInteracting(true);
    pointerStartX.current = event.clientX;
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!isInteracting) return;
    const deltaX = event.clientX - pointerStartX.current;
    setDragOffset(deltaX);
  }, [isInteracting]);

  const handlePointerEnd = useCallback(() => {
    if (!nearby.length) return;

    const threshold = 50;
    if (dragOffset > threshold) {
      goToPrevious();
    } else if (dragOffset < -threshold) {
      goToNext();
    }

    setDragOffset(0);
    setIsInteracting(false);
  }, [nearby.length, dragOffset, goToPrevious, goToNext]);

  const activeMosqueId = nearby[activeIndex]?.id ?? selectedMosqueId ?? null;

  return (
    <section
      id="map"
      className={`mc-explore-section mc-motion-section mc-atmospheric-section ${showMap ? "" : "mc-explore-section--cards-only"}`}
      data-selected-mosque-id={activeMosqueId ?? ""}
    >
      <div className="container">
        {showMap && (
          <div className="mc-section-heading">
            <h2>Nearby mosques</h2>
            <Link to="/browse" className="btn btn-outline-mc btn-sm">
              Browse mosques <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}

        <div className="mc-explore-layout mc-motion-stagger">
          {showMap && (
            <div className="mc-map-wrap">
              <MapView
                className="mc-map"
                center={origin}
                zoom={13}
                mosques={nearby}
                userPos={origin.fallback ? null : { lat: origin.lat, lng: origin.lng }}
                selectedMosqueId={activeMosqueId}
                onMosqueSelect={(mosqueId) => {
                  if (mosqueId == null) return;
                  const selectedIndex = nearby.findIndex((mosque) => String(mosque.id) === String(mosqueId));
                  if (selectedIndex >= 0) selectIndex(selectedIndex);
                  else onMosqueSelect?.(mosqueId);
                }}
              />
            </div>
          )}

          <div
            className="mc-nearby-showcase"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
            }}
          >
            <div className="mc-nearby-showcase__controls" aria-label="Nearby mosque controls">
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToPrevious} aria-label="Previous mosque">
                <ChevronRight size={14} aria-hidden="true" className="mc-rotate-180" />
              </button>
              {!reducedMotion && (
                <button
                  type="button"
                  className="btn btn-outline-mc btn-sm"
                  onClick={() => setIsPaused((paused) => !paused)}
                  aria-label={isPaused ? "Resume nearby mosques" : "Pause nearby mosques"}
                  aria-pressed={isPaused}
                  title={isPaused ? "Resume nearby mosques" : "Pause nearby mosques"}
                >
                  {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                </button>
              )}
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToNext} aria-label="Next mosque">
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div
              ref={viewportRef}
              className={`mc-nearby-showcase__viewport ${isInteracting ? "is-dragging" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              {nearby.map((mosque, index) => {
                const rawOffset = index - activeIndex;
                const normalizedOffset =
                  rawOffset > nearby.length / 2
                    ? rawOffset - nearby.length
                    : rawOffset < -nearby.length / 2
                      ? rawOffset + nearby.length
                      : rawOffset;

                const absOffset = Math.abs(normalizedOffset);
                const isActive = normalizedOffset === 0;
                const isVisible = absOffset <= maxOffset;
                const nextJamaat = nextJamaatLabel(mosque.prayer, now);

                if (!isVisible) return null;

                const offsetX = (normalizedOffset + maxOffset) * (slideWidth + CARD_GAP) + dragOffset * 0.55;
                const zIndex = isActive ? 10 : 5 - absOffset;

                return (
                  <div
                    key={mosque.id}
                    className={`mc-nearby-slide ${isActive ? "is-active" : ""}`}
                    style={{
                      left: 0,
                      width: `${slideWidth}px`,
                      transform: `translate(${offsetX}px, -50%)`,
                      opacity: 1,
                      zIndex,
                      transition: isInteracting || reducedMotion ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease",
                      cursor: isActive ? undefined : "pointer",
                      willChange: "transform, opacity",
                    }}
                    onClick={() => {
                      if (!isActive) selectIndex(index);
                    }}
                  >
                    <div className="card mc-card mc-nearby-card mc-nearby-card--compact">
                      <img
                        src={mosque.photo}
                        className="mc-nearby-card__image"
                        alt={mosque.name}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "/uiRef.jpeg";
                        }}
                      />
                      <div className="card-body mc-nearby-card__body d-flex flex-column">
                        <div className="flex-grow-1 d-flex flex-column">
                          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                            <div className="d-flex align-items-center gap-2 min-w-0">
                              <h5 className="mb-0 mc-nearby-card__title text-truncate">{mosque.name}</h5>
                            </div>
                            <span className="badge mc-badge flex-shrink-0">{mosque.distance} km</span>
                          </div>

                          <div className="text-muted small mb-2 mc-nearby-card__meta">
                            <MapPin size={14} aria-hidden="true" className="flex-shrink-0" />
                            <span className="text-truncate">{mosque.address}</span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between gap-2 small text-muted mb-2 mc-nearby-card__status">
                            <span className="mc-distance">
                              <Navigation size={13} aria-hidden="true" />{mosque.distance} km away
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              {mosque.verified && <VerifiedBadge />}
                              {mosque.rating !== null ? `${mosque.rating} rating` : "Not rated"}
                            </span>
                          </div>

                          <div className="mc-next-prayer mb-2">
                            <span>Next Jamat</span>
                            <strong>
                              {nextJamaat?.text || "Times unavailable"}
                              {nextJamaat && isEstimatedPrayer(mosque.prayer_sources, nextJamaat.prayer) && <EstimatedBadge className="ms-1" />}
                            </strong>
                          </div>
                        </div>

                        <div className="d-flex gap-2 mt-auto pt-1">
                          <Link
                            to={`/mosque/${mosque.id}`}
                            className="btn btn-mc btn-sm flex-fill"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View profile
                          </Link>
                          {directionsUrl(mosque) && (
                            <a
                              href={directionsUrl(mosque)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-mc btn-sm mc-icon-button"
                              title="Get directions"
                              aria-label={`Get directions to ${mosque.name}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Navigation size={16} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  const items = [
    { icon: HandHeart, title: "Money Donation", type: "money", desc: "Support a mosque or a specific cause securely." },
    { icon: Heart, title: "Blood Donation", type: "blood", desc: "Respond to live blood requests or register as a donor." },
    { icon: UsersRound, title: "Volunteer", type: "volunteer", desc: "Join events, charity drives and mosque services." },
    { icon: Landmark, title: "Goods Donation", type: "goods", desc: "Donate essential goods mosques currently need." },
  ];

  return (
    <section id="support" className="mc-support-section mc-motion-section mc-atmospheric-section" data-mc-parallax="0.16">
      <div className="container">
        <div className="mc-support-intro">
          <p className="mc-kicker">Support</p>
          <h2>Support the community</h2>
          <p>Contribute in the way that suits you best.</p>
        </div>
        <div className="row g-4 mc-motion-stagger">
          {items.map((it) => (
            <div className="col-md-6 col-lg-3" key={it.title}>
              <Link to={`/support?type=${it.type}#${it.type}`} className="mc-support-tile h-100">
                <div className="mc-feature-icon"><it.icon size={25} strokeWidth={1.6} aria-hidden="true" /></div>
                <h3>{it.title}</h3>
                <p className="text-muted small mb-0">{it.desc}</p>
              </Link>
            </div>
          ))}
        </div>
        <div className="mc-support-divider" aria-hidden="true"><Heart size={15} fill="currentColor" /></div>
        <div className="mc-custom-support">
          <div className="mc-custom-support__icon"><Heart size={24} fill="currentColor" aria-hidden="true" /></div>
          <div className="mc-custom-support__copy">
            <h3>Have another way to help?</h3>
            <p>Choose your own contribution amount and support the community in your own way.</p>
          </div>
          <Link to="/support?type=custom#custom" className="btn btn-outline-mc mc-custom-support__action">
            Custom Support <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="py-5 mc-motion-section mc-atmospheric-section" data-mc-parallax="0.16">
      <div className="container">
        <div className="row g-5 align-items-center">
          <div className="col-lg-6">
            <p className="mc-kicker">About MosqueConnect</p>
            <h2>Bringing scattered mosque information together</h2>
            <p className="mc-about-copy">
              Jamat times, Jummah announcements, events and donation campaigns are usually
              shared by word of mouth, posters, or group chats, often incomplete or outdated.
              MosqueConnect gives every mosque a verified profile that only approved
              administrators can edit, so the community always has one accurate source of truth.
            </p>
            <ul className="mc-trust-list">
              <li><ShieldCheck size={20} aria-hidden="true" />Verified, trustworthy mosque profiles</li>
              <li><UsersRound size={20} aria-hidden="true" />Family-friendly facility filters</li>
              <li><Clock3 size={20} aria-hidden="true" />Notifications for the mosques you follow</li>
            </ul>
          </div>
          <div className="col-lg-6">
            <div className="card mc-card p-4">
              <h3 className="mc-form-title">Get in touch</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection() {
  const [state, setState] = useState({ status: "loading", events: [], error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", events: [], error: "" });

    fetchEventCollection({ perPage: UPCOMING_EVENTS_COUNT, signal: controller.signal })
      .then(({ events }) => {
        // The API lists upcoming events first; drop any past ones that trail them.
        const upcoming = events.filter((event) => !isEventPast(event)).slice(0, UPCOMING_EVENTS_COUNT);
        setState({ status: "success", events: upcoming, error: "" });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ status: "error", events: [], error: error?.message || "Could not load upcoming events." });
      });

    return () => controller.abort();
  }, [attempt]);

  return (
    <section id="upcoming-events" className="mc-upcoming-events mc-motion-section" aria-labelledby="upcoming-events-title">
      <div className="container">
        <div className="mc-section-heading">
          <h2 id="upcoming-events-title">Upcoming events</h2>
          <Link to="/community" className="btn btn-outline-mc btn-sm">
            All events <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {state.status === "loading" && (
          <SkeletonRegion label="Loading upcoming events…" delay={0}>
            <div className="row g-3">
              {Array.from({ length: UPCOMING_EVENTS_COUNT }, (_, index) => (
                <div className="col-md-6 col-lg-4" key={index}><EventCardSkeleton /></div>
              ))}
            </div>
          </SkeletonRegion>
        )}

        {state.status === "error" && (
          <div className="text-center text-muted py-4" role="alert">
            <TriangleAlert size={28} className="d-block mx-auto mb-2 text-danger" aria-hidden="true" />
            <div className="mb-3">{state.error}</div>
            <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw size={14} aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {state.status === "success" && state.events.length === 0 && (
          <p className="text-center text-muted py-4 mb-0">No upcoming events yet. Check back soon.</p>
        )}

        {state.status === "success" && state.events.length > 0 && (
          <div className="row g-3">
            {state.events.map((event) => {
              const detailsPath = `/community/events/${event.id}`;
              return (
                <div className="col-md-6 col-lg-4" key={event.id}>
                  <article className="mc-event-card mc-card h-100">
                    <div className="mc-event-card__meta">
                      <span className="mc-event-card__category">{event.category || "Other"}</span>
                    </div>
                    <h3><Link className="mc-event-card__title-link" to={detailsPath}>{event.title}</Link></h3>
                    <p className="mc-event-card__mosque">{getEventMosqueName(event)}</p>
                    <dl className="mc-event-card__details">
                      <div>
                        <dt><CalendarDays size={15} aria-hidden="true" /><span className="visually-hidden">Date</span></dt>
                        <dd>{formatEventDate(event.event_date, { compact: true })}</dd>
                      </div>
                      <div>
                        <dt><Clock3 size={15} aria-hidden="true" /><span className="visually-hidden">Time</span></dt>
                        <dd>{formatEventTimeRange(event)}</dd>
                      </div>
                      <div>
                        <dt><MapPin size={15} aria-hidden="true" /><span className="visually-hidden">Location</span></dt>
                        <dd>{event.location || "Location to be announced"}</dd>
                      </div>
                    </dl>
                    <div className="mc-event-card__footer">
                      <Link className="mc-event-card__details-link" to={detailsPath}>View details</Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
