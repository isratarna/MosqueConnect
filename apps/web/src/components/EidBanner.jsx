import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Moon } from "lucide-react";
import { eidNameT, fetchEidSeason } from "../utils/eidApi";
import { useLocale } from "../hooks/useLocale";
import { formatEidDate } from "./eid/EidJamaatCard";

// Announces the Eid jamaat page on Home while the Eid season is showing.
export default function EidBanner() {
  const { t, locale } = useLocale();
  const [season, setSeason] = useState(null);

  useEffect(() => {
    let active = true;
    fetchEidSeason()
      .then((result) => { if (active) setSeason(result); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!season?.active) return null;

  return (
    <div className="mc-eid-banner">
      <div className="container d-flex align-items-center gap-3 flex-wrap">
        <Moon size={20} aria-hidden="true" />
        <span>
          {t("eid.bannerText", { label: eidNameT(t, season.eid, season.label), year: season.year, date: formatEidDate(season.expected_date, locale) })}
        </span>
        <Link to="/eid" className="btn btn-sm btn-light ms-auto">
          {t("eid.bannerCta")} <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
