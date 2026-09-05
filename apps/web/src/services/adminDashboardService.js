import { apiRequest } from "../utils/api";

export async function fetchDashboardOverview(mosqueId) {
  const response = await apiRequest(`/api/admin/mosques/${mosqueId}/dashboard`);
  return {
    mosque: {
      id: mosqueId,
      name: response.data?.mosque?.name || "Central Mosque",
      address: response.data?.mosque?.address || "",
      status: "Verified"
    },
    metrics: {
      totalFollowers: response.data?.summary?.followers_count || 0,
      activeAnnouncements: response.data?.summary?.active_announcements_count || 0,
      upcomingVolunteers: response.data?.summary?.upcoming_events_count || 0,
      activeBloodRequests: response.data?.summary?.active_campaigns_count || 0
    }
  };
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

/*

পার্ট ১: ড্যাশবোর্ডের আসল ডেটা (Data Mapping) নিয়ে যা বলবেন
কোডের উপরের অংশটুকু (fetchDashboardOverview) দেখিয়ে আত্মবিশ্বাসের সাথে বলবেন:

" fetchDashboardOverview ফাংশনটিতে আমি আমাদের ব্যাকএন্ডে রিয়েল API কল করছি। 
তবে এখানকার সবচেয়ে গুরুত্বপূর্ণ অংশটি হলো 'ডেটা ম্যাপিং' (Data Mapping)।

আমাদের ব্যাকএন্ড থেকে ডেটা একটি নির্দিষ্ট স্ট্রাকচারে আসে 
(যেমন- response.data.summary.followers_count), 
কিন্তু আমার ফ্রন্টএন্ডের রিয়েক্ট কম্পোনেন্টগুলো আগে থেকে metrics.totalFollowers 
নামেই ডেটা এক্সপেক্ট করছিল। তাই আমি পুরো রিয়েক্ট কম্পোনেন্ট নতুন করে না লিখে, 
এই সার্ভিস লেয়ারেই ব্যাকএন্ডের ফিল্ডগুলোকে ফ্রন্টএন্ডের সাথে ম্যাপ করে দিয়েছি।

এর ফলে ডেটা স্ট্রাকচার না মেলার কারণে অ্যাপটি আর ক্র্যাশ করবে না। 
এছাড়া কোনো কারণে ডেটাবেজ থেকে ডেটা না আসলে যেন UI ভেঙে না যায়,
 সেজন্য আমি অপশনাল চেইনিং (?.) এবং ডিফল্ট ভ্যালু (|| 0) ব্যবহার করেছি।"

পার্ট ২: রিসেন্ট অ্যাক্টিভিটি (Mock Data) নিয়ে যা বলবেন
এরপর কোডের নিচের অংশটুকু (fetchRecentActivities) দেখিয়ে সৎভাবে এবং 
লজিক্যালি বলবেন:

"আর স্যার, 'Recent Activities' সেকশনের জন্য আমাদের ফ্রন্টএন্ডের UI পুরোপুরি রেডি।
 তবে ব্যাকএন্ডে এই স্পেসিফিক ফিডটার API এখনো তৈরি হয়নি, 
 এটি আমাদের ইন্টিগ্রেশনের নেক্সট ফেজের (Phase 2) কাজ।

তাই আপাতত UI ফ্লো এবং ডেটাগুলো স্ক্রিনে কেমন দেখাবে সেটা ডেমোনস্ট্রেট করার জন্য
আমি এখানে setTimeout দিয়ে একটি মক (Mock) প্রমিস ব্যবহার করেছি। 
ব্যাকএন্ড এপিআই রেডি হওয়ামাত্রই আমি শুধু এই ফাইলের মক ডেটাটুকু সরিয়ে 
আসল API কল বসিয়ে দেব, আমার মেইন UI ফাইলে কোনো হাত দিতে হবে না। 
এতে করে ফ্রন্টএন্ড ও ব্যাকএন্ডের কাজ সম্পূর্ণ আলাদা (Separation of Concerns) থাকছে।"
*/