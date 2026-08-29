// TODO: Connect to backend API when Member 3 is ready
// This is a mock API service layer using localStorage.

const STORAGE_KEY_PREFIX = "mock_prayer_schedule_";

export async function fetchPrayerSchedule(mosqueId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${mosqueId}`);
        if (data) {
          resolve(JSON.parse(data));
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error("Failed to parse mock prayer schedule", error);
        resolve(null);
      }
    }, 600); // Simulate network delay
  });
}

export async function updatePrayerSchedule(mosqueId, scheduleData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${mosqueId}`, JSON.stringify(scheduleData));
        resolve({ success: true });
      } catch (error) {
        console.error("Failed to save mock prayer schedule", error);
        reject(new Error("Failed to save schedule."));
      }
    }, 800); // Simulate network delay
  });
}
