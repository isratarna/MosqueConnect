import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mc-footer text-light pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-geo-alt-fill me-1" />
              Mosque<span className="mc-brand-accent">Connect</span>
            </h5>
            <p className="text-white-50 mb-3">
              Connecting Muslims with the mosques around them — accurate Jamat times,
              announcements, events, and a hub for community life.
            </p>
            <div className="d-flex gap-2">
              <a href="#" className="mc-social" aria-label="Facebook"><i className="bi bi-facebook" /></a>
              <a href="#" className="mc-social" aria-label="Twitter"><i className="bi bi-twitter-x" /></a>
              <a href="#" className="mc-social" aria-label="Instagram"><i className="bi bi-instagram" /></a>
              <a href="#" className="mc-social" aria-label="YouTube"><i className="bi bi-youtube" /></a>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">Explore</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/browse">Browse Mosques</Link></li>
              <li><a href="/#support">Support</a></li>
              <li><a href="/#impact">Our Impact</a></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">Community</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><a href="#">Volunteer</a></li>
              <li><a href="#">Blood Requests</a></li>
              <li><a href="#">Donations</a></li>
              <li><a href="#">Events</a></li>
            </ul>
          </div>
          <div className="col-lg-4">
            <h6 className="fw-semibold mb-3">Contact</h6>
            <ul className="list-unstyled text-white-50 mc-foot-contact">
              <li><i className="bi bi-envelope me-2" />hello@mosqueconnect.example</li>
              <li><i className="bi bi-telephone me-2" />+880 1700 000000</li>
              <li><i className="bi bi-geo-alt me-2" />Dhaka, Bangladesh</li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary my-4" />
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <small className="text-white-50">© 2026 MosqueConnect · CSE 3100 Project, AUST</small>
          <small className="text-white-50">Built with React, Bootstrap 5 &amp; Google Maps</small>
        </div>
      </div>
    </footer>
  );
}
