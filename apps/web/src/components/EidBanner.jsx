import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Moon } from "lucide-react";
import { fetchEidSeason } from "../utils/eidApi";
import { formatEidDate } from "./eid/EidJamaatCard";

// Announces the Eid jamaat page on Home while the Eid season is showing.
export default function EidBanner() {
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
          <strong>{season.label} {season.year}</strong> is expected on {formatEidDate(season.expected_date)}.
          Find Eid jamaat times near you.
        </span>
        <Link to="/eid" className="btn btn-sm btn-light ms-auto">
          Eid jamaat near me <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
