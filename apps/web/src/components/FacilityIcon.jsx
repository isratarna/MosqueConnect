import {
  Accessibility,
  AirVent,
  Baby,
  BookOpen,
  Droplets,
  LibraryBig,
  ParkingSquare,
  UsersRound,
} from "lucide-react";

const FACILITY_ICONS = {
  women_area: UsersRound,
  child_care: Baby,
  wudu: Droplets,
  parking: ParkingSquare,
  ac: AirVent,
  wheelchair: Accessibility,
  quran_class: BookOpen,
  library: LibraryBig,
};

export default function FacilityIcon({ facilityKey, size = 14, ...props }) {
  const Icon = FACILITY_ICONS[facilityKey] || BookOpen;
  return <Icon size={size} aria-hidden="true" {...props} />;
}