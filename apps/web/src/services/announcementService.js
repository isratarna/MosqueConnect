import { MOSQUES } from "../data/mosques";

export const getAnnouncements = (mosqueId) => {
  if (!mosqueId) return [];

  // Load persisted announcements from localStorage
  const stored = localStorage.getItem(`mosque_announcements_${mosqueId}`);
  let persisted = [];
  if (stored) {
    try {
      persisted = JSON.parse(stored);
    } catch (e) {
      persisted = [];
    }
  }

  // Find initial mock announcements from data
  const mosque = MOSQUES.find((m) => m.id === Number(mosqueId));
  const initialMocks = mosque?.announcements || [];

  // Merge them (persisted items take precedence over initial mocks with the same id)
  const mergedMap = new Map();
  initialMocks.forEach(mock => mergedMap.set(mock.id, mock));
  persisted.forEach(p => mergedMap.set(p.id, p));

  // Sort them by date descending
  return Array.from(mergedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const saveAnnouncements = (mosqueId, announcements) => {
  if (!mosqueId) return;
  localStorage.setItem(`mosque_announcements_${mosqueId}`, JSON.stringify(announcements));
};
