# MosqueConnect — Phase 1 (React Frontend)

A geolocation-based mosque & community engagement platform.
This folder is **Phase 1**: a frontend-only prototype built with **React (Vite) +
Bootstrap 5 + Google Maps**, driven entirely by dummy data. No backend yet — later phases
add a **Laravel REST API** that this React SPA will consume.

## Tech stack

- **React 18** (Vite build tool)
- **react-router-dom** for client-side routing
- **Bootstrap 5** (CSS) + **Bootstrap Icons** for styling
- **@react-google-maps/api** for the interactive map

## Pages / routes

| Route | Page | Highlights |
| --- | --- | --- |
| `/` | Home | Hero, nearby-mosque map, nearest-mosque highlight, support/impact/about |
| `/browse` | Browse | Search + facility/distance filters + sort, **List ⇄ Map** toggle |
| `/mosque/:id` | Mosque Profile | Timetable, facilities, announcements, events, location map |
| `/login`, `/register` | Auth | Client-side validation + fake logged-in state |

## Running it

Requires **Node.js 18+**.

```bash
cd frontend
npm install       # first time only
npm run dev       # starts Vite dev server (http://localhost:5173)
```

Other scripts:
```bash
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Enabling the map

The UI works immediately — map areas show a placeholder until you add a key.

1. Get a **Maps JavaScript API** key from the [Google Cloud Console](https://console.cloud.google.com/)
   (enable "Maps JavaScript API"; a billing account is required by Google).
2. Copy `.env.example` to `.env` and paste your key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy....
   ```
3. Restart `npm run dev` — real maps with mosque markers and your location appear.

## Demo login

Auth is a client-side stub (no backend yet). Use the hardcoded demo account:

- **Email:** `hello123@gmail.com`
- **Password:** `hello1234`

Registration accepts any valid input and signs you in. Session is kept in `localStorage`.
Real, secure auth with roles arrives in Phase 2.

## Project structure

```
frontend/
├── index.html                 Vite entry (mounts #root)
├── package.json · vite.config.js · .env.example
└── src/
    ├── main.jsx               app bootstrap (router + Bootstrap CSS + AuthProvider)
    ├── App.jsx                routes
    ├── index.css              custom green/gold theme over Bootstrap
    ├── config.js              Maps key + map defaults
    ├── context/AuthContext.jsx    fake auth + demo accounts
    ├── hooks/useGeolocation.js    user location (Dhaka fallback)
    ├── data/mosques.js        dummy dataset + distance/helpers (→ real API later)
    ├── components/            Layout, Navbar, Footer, MapView, MosqueCard, FacilityBadge
    └── pages/                 Home, Browse, MosqueProfile, Login, Register
```

## Notes for later phases

- `data/mosques.js` is the single source of dummy data — Phase 2 swaps its exports for
  calls to the Laravel REST API (e.g. `fetch('/api/mosques')`).
- The app is a **SPA**: Laravel becomes a pure JSON API; React handles all views/routing.
- Auth stub (`AuthContext`) is replaced by real token-based auth against the API.
