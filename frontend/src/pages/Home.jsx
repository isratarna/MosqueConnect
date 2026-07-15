import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGeolocation } from "../hooks/useGeolocation";
import { mosquesByDistance, directionsUrl, IMPACT_STATS } from "../data/mosques";
import MapView from "../components/MapView";

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
  const features = [
    { icon: "bi-clock-history", title: "Live Jamat times", sub: "Updated by verified admins" },
    { icon: "bi-gender-female", title: "Women's area", sub: "Family-friendly filter" },
    { icon: "bi-megaphone", title: "Announcements", sub: "Never miss a notice" },
    { icon: "bi-people", title: "Community hub", sub: "Volunteer & donate" },
  ];
  return (
    <header className="mc-hero py-5">
      <div className="container py-lg-4">
        <div className="row align-items-center g-4">
          <div className="col-lg-6">
            <span className="badge bg-warning text-dark mb-3">Geolocation-based mosque finder</span>
            <h1 className="display-5 fw-bold mb-3">Every nearby mosque, one Jamat time away.</h1>
            <p className="lead mb-4">
              MosqueConnect brings accurate Jamat times, announcements, events and
              community support into one place — so you always know where and when to pray.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/browse" className="btn btn-warning btn-lg text-dark fw-semibold">
                <i className="bi bi-search me-1" />Browse Mosques
              </Link>
              <a href="#map" className="btn btn-outline-light btn-lg">
                <i className="bi bi-geo-alt me-1" />Find Nearby
              </a>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="row g-3">
              {features.map((f) => (
                <div className="col-6" key={f.title}>
                  <div className="bg-white text-dark rounded-4 p-3 shadow-sm">
                    <i className={`bi ${f.icon} text-mc fs-3`} />
                    <div className="fw-bold mt-2">{f.title}</div>
                    <small className="text-muted">{f.sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NearbySection({ origin, nearby, nearest }) {
  return (
    <section id="map" className="py-5">
      <div className="container">
        <div className="text-center mb-4">
          <div className="section-label">Nearby</div>
          <h2 className="fw-bold">Mosques around your location</h2>
          <p className="text-muted mb-0">Allow location access to see the mosques closest to you.</p>
        </div>
        <div className="row g-4">
          <div className="col-lg-8">
            <MapView
              center={origin}
              zoom={13}
              mosques={nearby}
              userPos={origin.fallback ? null : { lat: origin.lat, lng: origin.lng }}
            />
          </div>
          <div className="col-lg-4">
            {nearest && (
              <div className="card mc-card mc-highlight">
                <div className="card-body">
                  <div className="section-label mb-1">Nearest to you</div>
                  <h5 className="fw-bold mb-1">{nearest.name}</h5>
                  <div className="text-muted small mb-2">
                    <i className="bi bi-geo-alt me-1" />{nearest.address}
                  </div>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <span className="badge bg-success">
                      <i className="bi bi-signpost-2 me-1" />{nearest.distance} km away
                    </span>
                    <span className="small text-muted">
                      <i className="bi bi-star-fill text-warning me-1" />{nearest.rating}
                    </span>
                  </div>
                  <div className="small mb-3">
                    Next Jamat — <strong>Dhuhr {nearest.prayer.Dhuhr} PM</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <Link to={`/mosque/${nearest.id}`} className="btn btn-mc btn-sm flex-fill">View profile</Link>
                    <a href={directionsUrl(nearest)} target="_blank" rel="noopener noreferrer"
                       className="btn btn-outline-mc btn-sm"><i className="bi bi-compass" /></a>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3">
              {nearby.slice(0, 4).map((m) => (
                <Link to={`/mosque/${m.id}`} className="text-decoration-none" key={m.id}>
                  <div className="card mc-card mb-2">
                    <div className="card-body py-2 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold text-dark">{m.name}</div>
                        <small className="text-muted">{m.address}</small>
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
    </section>
  );
}

function SupportSection() {
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const items = [
    { icon: "bi-cash-coin", title: "Money Donation", desc: "Support a mosque or a specific cause securely." },
    { icon: "bi-droplet-half", title: "Blood Donation", desc: "Respond to live blood requests or register as a donor." },
    { icon: "bi-hand-thumbs-up", title: "Volunteer", desc: "Join events, charity drives and mosque services." },
    { icon: "bi-box-seam", title: "Goods Donation", desc: "Donate essential goods mosques currently need." },
  ];

  const handleSupportNow = (e) => {
    e.preventDefault();
    const amount = Number(customAmount);

    if (!customAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSuccess(false);
      return;
    }

    setError("");
    setSuccess(true);
    setCustomAmount("");

    window.setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <section id="support" className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-5">
          <div className="section-label">Support</div>
          <h2 className="fw-bold">Support the community</h2>
          <p className="text-muted">Contribute in the way that suits you best.</p>
        </div>
        <div className="row g-4">
          {items.map((it) => (
            <div className="col-md-6 col-lg-3" key={it.title}>
              <div className="card mc-card text-center p-3 h-100">
                <div className="mc-feature-icon mx-auto mb-3"><i className={`bi ${it.icon}`} /></div>
                <h6 className="fw-bold">{it.title}</h6>
                <p className="text-muted small mb-0">{it.desc}</p>
              </div>
            </div>
          ))}
          <div className="col-md-6 col-lg-3">
            <div className="card mc-card p-3 h-100">
              <div className="mc-feature-icon mx-auto mb-3"><i className="bi bi-heart-fill" /></div>
              <h6 className="fw-bold text-center">Custom Support</h6>
              <form onSubmit={handleSupportNow} className="mt-2">
                <label className="form-label small text-muted" htmlFor="custom-support-amount">Enter amount</label>
                <input
                  id="custom-support-amount"
                  type="number"
                  min="1"
                  className="form-control form-control-sm"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Amount"
                />
                {error ? <div className="text-danger small mt-2">{error}</div> : null}
                <button type="submit" className="btn btn-mc btn-sm w-100 mt-3">Support Now</button>
                {success ? <div className="alert alert-success py-2 px-3 mt-3 mb-0 small">Thank you for supporting the community!</div> : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImpactSection() {
  return (
    <section id="impact" className="mc-impact py-5">
      <div className="container">
        <div className="row text-center g-4">
          {IMPACT_STATS.map((s) => (
            <div className="col-6 col-lg-3" key={s.label}>
              <i className={`bi ${s.icon}`} />
              <div className="mc-stat-value mt-2">{s.value}</div>
              <div className="text-white-50">{s.label}</div>
            </div>
          ))}
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
            <div className="section-label">About us</div>
            <h2 className="fw-bold mb-3">Bringing scattered mosque information together</h2>
            <p className="text-muted">
              Jamat times, Jummah announcements, events and donation campaigns are usually
              shared by word of mouth, posters, or group chats — often incomplete or outdated.
              MosqueConnect gives every mosque a verified profile that only approved
              administrators can edit, so the community always has one accurate source of truth.
            </p>
            <ul className="list-unstyled">
              <li className="mb-2"><i className="bi bi-check-circle-fill text-mc me-2" />Verified, trustworthy mosque profiles</li>
              <li className="mb-2"><i className="bi bi-check-circle-fill text-mc me-2" />Family-friendly facility filters</li>
              <li className="mb-2"><i className="bi bi-check-circle-fill text-mc me-2" />Notifications for the mosques you follow</li>
            </ul>
          </div>
          <div className="col-lg-6">
            <div className="card mc-card p-4">
              <h5 className="fw-bold mb-3"><i className="bi bi-envelope me-2 text-mc" />Get in touch</h5>
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
