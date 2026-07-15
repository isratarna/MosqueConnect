# MosqueConnect — Product Requirements Document (PRD)

**Course:** CSE 3100 — Web Application Development with DevOps, AUST
**Group 4 / Section B1**
**Document status:** Living document · Last updated 2026-07-14

---

## 1. Overview

MosqueConnect is a geolocation-based web platform that connects Muslims with the mosques
around them. It centralizes information that is today scattered across word of mouth, posters,
and group chats — accurate Jamat/Jummah times, announcements, events, donation campaigns, and
community support — into a single trustworthy source maintained by verified mosque
administrators.

The application is delivered in **phases** aligned with the course checkpoints. This PRD
describes the full product vision and tracks scope per phase.

## 2. Problem Statement

- Jamat times vary per mosque and change seasonally / during Ramadan, with no reliable place to check them.
- Announcements (Eid prayers, janazah notices, events, donation drives) reach only those physically present or in the right group chat.
- Newcomers to an area cannot easily discover nearby mosques or their facilities.
- Women and parents have no way to know in advance which mosques offer a women's prayer space or a safe children's area.
- Generic map services are not maintained by mosque authorities, so their data cannot be trusted.

## 3. Goals & Objectives

1. A geolocation home-page map showing the user and all nearby mosques sorted by distance, each with its next Jamat time.
2. Family-friendly discovery — filter mosques by women's prayer space and safe children's area.
3. Verified mosque profiles editable only by approved admins → one accurate source of truth.
4. Subscriptions + notifications for prayer-time changes, urgent notices, and events.
5. Community life support — events, donation campaigns, and a hub (volunteering, blood requests, lost & found, complaints).
6. Professional engineering: GitHub PR workflow, automated tests, Docker, CI/CD, documented VPS deployment.

## 4. Target Users & Roles

| Role | Capabilities |
| --- | --- |
| **Visitor** (not logged in) | Browse the map, mosque profiles, and prayer times |
| **Registered User** | Subscribe to mosques, receive notifications, use the community hub, send feedback |
| **Mosque Admin** | Verified representative; manage mosque profile, prayer times, announcements, events |
| **Super Admin** | Approve mosque-admin claims; moderate content platform-wide |

> **Note:** Phase 1 implements the *normal user* experience only (Visitor + Registered User UI).
> Admin roles arrive in later phases with the backend.

## 5. Core Features

| Feature | Description |
| --- | --- |
| Interactive Map | Nearby mosques with Jamat times, sorted by distance |
| Mosque Profile | Prayer times, facilities, photos, contact info |
| Women's Prayer Area filter | Discover mosques with dedicated women's spaces |
| Child Care filter | Discover mosques with supervised children's areas |
| Announcements | Official updates with urgency levels |
| Events | Lectures, classes, community programs |
| Community Hub | Volunteering, blood requests, lost & found, complaints |
| Donations | View mosque donation campaigns and progress |
| Notifications | Prayer-time changes and announcement alerts |
| Ramadan Mode | Sehri, Iftar, Taraweeh schedules |

## 6. User Flow

```
User → Home (interactive map) → Select nearby mosque → Mosque profile
     → Follow mosque → Receive notifications → Community hub / Events / Donations
```
Mosque admins follow a parallel flow: register → claim mosque with proof → approved by
Super Admin → manage prayer times, announcements, and events from a dashboard.

## 7. Technology Stack

| Component | Technology | Notes |
| --- | --- | --- |
| Frontend | **React 18 (Vite)** SPA, react-router, Bootstrap 5 CSS, mobile-first responsive | Phase 1 |
| Backend | Laravel (PHP): **REST API**, Eloquent ORM, role-based policies, queued notifications | Phase 2+ |
| Map | Google Maps JavaScript API (`@react-google-maps/api`) | Requires API key (billing account) |
| Database | MySQL | Phase 2+ |
| Containerization | Docker & Docker Compose (app, Nginx, MySQL, queue worker) | Phase 2+ |
| CI/CD | GitHub Actions (test on PR, deploy on merge) | Phase 4 |
| Hosting | Cloud VPS with a public URL | Phase 4 |

**Architecture decision (updated):** Per course requirement, the frontend is a **React
single-page application** (not Blade templates). This means Laravel is built as a **pure JSON
REST API** and React consumes it over HTTP — a clean SPA + API separation. In Phase 1 the
React app is driven by a single dummy dataset (`src/data/mosques.js`); Phase 2 swaps those
exports for real API calls. A fake auth stub (`AuthContext` + `localStorage`) stands in until
the API's token-based auth lands.

## 8. Phased Delivery Plan

### Phase 1 — React Frontend Prototype ✅ (current)
Frontend-only React SPA, dummy data, no backend.
- **Auth:** Login + Register pages (client-side validation, fake logged-in state via context).
- **Home:** hero, geolocation map, nearest-mosque highlight, support/impact/about-contact.
- **Browse:** search + facility/distance filters + sort, List ⇄ Map toggle.
- **Mosque Profile:** timetable, facilities, announcements (urgency), events, location map.
- **Deliverable:** runnable React app under `frontend/` (`npm run dev`; see `frontend/README.md`).

### Phase 2 — Backend Foundation & Integration (Checkpoint 1)
- Scaffold Laravel as a **REST API**; connect the React SPA to it (replace `src/data/mosques.js` with API calls).
- Migrations & models; real token-based authentication with roles; mosque CRUD API; claim/verification flow.
- Nearby-mosque Haversine query. Docker Compose (API app, Nginx, MySQL). PHPUnit setup + first tests.

### Phase 3 — Community & Admin Features (Checkpoint 2)
- Timetable API (effective dates), announcements with urgency, subscriptions + queued notifications (queue-worker container).
- Community hub backend (volunteers, blood requests, lost & found, complaints), donations, Ramadan mode.
- Mosque Admin dashboard, Super Admin panel (claim approval, moderation), notification center, server-side search/filter.

### Phase 4 — DevOps & Polish (Final)
- GitHub Actions CI/CD (test on PR, deploy on merge); VPS deployment with public URL.
- Seed/demo data, remaining test coverage, README + architecture diagram, UI polish, responsive/cross-browser QA.

## 9. Non-Goals (for now / future enhancements)

- Native mobile apps (Android/iOS)
- Online donation payment integration (Phase 1 links out; real gateway is future work)
- AI-based mosque recommendation
- Bangla/English i18n
- Qibla direction finder

## 10. Success Criteria

- **Phase 1:** All pages render and are navigable; filters/search/sort work over dummy data; map renders with an API key (graceful placeholder without one); responsive on mobile.
- **Overall:** A demoable MVP across the three checkpoints covering the evaluation rubric — relational DB with meaningful relationships, REST API, responsive UI, clean Laravel architecture, Docker, working CI/CD, and a documented public deployment.
