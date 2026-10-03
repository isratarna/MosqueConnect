import { Link } from "react-router-dom";
import { Camera, Globe2, Mail, MapPin, Phone, Play, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "../assets/Logo.png";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mc-footer text-light pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <img src={logo} alt={t("common.logoAlt")} className="mc-footer-logo" />
              Mosque<span className="mc-brand-accent">Connect</span>
            </h5>
            <p className="text-white-50 mb-3">{t("footer.tagline")}</p>
            <div className="d-flex gap-2">
              <a href="#" className="mc-social" aria-label="Facebook"><Globe2 size={17} aria-hidden="true" /></a>
              <a href="#" className="mc-social" aria-label="Twitter"><Send size={17} aria-hidden="true" /></a>
              <a href="#" className="mc-social" aria-label="Instagram"><Camera size={17} aria-hidden="true" /></a>
              <a href="#" className="mc-social" aria-label="YouTube"><Play size={17} aria-hidden="true" /></a>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">{t("footer.explore")}</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/">{t("nav.home")}</Link></li>
              <li><Link to="/browse">{t("nav.browse")}</Link></li>
              <li><Link to="/support">{t("nav.support")}</Link></li>
              <li><a href="/#impact">{t("footer.ourImpact")}</a></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">{t("footer.community")}</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/community">{t("footer.communityHub")}</Link></li>
              <li><Link to="/community?category=announcement">{t("footer.announcements")}</Link></li>
              <li><Link to="/community?category=event">{t("footer.events")}</Link></li>
              <li><Link to="/community?category=blood">{t("footer.bloodRequests")}</Link></li>
              <li><Link to="/community?category=volunteer">{t("footer.volunteer")}</Link></li>
            </ul>
          </div>
          <div className="col-lg-4">
            <h6 className="fw-semibold mb-3">{t("footer.contact")}</h6>
            <ul className="list-unstyled text-white-50 mc-foot-contact">
              <li><Mail size={15} className="me-2" aria-hidden="true" />hello@mosqueconnect.example</li>
              <li><Phone size={15} className="me-2" aria-hidden="true" />+880 1700 000000</li>
              <li><MapPin size={15} className="me-2" aria-hidden="true" />{t("footer.location")}</li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary my-4" />
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <small className="text-white-50">{t("footer.copyright")}</small>
          <small className="text-white-50">{t("footer.builtWith")}</small>
        </div>
      </div>
    </footer>
  );
}
