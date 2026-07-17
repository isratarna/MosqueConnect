import { FACILITY_META } from "../data/mosques";
import FacilityIcon from "./FacilityIcon";

export default function FacilityBadge({ facilityKey }) {
  const meta = FACILITY_META[facilityKey];
  if (!meta) return null;
  return (
    <span className="badge mc-badge me-1 mb-1">
      <FacilityIcon facilityKey={facilityKey} size={13} className="me-1" />
      {meta.label}
    </span>
  );
}
