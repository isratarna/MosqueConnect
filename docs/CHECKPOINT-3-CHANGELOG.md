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

---

## Issue 3 – Mosque teams and community-suggested corrections (10 pts)

Both parts are finished and working.

- **Backend:** 344 of 349 tests pass (81 are new). The 5 failures are the same ones listed under Issue 1. They also fail without these changes.
- **Frontend:** all 44 unit tests pass (12 are new).
- **Manual check:** the production build was run against the local MySQL database and driven in a real browser (Edge), twice. The test signed in as six different real users: the owner, two invitees, a brand-new number, a visitor and the super admin. All 73 checks passed both times, on desktop (1366 px wide) and on a phone screen (390 px). There were no console errors. All test data was removed afterwards.
- Both test suites were also run twice, with the same result each time.

### Part 1 – Mosque teams: several admins per mosque (6 pts, originally #229)

**What was asked:** a mosque could have only one admin (`mosques.owner_id`). Real mosques are run by committees, and if that one person left, nobody could manage the mosque. The issue asked for:
- teams with roles (owner, manager, editor, prayer times);
- invitations by phone number;
- member management and a Team section in the dashboard;
- invitations on the profile;
- super-admin tools to transfer ownership and revoke access, recorded in the audit log.

**What was done:**
- **Teams:** a new `mosque_members` table holds each mosque's team: who, which role, who invited them, and when they accepted. A row that isn't accepted yet is a pending invitation. Every existing `owner_id` was copied in as an owner. On the local database that was 12 owners, with 0 mismatches.
- **`owner_id` is kept** for compatibility and always points at one of the mosque's owners. Anything that still sets it (claim approval, seeders, tests) automatically puts that person on the team as owner.
- **Permissions in one place:** `App\Support\MosqueAbility` holds the role table. `MosquePolicy` and every `Gate::authorize(…, $mosque)` call now go through it:

  | Role | Can use |
  |---|---|
  | Owner | everything, including changing a member's role or removing a member |
  | Manager | everything except changing or removing members (can invite and cancel invitations) |
  | Editor | announcements, events, volunteering, campaigns (and Insights) |
  | Prayer times | the prayer schedule: daily times, Jumuah and Eid jamaats |

  Every role can open the dashboard and see the team. A test checks every role against every section (48 combinations).
- **Invitations:**
  - `POST /api/admin/mosques/{mosque}/members` with `{ phone, role }` creates a pending invitation and notifies the person. Only an owner can invite another owner.
  - If the number has no account yet, the invitation is stored with the phone number and attached when that person first signs in.
  - `GET /api/me/mosque-invites`, plus `POST …/{invite}/accept` and `…/decline`. Accepting makes the person a mosque admin.
- **Managing the team:**
  - `PATCH` / `DELETE /api/admin/mosques/{mosque}/members/{member}` are owner-only. The last owner can't be demoted or removed.
  - `POST /api/admin/mosques/{mosque}/leave` lets anyone leave, except the last owner.
  - When someone is on no team any more, their account goes back to a normal user.
- **`GET /api/auth/me`** returns `managed_mosques` with the user's `role` and `abilities` for each mosque, plus `pending_mosque_invites_count`.
- **Super admin:**
  - `POST /api/super-admin/mosques/{mosque}/transfer` with `{ user_id }` makes that person the owner. The previous owners stay on as managers, or are removed with `previous_owners: "remove"`.
  - `DELETE /api/super-admin/mosques/{mosque}/members/{user}` revokes anyone's access, including the last owner's.
  - Both are recorded in the audit log as `mosque.ownership_transferred` and `mosque.member_revoked`.
- **Frontend:**
  - **Team section in the dashboard:** members with their roles, invite by phone number (`01712 345678` works too), change role, remove member, cancel an invitation, leave the mosque, and a "What each role can do" list.
  - **Sections the role can't use are hidden** from the sidebar and the phone menu. Opening one by URL shows the Overview instead.
  - **The Overview cards follow the role too.** Editors don't get the prayer **Edit** link. Prayer-times members don't get Quick post, announcements, pledges, events or campaigns.
  - **This isn't only cosmetic:** the dashboard API also leaves out pledge, campaign and report data for roles without content access.
  - **Profile → Team Invitations:** Accept / Decline buttons and a count badge. The invitation notification links here.
  - **Super-admin → Mosques:** each mosque shows its team size and a **Team · transfer / revoke** dialog.

### Part 2 – Community-suggested corrections (4 pts, originally #227)

**What was asked:**
- Let signed-in visitors suggest fixes to a mosque's times and details.
- The mosque's admin reviews them, or the super admin for mosques nobody manages.
- Accepting applies the change the same way the admin editor does, and tells followers if times changed.
- Count accepted suggestions for a "Trusted contributor" badge.
- Show "Times confirmed by the community" on the profile.

**What was done:**
- **Suggestions:** a new `mosque_edit_suggestions` table holds the field, the suggested value, a note, the status, the reviewer and the review note. There is also a new `users.accepted_suggestions_count` column.
  - `POST /api/mosques/{mosque}/suggestions` works for anyone signed in, up to 10 a day per person.
  - Each field is validated: prayer time, Jumuah time, phone, address, map location, facilities, or "something else" (which needs a note).
  - A suggestion that wouldn't change anything is refused.
  - `GET /api/me/suggestions` lists your own suggestions.
- **Who reviews:**
  - **Managed mosques** (verified, with a team): their admins, at `/api/admin/mosques/{mosque}/suggestions`. Time fixes need the Prayer times, Manager or Owner role. Fixes to other details need Manager or Owner.
  - **Every other mosque:** the super admin, at `/api/super-admin/suggestions`. There is also an "all mosques" option.
- **One code path:** the admin editor's save logic moved into a new `MosqueEditor` service, and accepting a suggestion goes through it.
  - If a time actually changed, followers get one notification, for example "Isha jamaat 8:15 PM".
  - The person who suggested the fix is told whether it was accepted, with the reviewer's note.
- **Trust:** each accepted suggestion adds to the person's count.
  - At 3 they get the **Trusted contributor** badge.
  - Their fixes to mosques nobody manages go live straight away. "Something else" always needs a person to review it.
  - The threshold, the daily limit and auto-accept can be changed in [config/suggestions.php](../apps/api/config/suggestions.php).
- **Frontend:**
  - **"Suggest a correction" links on the mosque profile:** on the prayer card, the Jumuah card, the Facilities and Location cards, and a new **About** card with the address and phone. Each opens a form filled in with the current values. Guests are asked to sign in first.
  - **"Times confirmed by the community 2 days ago"** shows on the prayer card after an accepted time fix.
  - **Review queues:** **Suggested corrections** in the dashboard (with a count on the Overview), and **Corrections** in the super-admin console. They show the value before and after, the visitor's note, and how many of the visitor's fixes were accepted before.
  - **Profile → My Corrections** shows each suggestion's status, and the badge.

### Fixed while testing
- **The admin's own prayer-time changes never notified followers.** The notification code existed, but nothing called it. Accepted suggestions now share the admin editor's code path, so saving changed times from the dashboard notifies followers too. This only happens when a time actually changed. Saving without changes notifies nobody.
- **Profile → Followed Mosques crashed for anyone who follows a mosque** ("Cannot read properties of undefined (reading 'slice')"). This bug was already there before checkpoint 3. The followed-mosques list wasn't converted to the same format as every other mosque list, so the card had no facilities list. The crash showed up when a member who left a team landed on their profile.
- **Claim approval updated the mosque straight in the database**, which skips the model's events. It now saves the model, so the approved applicant is also added to the team as owner.

### Notes
- Several tickets this work links to aren't merged yet, so small versions were built in, as in Issues 1 and 2:
  - [F3] Part 1 (About section): a small **About** card on the profile.
  - [L5] Part 1 (super-admin console): the team dialog and the Corrections section.
  - [B6] Part 1 (notifications): notifications for invitations and reviews, and the prayer-time fix above.
- Each invitation is tied to the phone number it was sent to. Users can't change their phone number in this app, so an invitation can't end up with the wrong person.
- A super admin can revoke the last owner. The mosque then has no owner until ownership is transferred, and its suggestions go to the super-admin queue.

### Seeing it yourself

First run the two new migrations. This is needed once on every database, including Azure:

```powershell
cd apps/api
php artisan migrate
```

Demo accounts. The OTP is `123456` after `php artisan db:seed --class=DemoAuthenticationSeeder`. For the other numbers, `get-otp.ps1` reads the code from the log.

| Account | Phone |
|---|---|
| Owner of Baitul Mukarram | `+8801711000101` |
| Super admin | `+8801700000001` |
| Normal user (Ayesha) | `+8801812000201` |
| Normal user (Tanvir) | `+8801812000202` |

| What to check | How |
|---|---|
| Invite | As the owner: **Dashboard → Team**, invite `01812000201` as **Editor**. |
| Accept | As Ayesha: **Profile → Team Invitations → Accept**, then open **Mosque Dashboard**. Only the content sections show. Publish something with **Quick post**. **Team** has no invite form. |
| Prayer-times role | Invite `01812000202` as **Prayer times** and accept as Tanvir. Only Overview, Prayer & Jamat, Jummah, Eid Jamaat, Suggested corrections and Team show. |
| Last owner | As the owner, try to change your own role. It says the mosque needs at least one owner. |
| Transfer and revoke | As the super admin: **Mosques → Team · transfer / revoke** on Baitul Mukarram. Find a user, click **Transfer ownership**, then **Revoke**. Both appear in **Audit Log**. |
| Suggest | As any user, open a mosque page and click **Wrong time? Suggest a correction**. Change Isha and send. |
| Review | As the owner: the Overview shows **Review 1 suggestion**. Open it, compare the before and after values, and click **Accept & apply**. The profile then shows the new time and "Times confirmed by the community today", and followers get a notification. |
| Unmanaged mosques | Suggest a fix on **Star Mosque**, which isn't verified. It appears under **Corrections** in the super-admin console. |
| Trusted contributor | After 3 accepted fixes, the profile shows the badge, and fixes to unmanaged mosques go live straight away. |

### Files and lines

#### Part 1

| File | Lines |
|---|---|
| `apps/api/database/migrations/2026_10_04_000000_create_mosque_members_table.php` | new file |
| `apps/api/app/Models/MosqueMember.php` | new file |
| `apps/api/app/Support/MosqueAbility.php` | new file (the role table) |
| `apps/api/app/Services/MosqueTeamService.php` | new file |
| `apps/api/app/Http/Controllers/Admin/MosqueTeamController.php` | new file |
| `apps/api/app/Http/Controllers/MosqueInviteController.php` | new file |
| `apps/api/app/Http/Controllers/Admin/SuperAdminMosqueTeamController.php` | new file |
| `apps/api/app/Http/Resources/MosqueMemberResource.php` | new file |
| `apps/api/app/Policies/MosquePolicy.php` | rewritten |
| `apps/api/app/Policies/AnnouncementPolicy.php`, `CampaignPolicy.php`, `EventPolicy.php`, `VolunteerOpportunityPolicy.php` | 15, 35 |
| `apps/api/app/Http/Controllers/AnnouncementController.php` | 37 |
| `apps/api/app/Http/Controllers/VolunteerOpportunityController.php` | 38 |
| `apps/api/app/Http/Controllers/Admin/CampaignManagementController.php` | 32 |
| `apps/api/app/Http/Controllers/Admin/EventManagementController.php` | 24 |
| `apps/api/app/Http/Controllers/Admin/EidJamaatManagementController.php` | 25, 46, 67, 100, 112 |
| `apps/api/app/Http/Controllers/Admin/MosqueInsightsController.php` | 17 |
| `apps/api/app/Http/Controllers/Admin/MosqueDashboardController.php` | 24–27, 36, 38–39, 55, 57–59, 62–64 |
| `apps/api/app/Http/Resources/Admin/MosqueDashboardResource.php` | 43 |
| `apps/api/app/Http/Controllers/Auth/PhoneOtpController.php` | 8, 10, 38, 65–67, 119–139 |
| `apps/api/app/Http/Controllers/Admin/VerificationRequestManagementController.php` | 80–85 |
| `apps/api/app/Http/Controllers/Admin/MosqueSystemManagementController.php` | 26 |
| `apps/api/app/Http/Controllers/Admin/UserManagementController.php` | 25, 65 |
| `apps/api/app/Services/MosqueClaimService.php` | 24 |
| `apps/api/app/Models/Mosque.php` | 47–72 (owner sync), 81–96 (also Part 2) |
| `apps/api/app/Models/User.php` | 50, 84–114, 224 (also Part 2) |
| `apps/api/app/Models/Notification.php` | 38–41, 52–55, 63–64 (also Part 2) |
| `apps/api/app/Services/NotificationService.php` | 125–148 (also Part 2) |
| `apps/api/routes/api.php` | 12, 14, 16, 33, 35, 107–116, 149–160, 224–229 (also Part 2) |
| `apps/api/database/seeders/MosqueSeeder.php` | 6, 161–166 |
| `apps/api/database/seeders/DemoDataIntegritySeeder.php` | 24–25, 28–36 |
| `apps/api/tests/Feature/MosqueTeamTest.php` | new file |
| `apps/web/src/components/admin/TeamManager.jsx` | new file |
| `apps/web/src/components/super-admin/MosqueTeamModal.jsx` | new file |
| `apps/web/src/components/Modal.jsx` | new file (also Part 2) |
| `apps/web/src/utils/teamRoles.js` | new file |
| `apps/web/src/utils/teamRoles.test.js` | new file |
| `apps/web/src/utils/teamApi.js` | new file (also Part 2) |
| `apps/web/src/pages/AdminDashboard.jsx` | 3, 16, 18, 34–37, 51–66, 117, 143–167, 179, 185, 194, 207, 223, 227 (also Part 2) |
| `apps/web/src/utils/dashboardFormat.js` | 14–15 |
| `apps/web/src/components/admin/dashboard/DashboardOverview.jsx` | 8, 15, 37–49 |
| `apps/web/src/components/admin/dashboard/AttentionCard.jsx` | 2, 7, 13, 39–61, 104, 106, 126 (also Part 2) |
| `apps/web/src/components/admin/dashboard/TodayPrayersCard.jsx` | 25 |
| `apps/web/src/context/AuthContext.jsx` | 161–173, 194 (`refreshUser`) |
| `apps/web/src/pages/Profile.jsx` | 2–31, 53–65, 89, 98, 112, 117–138 (also Part 2) |
| `apps/web/src/components/super-admin/AdminPanels.jsx` | 33–35, 241, 253, 264, 270–271, 274–305 (also Part 2) |
| `apps/web/src/components/notifications/NotificationList.jsx` | 12–13, 27–28 (also Part 2) |
| `apps/web/src/utils/notificationUtils.js` | 7–8, 50–53 (also Part 2) |
| `apps/web/src/utils/notificationUtils.test.js` | 48–53 |
| `apps/web/src/utils/mosqueDiscovery.js` | 290–293 (followed-mosques crash fix) |
| `apps/web/package.json` | 10 (new tests added to `npm test`) |

#### Part 2

| File | Lines |
|---|---|
| `apps/api/database/migrations/2026_10_04_000100_create_mosque_edit_suggestions_table.php` | new file |
| `apps/api/app/Models/MosqueEditSuggestion.php` | new file |
| `apps/api/app/Services/MosqueEditor.php` | new file (the admin editor's save logic, now shared) |
| `apps/api/app/Services/MosqueSuggestionService.php` | new file |
| `apps/api/app/Http/Controllers/MosqueSuggestionController.php` | new file |
| `apps/api/app/Http/Controllers/Admin/SuggestionReviewController.php` | new file |
| `apps/api/app/Http/Resources/MosqueEditSuggestionResource.php` | new file |
| `apps/api/config/suggestions.php` | new file |
| `apps/api/app/Http/Controllers/Admin/MosqueManagementController.php` | 7, 23–36, 68–74 (now uses `MosqueEditor`) |
| `apps/api/app/Http/Controllers/MosqueController.php` | 7, 103–108 |
| `apps/api/app/Http/Resources/MosqueResource.php` | 7, 84–86 |
| `apps/api/app/Providers/AppServiceProvider.php` | 67–77 (10 a day limit) |
| `apps/api/tests/Feature/MosqueSuggestionTest.php` | new file |
| `apps/web/src/components/suggestions/SuggestCorrectionModal.jsx` | new file |
| `apps/web/src/components/suggestions/SuggestionReviewList.jsx` | new file (review queue and badge) |
| `apps/web/src/utils/suggestionFormat.js` | new file |
| `apps/web/src/utils/suggestionFormat.test.js` | new file |
| `apps/web/src/pages/MosqueProfile.jsx` | 1, 5, 7, 17, 37–47, 55–56, 120–121, 199–221, 289–304, 313, 326, 331–346 |
| `apps/web/src/pages/SuperAdminDashboard.jsx` | 9, 19, 35, 65 |
| `apps/web/src/index.css` | 5794–5897 (also Part 1) |

**Deploy note:** on Azure, run the migrations once or deploy with `RUN_MIGRATIONS=true`.

---

## Issue 4 – Super-admin console upgrades and claim-document pre-screening (9 pts)

Both parts are finished. Part 2 uses **Google Document AI** instead of Claude, because the project has no Anthropic API key.

- **Backend:** 378 of 383 tests pass (34 are new: 15 console, 12 pre-screen, 7 scorer). The 5 failures are the same date-based ones listed under Issue 1, and they fail without these changes too.
- **Frontend:** all 52 unit tests pass (8 are new, plus 4 new link checks in `notificationUtils.test.js`). The production build succeeds.
- Both suites were run twice, with the same result each time.
- **Not done:** an automated browser run. A local security hook blocked starting the dev server, so the screens still need the manual check under "Seeing it yourself" below.

### Part 1 – Super-admin console (6 pts, originally #228)

**What was asked:** replace every `window.prompt`; view claim documents and the AI hints in place; edit, merge and delete mosques; a user detail view; actually show the maintenance notice; decide what to do with `auto_publish_verified_mosques`; broadcasts; audit-log filters and CSV export.

**What was done:**
- **Dialogs:** a new `ConfirmDialog`, built on `Modal`, has a reason box that is required where the API requires it, shows a character count, validates input and displays server errors inline. It replaces all 5 `window.prompt` calls (claims, users, mosques, moderation, reports) and both `window.confirm` calls (deleting a campaign, deleting an Eid jamaat). A grep finds none left. With stacked dialogs, Escape closes only the top one.
- **Claims:** a **Review** button opens a side panel with:
  - the document (a PDF shows in an `<iframe>` from a blob URL, and JPG/PNG shows inline);
  - the AI score badge, a ✓/✗ for whether the mosque name and the applicant's name were found, the red flags and the findings, all labelled "advice only";
  - other claims for the same mosque, and the applicant's other claims;
  - Approve, Reject and More info.

  The table now shows the AI percentage, a red-flag count and a "competing claims" badge.
- **Inline document:** `GET /api/super-admin/claims/{id}/document?inline=1` returns `Content-Disposition: inline` with the correct MIME type, `nosniff` and `no-store`, and still needs a super-admin login. Without `inline` the file downloads as before.
- **Mosques:** every row has Edit, Merge and Delete.
  - `PATCH /api/super-admin/mosques/{id}` edits the mosque.
  - `POST …/merge {into_mosque_id}` runs in one transaction. It moves followers (keeping a single follow when someone follows both mosques), events, announcements, campaigns, volunteer opportunities, claims, notifications and reports, then deletes the duplicate.
    - An open claim that would duplicate the same person's open claim on the target is closed automatically, with a note saying why.
    - Mosques that still have an admin team are refused. Transfer or revoke their admins first, using the existing Team dialog.
    - The merge dialog searches for the target mosque and asks you to type MERGE.
  - `DELETE` returns 409 with the content counts unless `?force=1` is sent. The UI then offers a force-delete that lists what will be lost. Former team members lose the mosque-admin role if they have no other mosque.
  - Edits, merges and deletes are all audited (`mosque.updated`, `mosque.merged`, `mosque.deleted`).
- **Users:** a **Details** button and `GET /api/super-admin/users/{id}` show managed mosques, claims, reports filed, donations and suspension history (taken from the audit log).
- **Maintenance notice:** `GET /api/settings/public` needs no login and is cached for 60 seconds. Saving settings clears the cache. It returns `{ maintenance_notice, claims_enabled, reports_enabled, eid_season }`. A yellow banner in `Layout.jsx` shows the notice on every page. A visitor can dismiss it, and it shows again if the text changes.
- **`auto_publish_verified_mosques`: removed.** Approving a claim already marks the mosque verified, and nothing read this switch. The default, the validation rule, the switch in the UI and the stored row are all gone. An old client that still sends it is simply ignored.
- **Broadcasts:**
  - A new **Broadcasts** section and `GET`/`POST /api/super-admin/broadcasts`, with `{ title, message, audience: all | role | district, audience_value, link }`.
  - Messages are sent as queued `system` notifications in chunks of 500, only to active accounts. Each broadcast is audited as `broadcast.sent`, and a list of past broadcasts shows the recipient count.
  - "District" means people who follow at least one mosque in that district, because accounts have no district of their own.
  - A link must start with `/` or `https://`. Clicking the notification opens it.
  - `notifications.mosque_id` is now nullable, and notifications have a `link` column. Push delivery waits for #240.
- **Audit log:** filters for action (a dropdown of the actions that exist), admin user ID, from and to dates, plus **Export CSV** (`GET /api/super-admin/audit-logs/export`, using the same filters, up to 10,000 rows). Cells that start with `=`, `+`, `-` or `@` are escaped so spreadsheet apps can't run them as formulas.

### Part 2 – Claim-document pre-screening (3 pts, originally #210)

**What was asked:** fill the unused `ai_score`, `ai_result` and `ai_reviewed` fields with an automatic assessment of each claim document, without ever letting it decide a claim.

**What was done, and how it differs from the issue:**
- **Claude Opus was replaced with Google Document AI (OCR) plus a scoring step written in PHP**, because there is no Anthropic API key. Document AI reads the text from the PDF or image. `ClaimAssessmentScorer` then checks for:
  - the mosque name (ignoring words like "masjid" and "jame");
  - the applicant's name, area or district, and stated role;
  - the document type (letterhead, committee resolution, NID, utility bill, other), detected from keywords in English and Bangla;
  - text that is too short, low recognition confidence, an unrelated document, an NID card used as proof of a role, and reviewer-directed instructions such as "approve this claim".

  It returns the fields the issue asked for: `score` (0–1), `document_type`, `mentions_mosque_name`, `mentions_applicant_name`, `findings`, `red_flags` and `summary`. Because no language model is involved, text inside a document can never act as an instruction. It is only matched and flagged.
- **Trade-off:** this is a text match, not judgement. It catches missing names, unrelated or unreadable files and pasted instructions, but it cannot spot a well-edited forgery the way a language model might. The `ClaimDocumentReviewer` interface means a Claude reviewer can replace it later without touching the job.
- **No new Composer package.** The REST `:process` endpoint is called with Laravel's `Http` client, using a service-account token (a signed JWT, cached for 50 minutes).
- **Settings:** `CLAIM_AI_REVIEW_ENABLED` (off by default), plus `GOOGLE_DOCUMENT_AI_PROJECT_ID`, `_LOCATION`, `_PROCESSOR_ID` and `_CREDENTIALS`. Credentials can be a key-file path or the JSON itself, raw or base64, for an Azure secret. They are exposed as `services.google_document_ai` and `services.claim_ai.enabled`, and added to `.env.example` with empty values.
- **Job:** `App\Jobs\PrescreenClaimDocument`, with `ShouldQueue`, `$tries = 3`, `$backoff = [30, 120]` and `$timeout = 120`.
  - It is dispatched with `->afterCommit()` from `MosqueClaimService::create()`, only when the flag is on.
  - **Success:** stores `ai_score` and `ai_result` (the assessment plus provider, page count, characters read and OCR confidence). It sets the status to `ai_reviewed` only if the claim is still `pending`.
  - **Errors:** 429, 5xx and network failures are retried. Any other 4xx, a bad key, missing settings or an unsupported file are recorded as `{"error": …}` and not retried.
  - Every write is a conditional `UPDATE … WHERE status IN (open statuses)`, so a super admin's decision made while the job runs is never overwritten. A failure never changes the claim's status.
- **Privacy:** only the file, the mosque's name and address, and the applicant's name, role and reason are given to the reviewer, never a phone number (a test checks this). The claim form now says documents are screened by Google Document AI and that a person decides. The repo has no Privacy Policy page yet (that is #252), so the policy text still needs adding there.
- **Refusals:** a Claude-style "refusal" doesn't exist for OCR. Its counterpart, an unreadable document, is stored as a score of 0 with an "Unreadable" red flag, and the claim is left for a person to review.

### Seeing it yourself

1. Run `php artisan migrate` (adds `broadcasts` and `notifications.link`, and makes `notifications.mosque_id` nullable).
2. Sign in as the super admin and go to **System Administration**.
3. **Settings:** type a maintenance notice and save. Within a minute a yellow banner appears on every page, including when signed out. Dismiss it, change the text, and it comes back. The "Publish verified mosques automatically" switch is gone.
4. **Mosque Claims:** click **Review** on a claim. The PDF or image shows inside the panel. Approve or reject it: a dialog asks for the reason, and Reject won't submit while the reason is empty.
5. **Mosques:** use the pencil to edit. Use the merge icon to search for another mosque, pick it and type MERGE; the duplicate disappears and its followers move. Use the bin to delete: an empty mosque deletes, and one with content asks before a force-delete.
6. **Users:** click **Details** to see claims, reports, donations and suspension history. Suspend: the dialog requires a reason.
7. **Broadcasts:** send "Eid moon sighted" to Everyone with link `/eid`. Sign in as a normal user; the notification is there, and clicking it opens `/eid`.
8. **Audit Log:** filter by action and dates, then click **Export CSV**.
9. **Pre-screening (needs Google Cloud):**
   - Create a Document AI **OCR processor** in a project with billing enabled, and a service account with the *Document AI API User* role.
   - Set the five `GOOGLE_DOCUMENT_AI_*`/`CLAIM_AI_REVIEW_ENABLED=true` values in `apps/api/.env`, then run `php artisan config:clear`.
   - Submit a claim. With `QUEUE_CONNECTION=sync` the score appears at once; on Azure, run a queue worker.
   - Check current pricing before turning this on; there is a monthly free allowance, but billing must be enabled.

### Files

| File | Change |
|---|---|
| `apps/api/app/Services/ClaimReview/` (7 files) | new: interface, Document AI client, reviewer, scorer, assessment, input, exception |
| `apps/api/app/Jobs/PrescreenClaimDocument.php` | new file |
| `apps/api/app/Jobs/SendBroadcast.php`, `app/Models/Broadcast.php` | new files |
| `apps/api/app/Http/Controllers/Admin/BroadcastController.php` | new file |
| `apps/api/app/Services/MosqueMergeService.php` | new file (merge and delete) |
| `apps/api/database/migrations/2026_10_05_000000_add_broadcasts_and_platform_notifications.php` | new file |
| `apps/api/app/Http/Controllers/Admin/MosqueSystemManagementController.php` | edit, merge and destroy actions |
| `apps/api/app/Http/Controllers/Admin/VerificationRequestManagementController.php` | inline document, competing claims |
| `apps/api/app/Http/Controllers/Admin/UserManagementController.php` | `show` |
| `apps/api/app/Http/Controllers/Admin/AuditLogController.php` | filters, actions list, CSV export |
| `apps/api/app/Http/Controllers/Admin/SystemSettingController.php`, `app/Models/SystemSetting.php` | public settings with cache; auto-publish removed |
| `apps/api/app/Services/MosqueClaimService.php` | dispatches the pre-screen job |
| `apps/api/app/Models/Notification.php`, `app/Http/Resources/NotificationResource.php` | `link`, nullable mosque |
| `apps/api/app/Providers/AppServiceProvider.php` | reviewer binding |
| `apps/api/config/services.php`, `.env.example` | Document AI and flag settings |
| `apps/api/routes/api.php` | 1 public and 9 super-admin routes |
| `apps/api/tests/Feature/SuperAdminConsoleTest.php`, `ClaimDocumentPrescreenTest.php`, `tests/Unit/ClaimAssessmentScorerTest.php` | new files |
| `apps/web/src/components/ConfirmDialog.jsx`, `MaintenanceBanner.jsx` | new files |
| `apps/web/src/components/super-admin/ClaimReviewPanel.jsx`, `MosqueToolsModals.jsx`, `UserDetailModal.jsx` | new files |
| `apps/web/src/components/super-admin/AdminPanels.jsx` | dialogs, review, mosque tools, user details, broadcasts, audit filters |
| `apps/web/src/pages/SuperAdminDashboard.jsx` | Broadcasts section |
| `apps/web/src/components/Layout.jsx`, `Modal.jsx` | banner; Escape closes only the top dialog |
| `apps/web/src/components/admin/CampaignManager.jsx`, `EidJamaatManager.jsx` | `ConfirmDialog` instead of `window.confirm` |
| `apps/web/src/components/MosqueClaimForm.jsx` | privacy note |
| `apps/web/src/utils/adminConsole.js` (+ test), `settingsApi.js`, `systemAdminApi.js`, `notificationUtils.js` (+ test) | helpers and API calls |
| `apps/web/src/pages/Notifications.jsx` | broadcast links open |
| `apps/web/src/index.css` | banner, document viewer, stacked dialogs |
| `apps/web/package.json` | adds `adminConsole.test.js` to `npm test` |

**Deploy note:** run the migrations, run a queue worker (the pre-screen job and broadcasts are queued), and add the Google settings as Azure secrets before setting `CLAIM_AI_REVIEW_ENABLED=true`.
