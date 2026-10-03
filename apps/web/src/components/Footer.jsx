import { Link } from "react-router-dom";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { CONTACT_EMAIL } from "../config";
import logo from "../assets/Logo.png";

export default function Footer() {
  return (
    <footer className="mc-footer text-light pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <img src={logo} alt="MosqueConnect logo" className="mc-footer-logo" />
              Mosque<span className="mc-brand-accent">Connect</span>
            </h5>
            <p className="text-white-50 mb-3">
              Connecting Muslims with the mosques around them — accurate Jamat times,
              announcements, events, and a hub for community life.
            </p>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">Explore</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/browse">Browse Mosques</Link></li>
              <li><Link to="/support">Support</Link></li>
              <li><Link to="/campaigns">Campaigns</Link></li>
              <li><a href="/#impact">Our Impact</a></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">Community</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/community">Community Hub</Link></li>
              <li><Link to="/community?category=announcement">Announcements</Link></li>
              <li><Link to="/community?category=event">Events</Link></li>
              <li><Link to="/community?category=blood">Blood Requests</Link></li>
              <li><Link to="/community?category=volunteer">Volunteer</Link></li>
              <li><Link to="/community?category=lost_found">Lost &amp; Found</Link></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">About</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/help/mosque-admins">For mosque admins</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Use</Link></li>
            </ul>
          </div>
          <div className="col-lg-2">
            <h6 className="fw-semibold mb-3">Contact</h6>
            <ul className="list-unstyled text-white-50 mc-foot-contact">
              <li><MessageSquare size={15} className="me-2" aria-hidden="true" /><a href="/#about">Send us a message</a></li>
              {CONTACT_EMAIL && <li><Mail size={15} className="me-2" aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
              <li><MapPin size={15} className="me-2" aria-hidden="true" />Dhaka, Bangladesh</li>
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
