import { apiRequest } from "./api.js";

// Dated schedule periods ("Winter timetable", "Ramadan 1448") and Ramadan timings.

/** Today's Ramadan timings for a mosque, or null when it isn't in a Ramadan period (the API answers 404). */
// [Urmee · VIVA] Public API: mosque er aajker Ramadan time. Ramadan period na hole API 404 dey, tokhon null return kori (error na) -- tai card kichu dekhay na.
export async function fetchRamadan(mosqueId, options) {
  try {
    const { data } = await apiRequest(`/api/mosques/${mosqueId}/ramadan`, options);
    return data;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// [Urmee · VIVA] Admin API er common path. Niche shob function (period list/create/update/delete, prayer times, ramadan timings) eta use kore.
const base = (mosqueId) => `/api/admin/mosques/${mosqueId}/schedule-periods`;

export const fetchSchedulePeriods = (mosqueId, options) => apiRequest(base(mosqueId), options).then((r) => r.data);
export const createSchedulePeriod = (mosqueId, body) => apiRequest(base(mosqueId), { method: "POST", body }).then((r) => r.data);
export const updateSchedulePeriod = (mosqueId, periodId, body) => apiRequest(`${base(mosqueId)}/${periodId}`, { method: "PUT", body }).then((r) => r.data);
export const deleteSchedulePeriod = (mosqueId, periodId) => apiRequest(`${base(mosqueId)}/${periodId}`, { method: "DELETE" });
export const savePeriodPrayerTimes = (mosqueId, periodId, prayerSchedule) => apiRequest(`${base(mosqueId)}/${periodId}/prayer-times`, { method: "PUT", body: { prayer_schedule: prayerSchedule } }).then((r) => r.data);
export const saveRamadanTimings = (mosqueId, periodId, rows) => apiRequest(`${base(mosqueId)}/${periodId}/ramadan-timings`, { method: "PUT", body: { ramadan_timings: rows } }).then((r) => r.data);
