/*
 * MosqueConnect — Dummy dataset (Phase 1)
 *
 * In later phases this file is replaced by calls to the Laravel REST API.
 * For now every page reads from these in-memory arrays so the UI is fully
 * demonstrable without a backend.
 */

export const FACILITY_META = {
  women_area:  { label: "Women's Prayer Area" },
  child_care:  { label: "Child Care" },
  wudu:        { label: "Wudu Facility" },
  parking:     { label: "Parking" },
  ac:          { label: "Air Conditioned" },
  wheelchair:  { label: "Wheelchair Access" },
  quran_class: { label: "Quran Classes" },
  library:     { label: "Library" },
};

const MOSQUE_IMAGES = [
  "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1564121211835-e88c852648ab?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1590075865003-e48277faa558?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&crop=top&w=900&q=80",
  "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&crop=top&w=900&q=80",
];

export const MOSQUES = [
  {
    id: 1,
    name: "Baitul Mukarram National Mosque",
    address: "Baitul Mukarram, Purana Paltan, Dhaka",
    district: "Dhaka",
    area: "Purana Paltan",
    lat: 23.7301, lng: 90.4125,
    photo: MOSQUE_IMAGES[0],
    rating: 4.9,
    phone: "+880 2 9556666",
    facilities: ["women_area", "wudu", "parking", "ac", "wheelchair", "library"],
    prayer: { Fajr: "4:55", Dhuhr: "1:30", Asr: "5:00", Maghrib: "6:52", Isha: "8:15", Jummah: "1:15" },
    announcements: [
      { title: "Eid-ul-Adha Jamat Schedule", body: "First Jamat at 7:00 AM, second at 8:00 AM.", urgency: "high", date: "2026-07-10" },
      { title: "Roof renovation this week", body: "Upper floor closed Wed–Thu for maintenance.", urgency: "medium", date: "2026-07-08" },
    ],
    events: [
      { title: "Weekly Tafsir Class", when: "Every Friday, 9:30 AM", desc: "Tafsir of Surah Al-Baqarah by the head Imam." },
    ],
  },
  {
    id: 2,
    name: "Gulshan Central Mosque",
    address: "Gulshan Avenue, Gulshan 1, Dhaka",
    district: "Dhaka",
    area: "Gulshan",
    lat: 23.7808, lng: 90.4177,
    photo: MOSQUE_IMAGES[1],
    rating: 4.7,
    phone: "+880 1711 000002",
    facilities: ["women_area", "child_care", "wudu", "parking", "ac", "quran_class"],
    prayer: { Fajr: "4:58", Dhuhr: "1:30", Asr: "5:05", Maghrib: "6:52", Isha: "8:15", Jummah: "1:20" },
    announcements: [
      { title: "New women's prayer floor open", body: "A dedicated 2nd-floor space is now available.", urgency: "low", date: "2026-07-09" },
    ],
    events: [
      { title: "Kids' Quran Camp", when: "Sat–Sun, 4:00 PM", desc: "Supervised Quran learning for ages 6–12." },
    ],
  },
  {
    id: 3,
    name: "Dhanmondi Jame Masjid",
    address: "Road 8, Dhanmondi, Dhaka",
    district: "Dhaka",
    area: "Dhanmondi",
    lat: 23.7461, lng: 90.3742,
    photo: MOSQUE_IMAGES[2],
    rating: 4.6,
    phone: "+880 1711 000003",
    facilities: ["wudu", "parking", "ac", "library"],
    prayer: { Fajr: "4:56", Dhuhr: "1:30", Asr: "5:02", Maghrib: "6:52", Isha: "8:15", Jummah: "1:15" },
    announcements: [
      { title: "Janazah after Asr", body: "Janazah prayer for a community member after Asr today.", urgency: "high", date: "2026-07-14" },
    ],
    events: [],
  },
  {
    id: 4,
    name: "Uttara Sector 7 Mosque",
    address: "Sector 7, Uttara, Dhaka",
    district: "Dhaka",
    area: "Uttara",
    lat: 23.8697, lng: 90.3990,
    photo: MOSQUE_IMAGES[3],
    rating: 4.5,
    phone: "+880 1711 000004",
    facilities: ["women_area", "child_care", "wudu", "parking", "wheelchair"],
    prayer: { Fajr: "4:57", Dhuhr: "1:32", Asr: "5:04", Maghrib: "6:54", Isha: "8:17", Jummah: "1:30" },
    announcements: [],
    events: [
      { title: "Community Iftar Planning", when: "Next Ramadan", desc: "Volunteers needed to organise daily iftar." },
    ],
  },
  {
    id: 5,
    name: "Mirpur DOHS Jame Masjid",
    address: "Mirpur DOHS, Dhaka",
    district: "Dhaka",
    area: "Mirpur",
    lat: 23.8223, lng: 90.3654,
    photo: MOSQUE_IMAGES[4],
    rating: 4.4,
    phone: "+880 1711 000005",
    facilities: ["women_area", "wudu", "parking", "ac", "quran_class", "library"],
    prayer: { Fajr: "4:59", Dhuhr: "1:31", Asr: "5:03", Maghrib: "6:53", Isha: "8:16", Jummah: "1:20" },
    announcements: [
      { title: "Donation drive for flood relief", body: "Collecting funds and goods after Jummah.", urgency: "medium", date: "2026-07-11" },
    ],
    events: [],
  },
  {
    id: 6,
    name: "Banani Bidyaniketan Mosque",
    address: "Road 11, Banani, Dhaka",
    district: "Dhaka",
    area: "Banani",
    lat: 23.7936, lng: 90.4066,
    photo: MOSQUE_IMAGES[5],
    rating: 4.3,
    phone: "+880 1711 000006",
    facilities: ["wudu", "ac", "wheelchair"],
    prayer: { Fajr: "4:58", Dhuhr: "1:30", Asr: "5:02", Maghrib: "6:52", Isha: "8:15", Jummah: "1:15" },
    announcements: [],
    events: [],
  },
  {
    id: 7,
    name: "Mohammadpur Bihari Camp Mosque",
    address: "Mohammadpur, Dhaka",
    district: "Dhaka",
    area: "Mohammadpur",
    lat: 23.7583, lng: 90.3597,
    photo: MOSQUE_IMAGES[6],
    rating: 4.2,
    phone: "+880 1711 000007",
    facilities: ["women_area", "child_care", "wudu"],
    prayer: { Fajr: "4:56", Dhuhr: "1:29", Asr: "5:01", Maghrib: "6:51", Isha: "8:14", Jummah: "1:20" },
    announcements: [
      { title: "Free Quran class for children", body: "New batch starts Saturday; register at the office.", urgency: "low", date: "2026-07-07" },
    ],
    events: [
      { title: "Blood Donation Camp", when: "Fri, 10:00 AM", desc: "In partnership with a local hospital." },
    ],
  },
  {
    id: 8,
    name: "Bashundhara Riverview Mosque",
    address: "Bashundhara R/A, Dhaka",
    district: "Dhaka",
    area: "Bashundhara",
    lat: 23.8103, lng: 90.4370,
    photo: MOSQUE_IMAGES[7],
    rating: 4.8,
    phone: "+880 1711 000008",
    facilities: ["women_area", "child_care", "wudu", "parking", "ac", "wheelchair", "quran_class", "library"],
    prayer: { Fajr: "4:58", Dhuhr: "1:31", Asr: "5:03", Maghrib: "6:53", Isha: "8:16", Jummah: "1:30" },
    announcements: [
      { title: "New AC system installed", body: "Main hall is now fully air conditioned.", urgency: "low", date: "2026-07-05" },
    ],
    events: [],
  },
  {
    id: 9,
    name: "Motijheel Ideal Mosque",
    address: "Motijheel C/A, Dhaka",
    district: "Dhaka",
    area: "Motijheel",
    lat: 23.7270, lng: 90.4180,
    photo: MOSQUE_IMAGES[8],
    rating: 4.1,
    phone: "+880 1711 000009",
    facilities: ["wudu", "parking"],
    prayer: { Fajr: "4:55", Dhuhr: "1:30", Asr: "5:00", Maghrib: "6:52", Isha: "8:15", Jummah: "1:15" },
    announcements: [],
    events: [],
  },
  {
    id: 10,
    name: "Old Dhaka Chawkbazar Shahi Mosque",
    address: "Chawkbazar, Old Dhaka",
    district: "Dhaka",
    area: "Chawkbazar",
    lat: 23.7139, lng: 90.3960,
    photo: MOSQUE_IMAGES[9],
    rating: 4.6,
    phone: "+880 1711 000010",
    facilities: ["wudu", "library", "quran_class"],
    prayer: { Fajr: "4:54", Dhuhr: "1:29", Asr: "5:00", Maghrib: "6:51", Isha: "8:14", Jummah: "1:10" },
    announcements: [
      { title: "Historic minaret guided tour", body: "Open to visitors after Asr on weekends.", urgency: "low", date: "2026-07-03" },
    ],
    events: [
      { title: "Heritage Talk", when: "Sat, 5:30 PM", desc: "History of Mughal-era mosques in Dhaka." },
    ],
  },
];

export const IMPACT_STATS = [
  { value: "120+",  label: "Mosques Connected" },
  { value: "8,400", label: "Community Members" },
  { value: "৳2.1M", label: "Donations Facilitated" },
  { value: "560",   label: "Active Volunteers" },
];

/* ---------- helpers ---------- */

// Haversine distance in km between two {lat,lng} points.
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Returns a copy of MOSQUES with a `.distance` (km) added, sorted nearest-first.
export function mosquesByDistance(origin) {
  return MOSQUES.map((m) => ({
    ...m,
    distance: +distanceKm(origin, { lat: m.lat, lng: m.lng }).toFixed(1),
  })).sort((a, b) => a.distance - b.distance);
}

export function getMosque(id) {
  return MOSQUES.find((m) => m.id === Number(id));
}

export function directionsUrl(mosque) {
  return `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`;
}

export function urgencyClass(level) {
  return { high: "danger", medium: "warning", low: "success" }[level] || "secondary";
}
