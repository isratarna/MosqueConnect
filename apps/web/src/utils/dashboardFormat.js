/** Dashboard sections, in sidebar order. `?section=` must be one of these ids. */
export const DASHBOARD_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "insights", label: "Insights" },
  { id: "announcements", label: "Announcements" },
  { id: "prayer", label: "Prayer & Jamat" },
  { id: "jummah", label: "Jummah" },
  { id: "eid", label: "Eid Jamaat" },
  { id: "events", label: "Events" },
  { id: "donations", label: "Donation Campaigns" },
  { id: "volunteers", label: "Volunteer Work" },
  { id: "profile", label: "Mosque Profile" },
  { id: "facilities", label: "Facilities" },
  { id: "corrections", label: "Suggested corrections" },
  { id: "team", label: "Team" },
];

/** Old section names that links may still use. */
const SECTION_ALIASES = { announce: "announcements" };

export function dashboardSection(value) {
  const id = SECTION_ALIASES[value] || value;
  return DASHBOARD_SECTIONS.some((section) => section.id === id) ? id : "overview";
}

/** Quick-post templates. `{mosque}` is replaced with the mosque's name. */
export const ANNOUNCEMENT_TEMPLATES = [
  {
    id: "janazah",
    label: "Janazah notice",
    title: "Janazah notice",
    urgency: "high",
    body: "Inna lillahi wa inna ilayhi raji'un. The janazah of [name] will be held at {mosque} after [prayer] today. Please join and make dua for the deceased.",
  },
  {
    id: "jummah-change",
    label: "Jummah time change",
    title: "Jummah time change",
    urgency: "medium",
    body: "From this Friday, the Jummah khutbah at {mosque} starts at [time] and the jamaat is at [time]. Please arrive early.",
  },
  {
    id: "eid-schedule",
    label: "Eid jamaat schedule",
    title: "Eid jamaat schedule",
    urgency: "medium",
    body: "Eid jamaats at {mosque}: first jamaat at [time], second jamaat at [time]. Please bring a prayer mat and come early.",
  },
  {
    id: "goods-needed",
    label: "Goods needed",
    title: "Goods needed",
    urgency: "low",
    body: "{mosque} needs [items] for [purpose]. Please drop donations at the mosque office after any prayer. Jazakallah khair.",
  },
];

export function applyTemplate(templateId, mosqueName = "our mosque") {
  const template = ANNOUNCEMENT_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  return { title: template.title, urgency: template.urgency, body: template.body.replaceAll("{mosque}", mosqueName || "our mosque") };
}

/** A round axis maximum at or above the largest value (1, 2, 5 × 10ⁿ steps). */
export function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => factor * magnitude >= value);
  return step * magnitude;
}

/**
 * Plot points for a series inside a width × height box. Values share one
 * y-scale from 0 to `max`, so several series can be drawn on the same axis.
 */
export function plotPoints(values, { width, height, max = Math.max(...values, 0), padding = 0 } = {}) {
  const top = max > 0 ? max : 1;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: Math.round((values.length > 1 ? index * step : width / 2) * 100) / 100,
    y: Math.round((padding + innerHeight - (Math.max(0, value) / top) * innerHeight) * 100) / 100,
  }));
}

export function pointsToPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

export function percent(value) {
  return value === null || value === undefined ? "–" : `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

export function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
