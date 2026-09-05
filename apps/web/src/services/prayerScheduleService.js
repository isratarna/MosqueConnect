import { apiRequest } from "../utils/api";

const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
export async function fetchPrayerSchedule(mosqueId) {
  const { data } = await apiRequest(`/api/admin/mosques/${mosqueId}/prayer-schedule`);
  const schedule = Object.fromEntries(prayers.map((label) => {
    const entry = data.prayer_schedule.find((item) => item.prayer === label.toLowerCase());
    return [label, { adhan: entry?.adhan_time || "", iqamah: entry?.jamaat_time || "" }];
  }));
  const jummah = data.jumuah_sessions.find((entry) => entry.sequence === 1);
  schedule.Jummah = { adhan: jummah?.khutbah_time || "", iqamah: jummah?.jamaat_time || "" };
  schedule.jumuahSessions = data.jumuah_sessions;
  return schedule;
}

export async function updatePrayerSchedule(mosqueId, schedule) {
  const existing = schedule.jumuahSessions?.find((entry) => entry.sequence === 1);
  return apiRequest(`/api/admin/mosques/${mosqueId}/prayer-schedule`, { method: "PUT", body: {
    prayer_schedule: prayers.map((label) => ({ prayer: label.toLowerCase(), adhan_time: schedule[label].adhan, jamaat_time: schedule[label].iqamah })),
    jumuah_sessions: [{ sequence: 1, label: existing?.label || "First Jumuah", khutbah_time: schedule.Jummah.adhan || null, jamaat_time: schedule.Jummah.iqamah, notes: existing?.notes || null }],
  } });
}
