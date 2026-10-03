import { useTranslation } from "react-i18next";
import { FACILITY_META } from "../data/mosques";
import FacilityIcon from "./FacilityIcon";

export default function FacilityBadge({ facilityKey }) {
  const { t } = useTranslation();
  const meta = FACILITY_META[facilityKey];
  if (!meta) return null;
  return (
    <span className="badge mc-badge me-1 mb-1">
      <FacilityIcon facilityKey={facilityKey} size={13} className="me-1" />
      {t(meta.labelKey)}
    </span>
  );
}
