# Checkpoint 3 – Change Log

Branch: `checkpoint-3`. Line numbers refer to the files after the change.

---

## Issue 1 – Calculated prayer times and Eid jamaat schedules (7 pts)

Both parts are finished and working.

- **Frontend:** all 26 tests pass.
- **Backend:** 241 of 246 tests pass. The 5 failures also fail on `main`. They create events and volunteer opportunities on hard-coded dates that are now in the past, so they aren't related to this work.
- **Manual check:** the whole app was run with demo data, and every screen was checked in a real browser on desktop and mobile. There were no console errors.

### Part 1 – Calculated prayer times (3 pts, originally #173)

**What was asked:** many mosques haven't published their times, so the app showed "Times unavailable". Calculate the times from the mosque's location instead, mark them as calculated, and show an "estimated" label.

**What was done:**
- Any prayer a mosque hasn't published is calculated from its location, using the Karachi method, Hanafi Asr and Dhaka time. It's labelled **"estimated"** on the profile, the mosque cards, the Home cards and the map. Published times always win.
- The calculation was checked against the Islamic Foundation timetable for Baitul Mukarram on 2 Oct 2026. To get within ±2 minutes, it adds the Foundation's precautionary minutes (+1 Dhuhr, +3 Maghrib).
- The estimated jamaat time is the adhan time plus a fixed offset per prayer. The method, the Asr school, the precautionary minutes and these offsets can be changed in [config/prayer.php](../apps/api/config/prayer.php).
- Results are cached per mosque per day until midnight, and are recalculated if a mosque's location changes.

### Part 2 – Eid jamaats (4 pts, originally #226)

**What was asked:** Eid-ul-Fitr and Eid-ul-Adha support:
- Mosque admins publish several Eid jamaats, including ones at a separate field.
- Followers are notified when the times are published.
- An "Eid jamaat near me" page with a list and a map.
- A Home banner, and an Eid card on mosque profiles, shown from about two weeks before Eid.

**What was done:**
- **Super admin:** Settings now has an **Eid season** section: which Eid, the expected date, and when to start showing it (two weeks before by default).
- **Mosque admin:** the dashboard has a new **Manage Eid Jamaat** tab. Admins can add several jamaats, including ones at a field or Eidgah picked on a map. New jamaats stay as drafts until the admin clicks **Publish & notify followers**. Followers are notified once per Eid, not once per jamaat.
- **Public:**
  - **Home banner:** shows during the season and links to the Eid page.
  - **`/eid` page:** a list and map of nearby jamaats, sorted by time and then distance. It has a women's-arrangement filter and buttons for Google Calendar, a calendar file, share and directions.
  - **Mosque profiles:** an Eid card during the season.

The task links to other tickets that aren't merged yet (#243, #246, #249, #255, #238). Small versions of what this task needed from them were built in, so it works on its own.

### Fixed while testing
- **Saving system settings with an empty Maintenance notice failed** (`Column 'value' cannot be null`). This bug was already there before checkpoint 3, but announcing an Eid always saves that page, so it showed up now. An empty setting now falls back to its default.
- **Mosque pages showed "Mosque not found"** after an Eid season was set, because the new table didn't exist yet. Running the migration fixes it (see below).

## Seeing it yourself

First create the new `eid_jamaats` table. This is needed once on every database, including Azure:

```powershell
cd apps/api
php artisan migrate                              # local PHP
docker compose exec api php artisan migrate      # or with Docker
```

If `php` is "not recognized", close every VS Code window and reopen it, so the terminal picks up the PHP that winget installed.

Then log in with the demo accounts (OTP `123456` after `php artisan db:seed`):

| Account | Phone | What to try |
|---|---|---|
| Super admin | `+8801700000001` | Super-admin dashboard → Settings → Eid season → turn on, set the date, save |
| Mosque admin | `+8801711000101` | Dashboard → **Manage Eid Jamaat**: add, edit and publish jamaats |
| Anyone | – | Home banner, `/eid`, the mosque profile's Eid card |

Every seeded mosque already has all five times published, so to see the "estimated" labels, add a mosque that hasn't published any:

```powershell
php artisan tinker --execute="App\Models\Mosque::create(['name'=>'Test Mosque Without Times','address'=>'Segunbagicha, Dhaka','latitude'=>23.733,'longitude'=>90.408]);"
```

## Files and lines

### Part 1

| File | Lines |
|---|---|
| `apps/api/composer.json` (+ `composer.lock`) | 10 |
| `apps/api/config/prayer.php` | new file |
| `apps/api/app/Services/PrayerCalculator.php` | new file |
| `apps/api/app/Services/PrayerScheduleService.php` | new file |
| `apps/api/app/Support/Geo.php` (distance helper moved out of `MosqueController`) | new file |
| `apps/api/app/Http/Resources/MosqueResource.php` | 5, 22–25, 53–54, 64–67, 89–106 |
| `apps/api/app/Http/Controllers/MosqueController.php` | 7, 9–10, 42, 67, 107–116 |
| `apps/web/src/components/EstimatedBadge.jsx` | new file |
| `apps/web/src/utils/prayerTime.js` | 43–48 |
| `apps/web/src/components/PrayerTimeline.jsx` | 4, 60, 79, 99, 115, 122–128 |
| `apps/web/src/components/MosqueCard.jsx` | 4, 6, 57 |
| `apps/web/src/components/MapView.jsx` | 217 |
| `apps/web/src/pages/Home.jsx` | 32–33, 517–520 |
| `apps/web/src/utils/mosqueDiscovery.js` | 91 |
| `apps/web/src/index.css` | 5415–5431 |
| `apps/api/tests/Feature/CalculatedPrayerTimesTest.php` | new file |
| `apps/api/tests/Feature/MosqueProfileInformationTest.php` | 56–62, 73–87 |
| `apps/web/src/utils/prayerTime.test.js` | 3, 28–34 |

### Part 2

| File | Lines |
|---|---|
| `apps/api/database/migrations/2026_10_02_000000_create_eid_jamaats_table.php` | new file |
| `apps/api/app/Models/EidJamaat.php` | new file |
| `apps/api/database/factories/EidJamaatFactory.php` | new file |
| `apps/api/app/Support/EidSeason.php` | new file |
| `apps/api/app/Http/Resources/EidJamaatResource.php` | new file |
| `apps/api/app/Http/Controllers/EidJamaatController.php` | new file |
| `apps/api/app/Http/Controllers/Admin/EidJamaatManagementController.php` | new file |
| `apps/api/app/Jobs/NotifyEidJamaatsPublished.php` | new file |
| `apps/api/app/Models/Mosque.php` | 120–130 |
| `apps/api/app/Models/Notification.php` | 36–37, 46–47, 54 |
| `apps/api/app/Models/SystemSetting.php` | 17–18 |
| `apps/api/app/Services/NotificationService.php` | 5, 91–124 |
| `apps/api/app/Http/Controllers/Admin/SystemSettingController.php` | 7, 9, 12, 32–35, 38–40, 43–55 (includes the empty-notice fix) |
| `apps/api/app/Http/Controllers/MosqueController.php` | 8, 95–101 |
| `apps/api/app/Http/Resources/MosqueResource.php` | 80–83 |
| `apps/api/routes/api.php` | 6, 23, 56–57, 133–138 |
| `apps/web/src/pages/Eid.jsx` | new file |
| `apps/web/src/components/EidBanner.jsx` | new file |
| `apps/web/src/components/eid/EidJamaatCard.jsx` | new file |
| `apps/web/src/components/admin/EidJamaatManager.jsx` | new file |
| `apps/web/src/components/admin/LocationPicker.jsx` | new file |
| `apps/web/src/utils/eidApi.js` | new file |
| `apps/web/src/utils/eidCalendar.js` | new file |
| `apps/web/src/App.jsx` | 30, 71 |
| `apps/web/src/pages/Home.jsx` | 34, 67 |
| `apps/web/src/pages/MosqueProfile.jsx` | 11, 32, 99, 158–172 |
| `apps/web/src/pages/AdminDashboard.jsx` | 8, 10, 87 |
| `apps/web/src/components/super-admin/AdminPanels.jsx` | 373–376, 393, 400–420 |
| `apps/web/src/components/notifications/NotificationList.jsx` | 11, 24 |
| `apps/web/src/utils/notificationUtils.js` | 6, 46–47 |
| `apps/web/src/components/MapView.jsx` | 220 |
| `apps/web/src/utils/mosqueDiscovery.js` | 92 |
| `apps/web/src/index.css` | 5432–5523 |
| `apps/web/package.json` | 10 (new test added to `npm test`) |
| `apps/api/tests/Feature/EidJamaatTest.php` | new file |
| `apps/web/src/utils/eidCalendar.test.js` | new file |
| `apps/web/src/utils/notificationUtils.test.js` | 43–47 |

**Deploy note:** on Azure, run the migration once or deploy with `RUN_MIGRATIONS=true`.

Sources for the timetable check:
- [Probashir Diganta – prayer times, 2 Oct 2026](https://www.probashirdiganta.com/news/namaz-schedule-2-october-2026)
- [Dinajpur TV – Islamic Foundation Dhaka times, 2 Oct](https://www.dinajpurtv.com/religion/34569)
