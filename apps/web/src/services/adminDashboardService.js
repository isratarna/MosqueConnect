// TODO: Connect to Member 3's backend API endpoint
// This is a mock API service layer

export async function fetchDashboardOverview(mosqueId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        mosque: {
          id: mosqueId,
          name: "Central Mosque",
          address: "123 Main St, Dhaka",
          status: "Verified",
        },
        metrics: {
          totalFollowers: 240,
          activeAnnouncements: 3,
          upcomingVolunteers: 12,
          activeBloodRequests: 2,
        },
      });
    }, 600); // Simulate network delay
  });
}

export async function fetchRecentActivities(mosqueId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          type: "announcement",
          title: "New Announcement Published",
          description: "Jummah prayer time updated for winter schedule.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
          id: 2,
          type: "volunteer",
          title: "New Volunteer Signup",
          description: "Ahmed agreed to help with parking on Friday.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
        {
          id: 3,
          type: "blood_donation",
          title: "Blood Request Fulfilled",
          description: "O+ blood request was successfully matched.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        },
        {
          id: 4,
          type: "donation",
          title: "Donation Received",
          description: "Received ৳5,000 for the Orphanage Fund.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        },
      ]);
    }, 800); // Simulate network delay
  });
}
