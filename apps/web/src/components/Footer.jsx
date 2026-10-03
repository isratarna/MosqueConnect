import { Link } from "react-router-dom";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAIL } from "../config";
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
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">{t("footer.explore")}</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/">{t("nav.home")}</Link></li>
              <li><Link to="/browse">{t("nav.browse")}</Link></li>
              <li><Link to="/support">{t("nav.support")}</Link></li>
              <li><Link to="/campaigns">{t("nav.campaigns")}</Link></li>
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
              <li><Link to="/community?category=lost_found">{t("footer.lostFound")}</Link></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="fw-semibold mb-3">{t("footer.aboutTitle")}</h6>
            <ul className="list-unstyled mc-foot-links">
              <li><Link to="/about">{t("footer.aboutUs")}</Link></li>
              <li><Link to="/faq">{t("footer.faq")}</Link></li>
              <li><Link to="/help/mosque-admins">{t("footer.forMosqueAdmins")}</Link></li>
              <li><Link to="/privacy">{t("footer.privacy")}</Link></li>
              <li><Link to="/terms">{t("footer.terms")}</Link></li>
            </ul>
          </div>
          <div className="col-lg-2">
            <h6 className="fw-semibold mb-3">{t("footer.contact")}</h6>
            <ul className="list-unstyled text-white-50 mc-foot-contact">
              <li><MessageSquare size={15} className="me-2" aria-hidden="true" /><a href="/#about">{t("footer.sendMessage")}</a></li>
              {CONTACT_EMAIL && <li><Mail size={15} className="me-2" aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
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
