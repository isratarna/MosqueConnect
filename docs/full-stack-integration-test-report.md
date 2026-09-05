# Full-stack integration test report

Branch: `test/member1-fullstack-integration`

## Final results

| Area | Result | Evidence |
| --- | --- | --- |
| Laravel unit/feature suite | Pass | 231 tests, 896 assertions; isolated in-memory SQLite |
| Final event-registration rerun | Pass | 9 tests, 46 assertions after the registration-list count correction |
| React utility suite | Pass | 20 tests |
| Browser integration suite | Pass | 24 Playwright scenarios across desktop Chrome and a mobile Chrome viewport; final run used one worker because live MySQL data is shared |
| Unmocked full-stack suite | Pass | 14 live API scenarios covering announcements, blood requests, event registration, role boundaries, admin dashboard, and distance filtering |
| React production build | Pass | Vite built 1,870 modules; route splitting produced a 333.88 kB initial JS chunk |
| Laravel asset build | Pass | Laravel Vite/Tailwind assets compiled successfully |
| Dependency security audit | Pass | `npm audit` reports 0 vulnerabilities after upgrading Vite, React Router, esbuild, and nanoid |
| Running Docker stack | Pass | API returned HTTP 200 and Docker reported the API and MySQL containers healthy |
| MySQL migration | Pass | `event_registrations` and previously pending application migrations applied successfully |

## Acceptance coverage

| Acceptance criterion | Status | Coverage |
| --- | --- | --- |
| Event creation flow | Pass | Verified owner and super-admin creation, defaults, input validation, API response, and database rows |
| Event authorization | Pass | Anonymous, normal-user, unverified, non-owner, cross-mosque, and role-escalation attempts |
| Event registration | Pass | Authenticated registration and cancellation through direct APIs and React browser flows; refresh restoration included |
| Duplicate/full event behavior | Pass | Unique database constraint, duplicate conflict response, transactional capacity check, zero/full/unlimited capacity cases |
| Notification generation | Pass | Event, announcement, prayer-schedule, and campaign triggers; follower isolation and duplicate suppression |
| Notification read/unread | Pass | User isolation, unread count, mark-one, mark-all, authentication, ordering, and pagination |
| Notification navigation | Pass | Event, announcement, campaign, and prayer-schedule destinations map to existing React routes |
| Donation campaign flow | Pass | Public visibility, owner creation, lifecycle, pledge, confirmation, idempotent confirmation, and database totals |
| Campaign validation | Pass | Required/type/category/amount/currency/date/image/status validation, ownership spoofing, donation validation, and no-write failures |
| Geolocation flow | Pass | Browser-granted coordinates drive the nearby API and rendered discovery results |
| Location permission denied | Pass | Desktop/mobile browser tests verify denied-state feedback and manual-search recovery |
| Distance-based discovery | Pass | Coordinate/radius validation, Haversine calculation, ordering, filtering, invalid stored coordinates, and empty results |
| List/map state consistency | Pass | Desktop/mobile browser tests verify shared selected-mosque state when list navigation changes selection |
| Role restrictions | Pass | Direct feature tests cover 401/403 responses, active-user middleware, ownership, and protected roles |
| APIs tested directly | Pass | Laravel feature tests exercise successful, invalid, unauthorized, missing, duplicate, and conflict responses |
| Database changes verified | Pass | Tests assert registrations, events, notifications, followers, campaigns, donations, cascades, and uniqueness |
| Blood and volunteer seed data | Pass | `BloodRequestSeeder` and `VolunteerOpportunitySeeder` add three records each and are registered in `DatabaseSeeder` |
| Loading, empty, and error states | Pass | Browser tests cover empty discovery and API failure/retry; existing UI and utility tests cover loading/error formatting |
| Existing feature regression | Pass | Authentication, dashboards, claims, verification, announcements, prayer schedules, profiles, follows, blood requests, volunteering, moderation, and health |
| Desktop and mobile behavior | Pass | Every Playwright scenario runs at 1440×900 and 390×844 with touch/mobile emulation |
| Critical bugs fixed or documented | Pass | Event registration implemented; public rejected-event visibility fixed; prayer test made database-portable; Docker startup and bundle warning fixed |

## Fixes delivered

### Event registration

- Added registration persistence with cascading foreign keys and a unique `(event_id, user_id)` constraint.
- Added authenticated list/register/unregister APIs.
- Enforced public status, moderation approval, registration requirement, event date, and capacity.
- Used a transaction and row lock for capacity-safe registration.
- Exposed registration count, remaining capacity, and full state on event responses.
- Added React registration restoration, register/cancel actions, full-state display, and feedback.

### Regression and operational fixes

- Rejected or pending-moderation event details are no longer publicly exposed.
- Prayer schedule persistence assertions now work consistently on SQLite and MySQL time formats.
- Campaign invalid-input and no-write behavior has comprehensive feature coverage.
- Route-level React lazy loading removed the Vite oversized-chunk warning.
- Patched frontend build/router dependencies removed all five initially reported npm advisories.
- Docker startup skips Composer and config clearing when neither is needed, preventing false unhealthy states on bind-mounted Windows workspaces.
- Community cards no longer create announcement-detail links for blood or volunteer records.
- Live E2E coverage now submits blood requests and registers/cancels events against the running Laravel API and MySQL database.

## Reproduction commands

```sh
docker compose exec -T -e APP_ENV=testing -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: api php artisan test
npm run test --workspace=apps/web
npm run test:e2e --workspace=apps/web -- --workers=1 --retries=0
npm run build --workspace=apps/web
```
