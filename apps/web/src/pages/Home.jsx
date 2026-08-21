import { useEffect, useMemo, useRef, useState } from "react";
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
import { mosquesByDistance, directionsUrl, IMPACT_STATS } from "../data/mosques";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { apiUrl, DEFAULT_CENTER } from "../config";

const nearbyRequestCache = new Map();
const NEARBY_CACHE_TTL_MS = 60000;

function nearbyCacheKey(latitude, longitude) {
  return `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

function normalizeNearbyMosque(mosque) {
  const lat = Number(mosque.latitude);
  const lng = Number(mosque.longitude);

  return {
    ...mosque,
    lat,
    lng,
    distance: mosque.distance_km === null || mosque.distance_km === undefined
      ? null
      : Number(mosque.distance_km),
    verified: mosque.verification_status === "verified",
  };
}

function fetchNearbyMosques(latitude, longitude) {
  const key = nearbyCacheKey(latitude, longitude);
  const cached = nearbyRequestCache.get(key);
  if (cached && Date.now() - cached.createdAt < NEARBY_CACHE_TTL_MS) return cached.request;
  nearbyRequestCache.delete(key);

  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  const request = fetch(apiUrl(`/api/mosques/nearby?${query}`), {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Nearby mosques could not be loaded.");
      }
      if (!Array.isArray(payload.data)) {
        throw new Error("The nearby mosque response was not in the expected format.");
      }

      return payload.data
        .map(normalizeNearbyMosque)
        .filter((mosque) => Number.isFinite(mosque.lat) && Number.isFinite(mosque.lng));
    })
    .catch((error) => {
      nearbyRequestCache.delete(key);
      throw error;
    });

  nearbyRequestCache.set(key, { request, createdAt: Date.now() });
  return request;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const origin = useGeolocation();
  const nearby = useMemo(() => mosquesByDistance(origin), [origin.lat, origin.lng]);
  const nearest = nearby[0];

  if (authLoading) {
    return <div className="mc-home-auth-loading" aria-label="Loading homepage" />;
  }

  return (
    <>
      {user ? (
        <div className="mc-auth-nearby-experience">
          <AuthenticatedNearbySection origin={origin} />
          <NearbySection origin={origin} nearby={nearby} nearest={nearest} showMap={false} />
        </div>
      ) : (
        <>
          <Hero origin={origin} nearby={nearby} nearest={nearest} onRequestLocation={() => requestGeolocation({ force: origin.status === "failure" })} />
          <NearbySection origin={origin} nearby={nearby} nearest={nearest} />
        </>
      )}
      <SupportSection />
      <ImpactSection />
      <AboutSection />
    </>
  );
}

function AuthenticatedNearbySection({ origin }) {
  const [mosques, setMosques] = useState([]);
  const [apiStatus, setApiStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [selectedMosqueId, setSelectedMosqueId] = useState(null);
  const [apiAttempt, setApiAttempt] = useState(0);

  useEffect(() => {
    requestGeolocation();
  }, []);

  useEffect(() => {
    if (origin.status !== "success") return undefined;

    let active = true;
    setApiStatus("loading");
    setApiError("");

    fetchNearbyMosques(origin.lat, origin.lng)
      .then((results) => {
        if (!active) return;
        setMosques(results);
        setSelectedMosqueId(null);
        setApiStatus("success");
      })
      .catch((error) => {
        if (!active) return;
        setMosques([]);
        setSelectedMosqueId(null);
        setApiError(error.message || "Nearby mosques could not be loaded.");
        setApiStatus("error");
      });

    return () => {
      active = false;
    };
  }, [origin.status, origin.lat, origin.lng, apiAttempt]);

  const retryApi = () => {
    nearbyRequestCache.delete(nearbyCacheKey(origin.lat, origin.lng));
    setApiAttempt((attempt) => attempt + 1);
  };

  const isFindingLocation = ["idle", "requesting", "locating"].includes(origin.status);
  const isLoadingMosques = origin.status === "success" && ["idle", "loading"].includes(apiStatus);

  return (
    <section className="mc-auth-home-map" aria-labelledby="nearby-map-title">
      <div className="container">
        <div className="mc-auth-home-map__heading">
          <div>
            <p className="mc-kicker">Your neighbourhood</p>
            <h1 id="nearby-map-title">Mosques near you</h1>
            <p>Select a mosque marker to preview its location and open its profile.</p>
          </div>
          <Link to="/browse" className="btn btn-outline-mc btn-sm">
            Browse mosques <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>

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

        <div className="mc-auth-home-map__map-wrap">
          <MapView
            className="mc-map mc-auth-home-map__map"
            center={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : DEFAULT_CENTER}
            zoom={14}
            mosques={mosques}
            userPos={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : null}
            selectedMosqueId={selectedMosqueId}
            onMosqueSelect={setSelectedMosqueId}
          />
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

function NearbySection({ origin, nearby, nearest, showMap = true }) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!nearby.length) return 0;
    if (!nearest) return 0;
    const nearestIndex = nearby.findIndex((mosque) => mosque.id === nearest.id);
    return nearestIndex >= 0 ? nearestIndex : 0;
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerStartX = useRef(0);

  useEffect(() => {
    if (!nearby.length) return;
    if (!nearest) return;

    const nearestIndex = nearby.findIndex((mosque) => mosque.id === nearest.id);
    if (nearestIndex >= 0) {
      setActiveIndex(nearestIndex);
    }
  }, [nearest, nearby]);

  useEffect(() => {
    if (!nearby.length || isInteracting) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % nearby.length);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [activeIndex, nearby, isInteracting]);

  const goToPrevious = () => {
    if (!nearby.length) return;
    setActiveIndex((current) => (current - 1 + nearby.length) % nearby.length);
  };

  const goToNext = () => {
    if (!nearby.length) return;
    setActiveIndex((current) => (current + 1) % nearby.length);
  };

  const handlePointerDown = (event) => {
    setIsInteracting(true);
    pointerStartX.current = event.clientX;
  };

  const handlePointerMove = (event) => {
    if (!isInteracting) return;
    const deltaX = event.clientX - pointerStartX.current;
    setDragOffset(deltaX);
  };

  const handlePointerEnd = () => {
    if (!nearby.length) return;

    const threshold = 70;
    if (dragOffset > threshold) {
      goToPrevious();
    } else if (dragOffset < -threshold) {
      goToNext();
    }

    setDragOffset(0);
    setIsInteracting(false);
  };

  return (
    <section id="map" className={`mc-explore-section mc-motion-section mc-atmospheric-section ${showMap ? "" : "mc-explore-section--cards-only"}`}>
      <div className="container">
        {showMap && (
          <div className="mc-section-heading">
            <div>
              <p className="mc-kicker">Explore</p>
              <h2>Explore mosques near you</h2>
              <p>Browse by location, distance, and facilities that matter to you.</p>
            </div>
            <Link to="/browse" className="btn btn-outline-mc btn-sm">
              Browse all <ChevronRight size={15} aria-hidden="true" />
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
                const isVisible = absOffset <= 4;

                if (!isVisible) return null;

                const offsetX = normalizedOffset * 250 + dragOffset * 0.22;
                const opacity = isActive ? 1 : 0.5;
                const zIndex = isActive ? 10 : 5 - absOffset;

                return (
                  <div
                    key={mosque.id}
                    className={`mc-nearby-slide ${isActive ? "is-active" : ""}`}
                    style={{
                      transform: `translate(calc(-50% + ${offsetX}px), -50%)`,
                      opacity,
                      zIndex,
                      transition: isInteracting ? "none" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease, filter 0.5s ease, box-shadow 0.5s ease",
                    }}
                  >
                    <div className="card mc-card mc-nearby-card">
                      <img src={mosque.photo} className="mc-nearby-card__image" alt={mosque.name} />
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
                            {mosque.rating} rating
                          </span>
                        </div>

                        <div className="mc-next-prayer mb-3">
                          <span>Next Jamat</span>
                          <strong>Dhuhr {mosque.prayer.Dhuhr} PM</strong>
                        </div>

                        <div className="d-flex gap-2">
                          <Link to={`/mosque/${mosque.id}`} className="btn btn-mc btn-sm flex-fill">View profile</Link>
                          <a
                            href={directionsUrl(mosque)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-mc btn-sm mc-icon-button"
                            title="Get directions"
                            aria-label={`Get directions to ${mosque.name}`}
                          >
                            <Navigation size={16} aria-hidden="true" />
                          </a>
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

    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={nodeRef}>{display}</span>;
}
