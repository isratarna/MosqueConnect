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

---

## Issue 2 – Mosque admin dashboard and mosque insights (9 pts)

Both parts are finished and working.

- **Frontend:** all 32 unit tests pass (6 are new).
- **Backend:** 263 of 268 tests pass (22 are new). The 5 failures are the same ones listed under Issue 1. They also fail without these changes.
- **Manual check:** the app was run against the local MySQL database and driven in a real browser (Edge), twice. All 57 checks passed both times, on desktop (1366 px wide) and on a phone screen (390 px). They included a test where the dashboard API was deliberately failing. There were no console errors. All test data was removed afterwards.

### Part 1 – A real dashboard for mosque admins (6 pts, originally #192)

**What was asked:** turn the admin home into a real dashboard: a left sidebar (a slide-out menu on phones) and a grid of cards for the daily jobs. These were Quick post, Announcements, Today's prayer times, Needs your attention, Upcoming events, Active campaigns, and Followers with a sparkline. No section should be just a link to another page. Extend `GET /api/admin/mosques/{mosque}/dashboard` with one query method per card, add district, area and a photo to the profile, and let each card load and fail on its own.

**What was done:**
- **Layout:** a sidebar on desktop, and a slide-out menu on phones. The current section is kept in the URL (`/admin/dashboard?section=insights`), like the super-admin dashboard. With more than one mosque, `&mosque=` picks the mosque.
- **Overview cards:**
  - **Quick post:** title, message and urgency, with **Publish** and **Save draft**. Four templates fill in the message: Janazah notice, Jummah time change, Eid jamaat schedule and Goods needed.
  - **Announcements:** the latest 5 with Published or Draft labels, Publish/Unpublish buttons, and **View all**.
  - **Today's prayer times:** the next jamaat is highlighted. On Fridays the Jumuah sessions take Dhuhr's place, and after Isha it shows tomorrow's Fajr. An **Edit** link opens the prayer section.
  - **Needs your attention:**
    - Pending pledges, with **Confirm** and **Reject** buttons. Before this, they were hidden inside the campaign manager.
    - Open reports about the mosque.
    - A profile checklist: photo, phone, description, facilities, prayer times, map location and Jumuah. Each missing item links to the section that fixes it.
  - **Upcoming events:** registrations against capacity.
  - **Active campaigns:** progress bars and days left.
  - **Followers:** the total, plus a sparkline of the last 8 weeks.
- **Every section works inside the dashboard.**
  - Announcements, Prayer & Jamat, Jummah and Volunteer Work used to send admins to other pages; they now work in place.
  - The Jummah section can edit several sessions; it used to edit only the first.
  - The old addresses `/mosque-admin/announcements` and `/mosque-admin/prayer-schedule` now redirect to the matching section.
  - On the public Volunteers page, admins now see a "Manage your opportunities" link instead of the editing buttons.
- **Profile:** the map picker replaces the latitude/longitude boxes. There are new **District** and **Area** fields, and a **cover photo** (JPG, PNG or WebP, up to 4 MB). The photo shows on the public profile and the mosque cards.
- **Each card loads and fails on its own.** If one part of the dashboard data fails, only that card shows an error with **Retry**. Even if the whole dashboard request fails, Quick post and Announcements keep working, because they load separately.
- **Backend:** a new `DashboardQueryService` with one method per card. `GET /api/admin/mosques/{mosque}/dashboard` adds:
  - `today_prayers`, `upcoming_events`, `active_campaigns`, `pending_pledges` (plus `summary.pending_pledges_count`), `follower_growth` and `profile_completeness`;
  - `failed_sections`, which lists any part that could not load.

  All the old keys are unchanged. Follower growth comes from one query grouped on `followers.created_at`.

### Part 2 – Mosque insights (3 pts, originally #231)

**What was asked:** show admins how many people viewed the mosque, tapped Directions or Call, and followed it in the last 30 days, and how many read each announcement.

**What was done:**
- **Tracking:** a new `mosque_daily_stats` table holds one row per mosque per day: views, direction taps, call taps, follows and unfollows. `POST /api/mosques/{mosque}/track` adds to today's counts:
  - It is public, and allows 30 events per hour from each IP for each mosque.
  - It ignores bots and requests with no browser name.
  - **Nothing about the visitor is stored.**
- **Where events come from:**
  - **Mosque profile:** one view per mosque per browser session, plus the **Get Directions** button and a new **Call** button (the phone number used to be plain text).
  - **Following:** follows and unfollows are counted when they happen.
- **Insights section:**
  - four totals: profile views, direction taps, new follows, and the announcement read rate;
  - a line chart for the last 7, 30 or 90 days, with hover details, keyboard support and a "Show as a table" option;
  - an **Announcement reach** table: followers notified and read for each announcement.
  - The data comes from `GET /api/admin/mosques/{mosque}/insights?range=7d|30d|90d`.

### Fixed while testing
- **Publishing an announcement never notified followers.** The notification code existed, but nothing called it, so "announcement reach" would always have been 0. Followers are now notified when an announcement is published, the same way events and campaigns already work. Unpublishing and publishing again does not notify anyone twice.
- **On phones, the slide-out menu opened at the top of the page instead of on screen** once the admin had scrolled down. The app's page wrapper keeps a CSS transform from its page-enter animation, which breaks fixed positioning inside it. The menu is now rendered outside the wrapper.

### Notes
- Several tickets this work depends on aren't merged yet, so small versions were built in, as in Issue 1:
  - [B1] Part 2 (`DashboardQueryService`) and [B1] Part 1 (district/area): built in.
  - [F3] Part 2 (photos): a single cover photo instead of a gallery.
  - [F1] Part 2 (skeletons): a small skeleton component.
  - [F10] Part 1 (chart library): a small inline SVG chart, so no new package was added.
- Goods pledges from [L6] Part 4 will join the pending-pledges list once that ticket lands.
- The issue mentions `notifications.read_at`, but this app records reads in `notifications.is_read`, so read counts use that.
- Announcements published before this change were never sent to followers, so they show 0 notified.
- Photos are saved in the API's private storage and served through `GET /api/mosques/{mosque}/photo`, so no storage link is needed. On Azure, a container's disk is wiped on redeploy, so photos need a persistent volume there.

### Seeing it yourself

First run the two new migrations. Then load the demo usage numbers so Insights has data. This is needed once on every database, including Azure:

```powershell
cd apps/api
php artisan migrate
php artisan db:seed --class=MosqueDailyStatSeeder
```

Then log in as the demo mosque admin (`+8801711000101`, OTP `123456` after `php artisan db:seed --class=DemoAuthenticationSeeder`) and open **Dashboard**:

| What to check | How |
|---|---|
| Overview | All seven cards are on one page. The next jamaat is highlighted. |
| Quick post | Pick the **Goods needed** template, edit the text, and click **Publish**. It appears in the Announcements card. Unpublish and publish it again from the card. |
| Pledges | **Needs your attention → Confirm** on the BDT 25,000 pledge. The Active campaigns progress bar goes up. |
| Sections | Each item in the sidebar opens a working section, and the URL changes to `?section=…` |
| Old links | `/mosque-admin/announcements` and `/mosque-admin/prayer-schedule` redirect into the dashboard. |
| Profile | Set District and Area, drag the map pin, upload a cover photo, and check the public profile. The checklist reaches 100%. |
| Insights | Switch between 7, 30 and 90 days, hover over the chart, and open **Show as a table**. |
| Tracking | In a private window, open the mosque's public page, then click **Get Directions** and **Call**. Today's counts in Insights go up by one each. A reload doesn't count a second view. |
| Phone | Narrow the browser (or use the browser's mobile view). The menu button opens the sidebar, Escape closes it, and nothing scrolls sideways. |

### Files and lines

#### Part 1

| File | Lines |
|---|---|
| `apps/api/app/Services/DashboardQueryService.php` | new file |
| `apps/api/app/Http/Controllers/MosquePhotoController.php` | new file |
| `apps/api/database/migrations/2026_10_03_000000_add_district_area_photo_to_mosques_table.php` | new file |
| `apps/api/app/Http/Controllers/Admin/MosqueDashboardController.php` | 12, 14, 18–19, 37–59 |
| `apps/api/app/Http/Resources/Admin/MosqueDashboardResource.php` | 28–30, 42, 46–52 |
| `apps/api/app/Http/Controllers/Admin/MosqueManagementController.php` | 34–35 |
| `apps/api/app/Http/Resources/MosqueResource.php` | 30–32 |
| `apps/api/app/Models/Mosque.php` | 16–17, 44–46, 168–187 (district/area, photo URL, daily stats) |
| `apps/api/app/Http/Controllers/AnnouncementController.php` | 8, 15–16, 80–81, 111–114, 135–138, 155–165 (notify on publish) |
| `apps/api/routes/api.php` | 9, 30–31, 63–65, 128–130 (also Part 2) |
| `apps/api/tests/Feature/AdminDashboardTest.php` | 8–27 (imports), 307–619 |
| `apps/web/src/pages/AdminDashboard.jsx` | rewritten |
| `apps/web/src/components/admin/dashboard/DashboardOverview.jsx` | new file |
| `apps/web/src/components/admin/dashboard/DashboardCard.jsx` | new file (card shell and skeleton) |
| `apps/web/src/components/admin/dashboard/QuickPostCard.jsx` | new file |
| `apps/web/src/components/admin/dashboard/AnnouncementsCard.jsx` | new file |
| `apps/web/src/components/admin/dashboard/TodayPrayersCard.jsx` | new file |
| `apps/web/src/components/admin/dashboard/AttentionCard.jsx` | new file |
| `apps/web/src/components/admin/dashboard/ActivityCards.jsx` | new file (events, campaigns, followers) |
| `apps/web/src/components/admin/AnnouncementManager.jsx` | new file (moved from `MosqueAdminAnnouncements.jsx`) |
| `apps/web/src/components/admin/PrayerTimesSection.jsx` | new file (moved from `MosqueAdminPrayerSchedule.jsx`) |
| `apps/web/src/components/admin/VolunteerManager.jsx` | new file (admin parts of `VolunteerOpportunities.jsx`) |
| `apps/web/src/components/admin/MosqueProfileEditor.jsx` | new file |
| `apps/web/src/components/admin/LocationPicker.jsx` | 22, 57 (hint text can be changed) |
| `apps/web/src/utils/dashboardApi.js` | new file |
| `apps/web/src/utils/dashboardFormat.js` | new file |
| `apps/web/src/utils/dashboardFormat.test.js` | new file |
| `apps/web/src/pages/VolunteerOpportunities.jsx` | 2, 10–11, 27–28, 42, 46, 49, 79–82, 117, 177–180 (admin forms removed) |
| `apps/web/src/App.jsx` | 106, 115, 141–148 (redirects) |
| `apps/web/src/index.css` | 5524–5793 |
| `apps/web/package.json` | 10 (new test added to `npm test`) |
| `apps/web/src/pages/MosqueAdminAnnouncements.jsx` | deleted |
| `apps/web/src/pages/MosqueAdminPrayerSchedule.jsx` | deleted |
| `apps/web/src/services/prayerScheduleService.js` | deleted (only the old prayer page used it) |

#### Part 2

| File | Lines |
|---|---|
| `apps/api/database/migrations/2026_10_03_000100_create_mosque_daily_stats_table.php` | new file |
| `apps/api/app/Models/MosqueDailyStat.php` | new file |
| `apps/api/app/Services/MosqueInsightsService.php` | new file |
| `apps/api/app/Http/Controllers/MosqueTrackingController.php` | new file |
| `apps/api/app/Http/Controllers/Admin/MosqueInsightsController.php` | new file |
| `apps/api/database/seeders/MosqueDailyStatSeeder.php` | new file |
| `apps/api/database/seeders/DatabaseSeeder.php` | 27 |
| `apps/api/app/Providers/AppServiceProvider.php` | 66–73 (30 per hour limit) |
| `apps/api/app/Http/Controllers/MosqueFollowController.php` | 7, 31–32, 52–53 |
| `apps/api/tests/Feature/MosqueInsightsTest.php` | new file |
| `apps/web/src/components/admin/dashboard/InsightsPanel.jsx` | new file |
| `apps/web/src/components/admin/dashboard/InsightsLineChart.jsx` | new file |
| `apps/web/src/utils/trackMosque.js` | new file |
| `apps/web/src/pages/MosqueProfile.jsx` | 33, 54, 132–143 |

**Deploy note:** on Azure, run the migrations once or deploy with `RUN_MIGRATIONS=true`.
