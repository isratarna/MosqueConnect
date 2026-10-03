// [Urmee · F9] Pure helpers for the announcement editor: Dhaka-time conversion, the visible state of an
// announcement (draft / scheduled / published / expired), the janazah template and the request body.

export const ANNOUNCEMENT_CATEGORIES = ["general", "janazah", "jumuah", "eid", "ramadan", "donation_request", "event", "other"];

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is UTC+6 all year (no daylight saving)

/**
 * [Urmee · F9] API timestamp (ISO, UTC) → value for <input type="datetime-local">, shown in Dhaka time
 * ("2026-10-05T00:00:00Z" → "2026-10-05T06:00"). Empty string for no value.
 */
export function toDhakaInput(iso) {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  return new Date(time + DHAKA_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * [Urmee · F9] datetime-local value (what the admin typed, in Dhaka time) → timestamp with the +06:00
 * offset, so the API stores the right moment whatever the admin's own computer clock says. "" → null.
 */
export function fromDhakaInput(value) {
  return value ? `${value}:00+06:00` : null;
}

/** [Urmee · F9] "Fri, 6:00 AM" in Dhaka time, for the "Scheduled for …" chip. */
export function formatDhaka(iso, locale = "en") {
  return new Intl.DateTimeFormat(locale, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(iso));
}

/**
 * [Urmee · F9] What an admin sees on the chip: the API only has draft/scheduled/published, so "expired"
 * is derived from expires_at (the API also sends is_expired, used when present).
 */
export function announcementState(item, now = Date.now()) {
  const expired = item.is_expired === true || (item.expires_at && new Date(item.expires_at).getTime() <= now);
  if (item.status === "published" && expired) return "expired";
  if (item.status === "scheduled") return "scheduled";
  return item.status === "published" ? "published" : "draft";
}

/**
 * [Urmee · F9] Janazah template: builds the notice text from the deceased's name, the janazah time and
 * the place. Blank fields keep a [placeholder] so the admin sees what is still missing.
 */
export function janazahBody({ name, time, place }, mosqueName = "") {
  const where = place?.trim() || mosqueName || "[place]";
  return `Inna lillahi wa inna ilayhi raji'un. The janazah of ${name?.trim() || "[name]"} will be held at ${where}, ${time?.trim() || "[time]"}. Please join and make dua for the deceased.`;
}

/**
 * [Urmee · F9] Request body for create / update. Always FormData so an image can ride along; nullable
 * dates are sent as empty strings (Laravel turns "" into null), which also clears a removed expiry.
 */
export function buildAnnouncementFormData(form, { image } = {}) {
  const data = new FormData();
  data.append("title", form.title.trim());
  data.append("body", form.body.trim());
  data.append("category", form.category);
  data.append("urgency", form.urgency);
  data.append("is_pinned", form.is_pinned ? "1" : "0");
  const scheduled = form.mode === "schedule" && form.publish_at;
  data.append("status", form.mode === "draft" ? "draft" : "published");
  data.append("publish_at", scheduled ? fromDhakaInput(form.publish_at) : "");
  data.append("expires_at", form.expires_at ? fromDhakaInput(form.expires_at) : "");
  if (image) data.append("image", image);
  return data;
}

/** [Urmee · F9] Editor state from an existing announcement (editing) or a blank one (new). */
export function formFromAnnouncement(item) {
  if (!item) return { title: "", body: "", category: "general", urgency: "low", is_pinned: false, mode: "now", publish_at: "", expires_at: "" };
  return {
    title: item.title || "",
    body: item.body || "",
    category: item.category || "general",
    urgency: item.urgency || "low",
    is_pinned: Boolean(item.is_pinned),
    mode: item.status === "draft" ? "draft" : item.status === "scheduled" ? "schedule" : "now",
    publish_at: item.status === "scheduled" ? toDhakaInput(item.publish_at) : "",
    expires_at: toDhakaInput(item.expires_at),
  };
}
