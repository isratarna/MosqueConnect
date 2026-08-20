export function getEventMosqueName(event) {
  return event?.mosque?.name || "Mosque to be announced";
}

export function parseEventDate(value) {
  if (!value || typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventDate(value, options = {}) {
  const date = parseEventDate(value);
  if (!date) return value || "Date to be announced";

  return new Intl.DateTimeFormat(undefined, {
    weekday: options.compact ? undefined : "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEventTime(value) {
  if (!value || typeof value !== "string") return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;

  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatEventTimeRange(event) {
  return [formatEventTime(event?.start_time), formatEventTime(event?.end_time)]
    .filter(Boolean)
    .join(" – ") || "Time to be announced";
}

export function isEventPast(event, now = new Date()) {
  const date = parseEventDate(event?.event_date);
  if (!date) return false;

  const comparison = new Date(now);
  const time = event.end_time;
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isInteger(hours) && Number.isInteger(minutes)) {
      date.setHours(hours, minutes, 0, 0);
      return date < comparison;
    }
  }

  date.setHours(23, 59, 59, 999);
  return date < comparison;
}

export function getEventDisplayStatus(event, now = new Date()) {
  if (event?.status === "cancelled" || event?.status === "completed") return event.status;
  if (isEventPast(event, now)) return "past";
  return event?.status || "published";
}

export function filterEvents(events, filters = {}, now = new Date()) {
  const normalizedSearch = filters.search?.trim().toLowerCase() || "";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return events.filter((event) => {
    const eventDate = parseEventDate(event.event_date);
    const mosqueName = getEventMosqueName(event);
    const searchable = [event.title, mosqueName, event.category, event.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
    const matchesMosque = !filters.mosque || mosqueName === filters.mosque;
    const matchesLocation = !filters.location
      || event.location?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesCategory = !filters.category || event.category === filters.category;
    const matchesUpcoming = !filters.upcomingOnly || !isEventPast(event, now);

    let matchesDate = true;
    if (filters.dateGroup === "today") matchesDate = Boolean(eventDate && eventDate.getTime() === today.getTime());
    if (filters.dateGroup === "this-week") matchesDate = Boolean(eventDate && eventDate >= today && eventDate <= weekEnd);
    if (filters.dateGroup === "upcoming") matchesDate = !isEventPast(event, now);

    return matchesSearch
      && matchesMosque
      && matchesLocation
      && matchesCategory
      && matchesUpcoming
      && matchesDate;
  });
}
