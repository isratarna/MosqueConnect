import { FACILITY_META } from "../data/mosques";

export default function FacilityBadge({ facilityKey }) {
  const meta = FACILITY_META[facilityKey];
  if (!meta) return null;
  return (
    <span className="badge mc-badge me-1 mb-1">
      <i className={`bi ${meta.icon} me-1`} />
      {meta.label}
    </span>
  );
}
