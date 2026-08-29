import { useEffect, useRef, useState, useCallback, memo } from "react";
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
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Search,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useGeolocation, requestGeolocation } from "../hooks/useGeolocation";
import { IMPACT_STATS } from "../data/mosques";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_CENTER } from "../config";
import { useMosqueDiscovery } from "../hooks/useMosqueDiscovery";
import { directionsUrl } from "../utils/mosqueDiscovery";
import { dhuhrJamaatLabel } from "../utils/prayerTime";

export default function Home() {
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
    return <div className="mc-home-auth-loading" aria-label="Loading homepage" />;
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
  const { mosques, status: apiStatus, error: apiError, retry: retryApi } = discovery;

  useEffect(() => {
    requestGeolocation();
  }, []);

  const isFindingLocation = ["idle", "requesting", "locating"].includes(origin.status);
  const isLoadingMosques = origin.status === "success" && ["idle", "loading"].includes(apiStatus);

  return (
    <section className="mc-auth-home-map" aria-labelledby="nearby-map-title">
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

            {apiStatus === "error" && origin.status === "success" && (
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

function Hero({ origin, nearby, nearest, onRequestLocation }) {
  return (
    <header className="mc-hero mc-home-hero">
      <div className="container mc-hero__inner">
        <div className="mc-hero__content">
          <h1>Find. Connect. Pray.</h1>
          <p className="mc-hero__copy">
            Discover mosques near you and stay connected to your faith and community.
          </p>
          <div className="mc-hero__search">
            <Link to="/browse" className="mc-hero__search-input" aria-label="Browse mosques">
              <Search size={17} aria-hidden="true" />
              <span>Search by mosque name, area, or city</span>
              <SlidersHorizontal size={17} aria-hidden="true" />
            </Link>
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
          <LocationControls origin={origin} nearby={nearby} nearest={nearest} onRequest={onRequestLocation} />
          <Link to="/browse" className="btn btn-light mc-location-card__secondary w-100">
            Enter location manually
          </Link>
        </div>
      </div>
    </header>
  );
}

function LocationControls({ origin, nearby, nearest, onRequest }) {
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
    if (!nearby.length || isInteracting) return;

    const timer = window.setTimeout(() => {
      const nextIndex = (activeIndex + 1) % nearby.length;
      setActiveIndex(nextIndex);
      const nextId = nearby[nextIndex]?.id ?? null;
      if (nextId != null && String(nextId) !== String(selectedMosqueId)) {
        onMosqueSelect?.(nextId);
      }
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [activeIndex, nearby, isInteracting, onMosqueSelect, selectedMosqueId]);

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
    <section id="map" className={`mc-explore-section mc-motion-section mc-atmospheric-section ${showMap ? "" : "mc-explore-section--cards-only"}`}>
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

          <div className="mc-nearby-showcase">
            <div className="mc-nearby-showcase__controls" aria-label="Nearby mosque controls">
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToPrevious} aria-label="Previous mosque">
                <ChevronRight size={14} aria-hidden="true" className="mc-rotate-180" />
              </button>
              <button type="button" className="btn btn-outline-mc btn-sm" onClick={goToNext} aria-label="Next mosque">
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
                        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <h5 className="mb-0 mc-nearby-card__title">{mosque.name}</h5>
                          </div>
                          <span className="badge mc-badge">{mosque.distance} km</span>
                        </div>

                        <div className="text-muted small mb-2 mc-nearby-card__meta">
                          <MapPin size={14} aria-hidden="true" />
                          <span>{mosque.address}</span>
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

                        <div className="mc-next-prayer mb-3 flex-grow-1">
                          <span>Next Jamat</span>
                          <strong>{dhuhrJamaatLabel(mosque.prayer) || "Times unavailable"}</strong>
                        </div>

                        <div className="d-flex gap-2 mt-auto">
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
                    <NearbyCardContent mosque={mosque} />
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
    <section id="support" className="mc-support-section mc-motion-section mc-atmospheric-section">
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

function ImpactSection() {
  const impactIcons = [Landmark, UsersRound, Heart, HandHeart];
  return (
    <section id="impact" className="mc-impact mc-motion-section mc-atmospheric-section">
      <div className="container">
        <div className="mc-impact__headline">
          <h2>Stronger together, for a better community</h2>
          <p>Your connection helps build stronger, more vibrant communities.</p>
        </div>
        <div className="row text-center g-0 mc-impact__stats">
          {IMPACT_STATS.map((s, index) => {
            const Icon = impactIcons[index];
            return (
              <div className="col-6 col-lg-3" key={s.label}>
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <div className="mc-stat-value"><AnimatedStat value={s.value} /></div>
                <div>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const onSubmit = (e) => {
    e.preventDefault();
    e.currentTarget.reset();
    alert("Thanks! We will get back to you. (demo)");
  };
  return (
    <section id="about" className="py-5 mc-motion-section mc-atmospheric-section">
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
              <form onSubmit={onSubmit}>
                <div className="mb-3"><input className="form-control" placeholder="Your name" required /></div>
                <div className="mb-3"><input type="email" className="form-control" placeholder="Your email" required /></div>
                <div className="mb-3"><textarea className="form-control" rows="3" placeholder="Your message" required /></div>
                <button className="btn btn-mc w-100" type="submit">Send message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedStat({ value }) {
  const nodeRef = useRef(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = /^(\d[\d,]*)([Kk]?)(\+?)$/.exec(value);
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const end = Number(match[1].replace(/,/g, ""));
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (frame) cancelAnimationFrame(frame);
        return;
      }
      if (frame) cancelAnimationFrame(frame);
      setDisplay(`0${match[2]}${match[3]}`);
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(`${Math.round(end * eased).toLocaleString()}${match[2]}${match[3]}`);
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
  }, [value]);

  return <span ref={nodeRef}>{display}</span>;
}

const NearbyCardContent = memo(({ mosque }) => {
  return (
    <div className="card mc-card mc-nearby-card">
      <img
        src={mosque.photo}
        className="mc-nearby-card__image"
        alt={mosque.name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/uiRef.jpeg";
        }}
      />
      <div className="card-body mc-nearby-card__body">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <h5 className="mb-0 mc-nearby-card__title">{mosque.name}</h5>
          </div>
          <span className="badge mc-badge">{mosque.distance} km</span>
        </div>

        <div className="text-muted small mb-2 mc-nearby-card__meta">
          <MapPin size={14} aria-hidden="true" />
          <span>{mosque.address}</span>
        </div>

        <div className="d-flex align-items-center justify-content-between gap-2 small text-muted mb-2">
          <span className="mc-distance">
            <Navigation size={13} aria-hidden="true" />{mosque.distance} km away
          </span>
          <span className="d-flex align-items-center gap-1">
            {mosque.verified && <VerifiedBadge />}
            {mosque.rating !== null ? `${mosque.rating} rating` : "Not rated"}
          </span>
        </div>

        <div className="mc-next-prayer mb-3">
          <span>Next Jamat</span>
          <strong>{dhuhrJamaatLabel(mosque.prayer) || "Times unavailable"}</strong>
        </div>

        <div className="d-flex gap-2">
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
  );
});
