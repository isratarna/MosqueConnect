import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  HandHeart,
  Heart,
  Landmark,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Navigation,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Search,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useGeolocation, requestGeolocation } from "../hooks/useGeolocation";
import { useLocale } from "../hooks/useLocale";
import { IMPACT_STATS } from "../data/mosques";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_CENTER } from "../config";
import { useMosqueDiscovery } from "../hooks/useMosqueDiscovery";
import { directionsUrl } from "../utils/mosqueDiscovery";
import { dhuhrJamaatLabel } from "../utils/prayerTime";
import { formatNumber } from "../utils/intl";

export default function Home() {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const origin = useGeolocation();
  const discovery = useMosqueDiscovery(origin);
  const nearby = discovery.mosques;
  const nearest = nearby[0];
  const [selectedMosqueId, setSelectedMosqueId] = useState(null);

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
    return <div className="mc-home-auth-loading" aria-label={t("home.loadingAria")} />;
  }

  return (
    <>
      {user ? (
        <div className="mc-auth-nearby-experience">
          <AuthenticatedNearbySection
            origin={origin}
            discovery={discovery}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
          />
          <NearbySection
            origin={origin}
            nearby={nearby}
            nearest={nearest}
            showMap={false}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
          />
        </div>
      ) : (
        <>
          <Hero origin={origin} nearby={nearby} nearest={nearest} onRequestLocation={() => requestGeolocation({ force: origin.status === "failure" })} />
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
      <ImpactSection />
      <AboutSection />
    </>
  );
}

function AuthenticatedNearbySection({ origin, discovery, selectedMosqueId, onMosqueSelect }) {
  const { t } = useLocale();
  const { mosques, status: apiStatus, error: apiError, retry: retryApi } = discovery;

  useEffect(() => {
    requestGeolocation();
  }, []);

  const isFindingLocation = ["idle", "requesting", "locating"].includes(origin.status);
  const isLoadingMosques = origin.status === "success" && ["idle", "loading"].includes(apiStatus);

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
            center={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : DEFAULT_CENTER}
            zoom={14}
            mosques={mosques}
            userPos={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : null}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={onMosqueSelect}
          />

          <div className="mc-auth-home-map__label">
            <MapPin size={14} aria-hidden="true" />
            <h1 id="nearby-map-title">{t("home.nearbyMosques")}</h1>
          </div>
          <Link to="/browse" className="mc-auth-home-map__browse btn btn-sm">
            {t("home.browseMosques")} <ChevronRight size={14} aria-hidden="true" />
          </Link>

          <div className="mc-auth-home-map__feedback-stack">
            {(isFindingLocation || isLoadingMosques) && (
              <MapFeedback
                icon={<LoaderCircle className="spin" size={20} aria-hidden="true" />}
                title={isFindingLocation ? t("home.findingLocation") : t("home.findingNearby")}
                message={isFindingLocation ? t("home.permissionPrompt") : t("home.checkingClosest")}
              />
            )}

            {origin.status === "failure" && (
              <MapFeedback
                icon={<TriangleAlert size={21} aria-hidden="true" />}
                title={origin.errorCode === "denied" ? t("home.locationDenied") : t("home.locationUnavailable")}
                message={origin.errorCode ? t(`geo.${origin.errorCode}`) : t("home.locationFallback")}
              >
                <button type="button" className="btn btn-mc btn-sm" onClick={() => requestGeolocation({ force: true })}>
                  <RefreshCw size={14} aria-hidden="true" /> {t("home.tryAgain")}
                </button>
                <Link to="/browse" className="btn btn-outline-mc btn-sm">{t("home.browseManually")}</Link>
              </MapFeedback>
            )}

            {apiStatus === "error" && origin.status === "success" && (
              <MapFeedback
                icon={<TriangleAlert size={21} aria-hidden="true" />}
                title={t("home.loadError")}
                message={apiError}
              >
                <button type="button" className="btn btn-mc btn-sm" onClick={retryApi}>
                  <RefreshCw size={14} aria-hidden="true" /> {t("home.retry")}
                </button>
              </MapFeedback>
            )}

            {apiStatus === "success" && mosques.length === 0 && (
              <MapFeedback
                icon={<Landmark size={21} aria-hidden="true" />}
                title={t("home.noNearby")}
                message={t("home.noNearbyMessage")}
              >
                <Link to="/browse" className="btn btn-outline-mc btn-sm">{t("home.browseAll")}</Link>
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

function Hero({ origin, nearby, nearest, onRequestLocation }) {
  const { t } = useLocale();

  return (
    <header className="mc-hero mc-home-hero" data-mc-parallax="0.26">
      <div className="container mc-hero__inner">
        <div className="mc-hero__content">
          <h1>{t("home.hero.title")}</h1>
          <p className="mc-hero__copy">{t("home.hero.copy")}</p>
          <div className="mc-hero__search">
            <Link to="/browse" className="mc-hero__search-input" aria-label={t("home.hero.browseAria")}>
              <Search size={17} aria-hidden="true" />
              <span>{t("home.hero.searchPlaceholder")}</span>
              <SlidersHorizontal size={17} aria-hidden="true" />
            </Link>
            <a href="#map" className="mc-hero__nearby" title={t("home.hero.findNearby")} aria-label={t("home.hero.findNearby")}>
              <LocateFixed size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="mc-location-card">
          <div className="mc-location-card__icon"><MapPin size={22} aria-hidden="true" /></div>
          <div>
            <h2>{t("home.hero.enableLocation")}</h2>
            <p>{t("home.hero.enableLocationCopy")}</p>
          </div>
          <LocationControls origin={origin} nearby={nearby} nearest={nearest} onRequest={onRequestLocation} />
          <Link to="/browse" className="btn btn-light mc-location-card__secondary w-100">
            {t("home.hero.enterManually")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function LocationControls({ origin, nearby, nearest, onRequest }) {
  const { t } = useLocale();
  const handleClick = (e) => {
    e.preventDefault();
    onRequest();
  };

  return (
    <div>
      <div className="mb-2" aria-live="polite">
        {origin.status === "idle" && <small className="text-muted">{t("home.location.notSet")}</small>}
        {origin.status === "requesting" && <small className="text-muted">{t("home.location.requesting")}</small>}
        {origin.status === "locating" && <small className="text-muted">{t("home.location.locating")}</small>}
        {origin.status === "success" && (
          <div>
            <div className="fw-semibold">{t("home.location.mosquesNearby", { count: nearby.length })}</div>
            <div className="small text-muted">{t("home.location.closest", { name: nearest ? nearest.name : t("common.dash") })}</div>
          </div>
        )}
        {origin.status === "failure" && <small className="text-danger">{t("home.location.unavailableManual")}</small>}
      </div>

      <button className="btn btn-mc w-100 mb-2" onClick={handleClick} aria-pressed={origin.status === "success"}>
        <LocateFixed size={16} aria-hidden="true" /> {origin.status === "success" ? t("home.location.set") : t("home.location.use")}
      </button>
    </div>
  );
}

function NearbySection({ origin, nearby, nearest, showMap = true, selectedMosqueId, onMosqueSelect }) {
  const { t, locale } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pointerStartX = useRef(0);
  const [cardWidth, setCardWidth] = useState(260);

  useEffect(() => {
    const handleResize = () => setCardWidth(window.innerWidth < 768 ? 235 : 260);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!nearby.length || isInteracting || isPaused) return;

    const timer = window.setTimeout(() => {
      const nextIndex = (activeIndex + 1) % nearby.length;
      setActiveIndex(nextIndex);
      const nextId = nearby[nextIndex]?.id ?? null;
      if (nextId != null && String(nextId) !== String(selectedMosqueId)) {
        onMosqueSelect?.(nextId);
      }
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [activeIndex, nearby, isInteracting, isPaused, onMosqueSelect, selectedMosqueId]);

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
            <h2>{t("home.nearbyMosques")}</h2>
            <Link to="/browse" className="btn btn-outline-mc btn-sm">
              {t("home.browseMosques")} <ChevronRight size={15} aria-hidden="true" />
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

          <div className="mc-nearby-showcase">
            <div className="mc-nearby-showcase__controls" aria-label={t("home.carousel.controls")}>
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToPrevious} aria-label={t("home.carousel.previous")}>
                <ChevronRight size={14} aria-hidden="true" className="mc-rotate-180" />
              </button>
              <button
                type="button"
                className="btn btn-outline-mc btn-sm"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-label={isPaused ? t("home.carousel.resume") : t("home.carousel.pause")}
                aria-pressed={isPaused}
                title={isPaused ? t("home.carousel.resume") : t("home.carousel.pause")}
              >
                {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              </button>
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToNext} aria-label={t("home.carousel.next")}>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div
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
                const isVisible = absOffset <= 2;

                if (!isVisible) return null;

                const offsetX = normalizedOffset * 278 + dragOffset * 0.55;
                const opacity = isActive ? 1 : 0.68;
                const zIndex = isActive ? 10 : 5 - absOffset;

                return (
                  <div
                    key={mosque.id}
                    className={`mc-nearby-slide ${isActive ? "is-active" : ""}`}
                    style={{
                      transform: `translate(calc(-50% + ${offsetX}px), -50%) scale(${isActive ? 1.03 : 0.94})`,
                      opacity,
                      zIndex,
                      transition: isInteracting ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease",
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
                            <span className="badge mc-badge flex-shrink-0">{t("common.distanceKm", { distance: mosque.distance })}</span>
                          </div>

                          <div className="text-muted small mb-2 mc-nearby-card__meta">
                            <MapPin size={14} aria-hidden="true" className="flex-shrink-0" />
                            <span className="text-truncate">{mosque.address}</span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between gap-2 small text-muted mb-2 mc-nearby-card__status">
                            <span className="mc-distance">
                              <Navigation size={13} aria-hidden="true" />{t("home.carousel.kmAway", { distance: mosque.distance })}
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              {mosque.verified && <VerifiedBadge />}
                              {mosque.rating !== null ? t("common.rating", { rating: mosque.rating }) : t("common.notRated")}
                            </span>
                          </div>

                          <div className="mc-next-prayer mb-2">
                            <span>{t("home.carousel.nextJamat")}</span>
                            <strong>{dhuhrJamaatLabel(mosque.prayer, locale, t("prayer.dhuhr")) || t("home.carousel.timesUnavailable")}</strong>
                          </div>
                        </div>

                        <div className="d-flex gap-2 mt-auto pt-1">
                          <Link
                            to={`/mosque/${mosque.id}`}
                            className="btn btn-mc btn-sm flex-fill"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {t("home.carousel.viewProfile")}
                          </Link>
                          {directionsUrl(mosque) && (
                            <a
                              href={directionsUrl(mosque)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-mc btn-sm mc-icon-button"
                              title={t("home.carousel.getDirections")}
                              aria-label={t("home.carousel.getDirectionsTo", { name: mosque.name })}
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
  const { t } = useLocale();
  const items = [
    { icon: HandHeart, title: t("home.support.money.title"), type: "money", desc: t("home.support.money.desc") },
    { icon: Heart, title: t("home.support.blood.title"), type: "blood", desc: t("home.support.blood.desc") },
    { icon: UsersRound, title: t("home.support.volunteer.title"), type: "volunteer", desc: t("home.support.volunteer.desc") },
    { icon: Landmark, title: t("home.support.goods.title"), type: "goods", desc: t("home.support.goods.desc") },
  ];

  return (
    <section id="support" className="mc-support-section mc-motion-section mc-atmospheric-section" data-mc-parallax="0.16">
      <div className="container">
        <div className="mc-support-intro">
          <p className="mc-kicker">{t("home.support.kicker")}</p>
          <h2>{t("home.support.title")}</h2>
          <p>{t("home.support.copy")}</p>
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
            <h3>{t("home.support.otherTitle")}</h3>
            <p>{t("home.support.otherCopy")}</p>
          </div>
          <Link to="/support?type=custom#custom" className="btn btn-outline-mc mc-custom-support__action">
            {t("home.support.custom")} <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ImpactSection() {
  const { t } = useLocale();
  const impactIcons = [Landmark, UsersRound, Heart, HandHeart];
  return (
    <section id="impact" className="mc-impact mc-motion-section mc-atmospheric-section" data-mc-parallax="0.18">
      <div className="container">
        <div className="mc-impact__headline">
          <h2>{t("home.impact.title")}</h2>
          <p>{t("home.impact.copy")}</p>
        </div>
        <div className="row text-center g-0 mc-impact__stats">
          {IMPACT_STATS.map((s, index) => {
            const Icon = impactIcons[index];
            return (
              <div className="col-6 col-lg-3" key={s.key}>
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <div className="mc-stat-value"><AnimatedStat stat={s} /></div>
                <div>{t(s.labelKey)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const { t } = useLocale();
  const onSubmit = (e) => {
    e.preventDefault();
    e.currentTarget.reset();
    alert(t("home.about.thanks"));
  };
  return (
    <section id="about" className="py-5 mc-motion-section mc-atmospheric-section" data-mc-parallax="0.16">
      <div className="container">
        <div className="row g-5 align-items-center">
          <div className="col-lg-6">
            <p className="mc-kicker">{t("home.about.kicker")}</p>
            <h2>{t("home.about.title")}</h2>
            <p className="mc-about-copy">{t("home.about.copy")}</p>
            <ul className="mc-trust-list">
              <li><ShieldCheck size={20} aria-hidden="true" />{t("home.about.trustVerified")}</li>
              <li><UsersRound size={20} aria-hidden="true" />{t("home.about.trustFamily")}</li>
              <li><Clock3 size={20} aria-hidden="true" />{t("home.about.trustNotifications")}</li>
            </ul>
          </div>
          <div className="col-lg-6">
            <div className="card mc-card p-4">
              <h3 className="mc-form-title">{t("home.about.contactTitle")}</h3>
              <form onSubmit={onSubmit}>
                <div className="mb-3"><input className="form-control" placeholder={t("home.about.namePlaceholder")} required /></div>
                <div className="mb-3"><input type="email" className="form-control" placeholder={t("home.about.emailPlaceholder")} required /></div>
                <div className="mb-3"><textarea className="form-control" rows="3" placeholder={t("home.about.messagePlaceholder")} required /></div>
                <button className="btn btn-mc w-100" type="submit">{t("home.about.send")}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Impact figures are stored as numbers and formatted for the active language
// (Bangla digits; "২১ লাখ" in place of "2.1M"), so they animate in either one.
function formatStat(stat, current, locale) {
  const options = stat.compact
    ? { notation: "compact", compactDisplay: locale.startsWith("bn") ? "long" : "short", maximumFractionDigits: 1 }
    : undefined;

  return `${stat.prefix ?? ""}${formatNumber(current, locale, options)}${stat.suffix ?? ""}`;
}

function AnimatedStat({ stat }) {
  const { locale } = useLocale();
  const nodeRef = useRef(null);
  const [current, setCurrent] = useState(stat.value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (frame) cancelAnimationFrame(frame);
        return;
      }
      if (frame) cancelAnimationFrame(frame);
      setCurrent(0);
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(stat.value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.65 });

    const node = nodeRef.current;
    if (node instanceof Element) {
      observer.observe(node);
    }

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stat.value]);

  return <span ref={nodeRef}>{formatStat(stat, current, locale)}</span>;
}
