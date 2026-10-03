import { whatsappUrl } from "./mosqueProfile.js";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const PAGE_SIZE = 10;

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 };

/** API record -> the shape the pages use. */
// [Urmee · F6 Part 1] Maps the API record to the names the pages use; "urgent" means high or critical.
export function normalizeBloodRequest(item) {
  return {
    ...item,
    group: item.blood_group,
    hospital: item.hospital_or_location,
    date: item.required_date,
    phone: item.contact_phone,
    details: item.notes,
    urgent: item.urgency === "high" || item.urgency === "critical",
    isOpen: item.status === "active",
  };
}

/** Filters kept in the URL: group, urgent=1, area text, needed-by date. Critical requests sort first. */
// [Urmee · F6 Part 1] Blood group, urgent-only, hospital/area text and needed-by date. Critical
// requests come first, then the soonest date. The API has no server-side filters yet, so this runs in
// the browser.
export function filterBloodRequests(requests, { group = "", urgent = false, area = "", by = "" } = {}) {
  const needle = area.trim().toLowerCase();
  return requests
    .filter((request) => (!group || request.blood_group === group)
      && (!urgent || request.urgent)
      && (!needle || String(request.hospital_or_location || "").toLowerCase().includes(needle))
      && (!by || String(request.required_date) <= by))
    .sort((a, b) => (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9)
      || String(a.required_date).localeCompare(String(b.required_date)) || b.id - a.id);
}

/** wa.me link with a ready-made message; opens WhatsApp's own contact picker. */
// [Urmee · F6 Part 1] Blood requests mostly spread over WhatsApp in Bangladesh: wa.me/?text= opens
// WhatsApp's own contact picker with a ready-made message and the link.
export function shareOnWhatsAppUrl(request, link) {
  const text = [
    `🩸 ${request.urgent ? "URGENT: " : ""}${request.blood_group} blood needed`,
    `${request.units || 1} bag(s) at ${request.hospital_or_location} by ${request.required_date}.`,
    `Details and how to help: ${link}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** tel: href for a contact number, spaces removed. */
// [Urmee · F6 Part 1] Makes numbers tappable (tel:). Only the request's contact_phone is ever passed
// in, never the requester's account phone.
export const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

/** WhatsApp chat link with a Bangladeshi number, or null when it isn't one. */
export const whatsappChatUrl = (phone) => whatsappUrl(phone);
