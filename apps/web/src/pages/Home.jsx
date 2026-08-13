import { useMemo } from "react";
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
  MapPin,
  Navigation,
  ShieldCheck,
  SlidersHorizontal,
  Search,
  UsersRound,
} from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import { mosquesByDistance, directionsUrl, IMPACT_STATS } from "../data/mosques";
import MapView from "../components/MapView";
import VerifiedBadge from "../components/VerifiedBadge";

export default function Home() {
  const origin = useGeolocation();
  const nearby = useMemo(() => mosquesByDistance(origin), [origin.lat, origin.lng]);
  const nearest = nearby[0];

  return (
    <>
      <Hero />
      <NearbySection origin={origin} nearby={nearby} nearest={nearest} />
      <SupportSection />
      <ImpactSection />
      <AboutSection />
    </>
  );
}

function Hero() {
  return (
    <header className="mc-hero">
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
          <a href="#map" className="btn btn-mc w-100">
            <LocateFixed size={16} aria-hidden="true" /> Use my location
          </a>
          <Link to="/browse" className="btn btn-light mc-location-card__secondary w-100">
            Enter location manually
          </Link>
        </div>
      </div>
    </header>
  );
}

function NearbySection({ origin, nearby, nearest }) {
  return (
    <section id="map" className="mc-explore-section">
      <div className="container">
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
        <div className="row g-4 align-items-stretch">
          <div className="col-lg-8 d-flex">
            <div className="w-100 h-100">
              <MapView
                className="mc-map h-100"
                center={origin}
                zoom={13}
                mosques={nearby}
                userPos={origin.fallback ? null : { lat: origin.lat, lng: origin.lng }}
              />
            </div>
          </div>
          <div className="col-lg-4 d-flex">
            <div className="w-100 d-flex flex-column gap-3">
              {nearest && (
                <div className="card mc-card mc-highlight mb-0 h-100">
                  <img src={nearest.photo} className="mc-nearest-image" alt="" />
                  <div className="card-body">
                    <div className="section-label mb-1">Nearest to you</div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="fw-bold mb-0">{nearest.name}</h5>
                      {nearest.verified && <VerifiedBadge />}
                    </div>
                    <div className="text-muted small mb-2">
                      <MapPin size={14} aria-hidden="true" />{nearest.address}
                    </div>
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <span className="mc-distance">
                        <Navigation size={13} aria-hidden="true" />{nearest.distance} km away
                      </span>
                      <span className="small text-muted">{nearest.rating} rating</span>
                    </div>
                    <div className="mc-next-prayer">
                      <span>Next Jamat</span>
                      <strong>Dhuhr {nearest.prayer.Dhuhr} PM</strong>
                    </div>
                    <div className="d-flex gap-2">
                      <Link to={`/mosque/${nearest.id}`} className="btn btn-mc btn-sm flex-fill">View profile</Link>
                      <a href={directionsUrl(nearest)} target="_blank" rel="noopener noreferrer"
                         className="btn btn-outline-mc btn-sm mc-icon-button" title="Get directions" aria-label="Get directions">
                        <Navigation size={16} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              <div className="d-flex flex-column gap-2">
                {nearby.slice(0, 4).map((m) => (
                  <Link to={`/mosque/${m.id}`} className="text-decoration-none" key={m.id}>
                    <div className="card mc-card mb-0">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <div>
                          <div className="mc-listing-title">{m.name}</div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <small className="text-muted">{m.address}</small>
                            {m.verified && <VerifiedBadge />}
                          </div>
                        </div>
                        <span className="badge mc-badge">{m.distance} km</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
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
    <section id="support" className="mc-support-section">
      <div className="container">
        <div className="mc-support-intro">
          <p className="mc-kicker">Support</p>
          <h2>Support the community</h2>
          <p>Contribute in the way that suits you best.</p>
        </div>
        <div className="row g-4">
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
    <section id="impact" className="mc-impact">
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
                <div className="mc-stat-value">{s.value}</div>
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
    <section id="about" className="py-5">
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
