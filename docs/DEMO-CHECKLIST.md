# Deployment demo — command sheet

Run through this in order while demonstrating. Every command is copy-paste ready.
Each section says **where** to run it and **what the marker should see**.

Three places commands run:

- **[VPS]** — in the SSH session. Connect with `ssh cse3100`; if that alias is not
  set up on the machine you are demoing from, use
  `ssh -i $HOME\.ssh\cse3100_login s20230204056@187.52.122.100`. A bare
  `ssh s20230204056@187.52.122.100` will ask for a password, because neither key
  has a filename that ssh looks for by default.
- **[Laptop]** — local PowerShell, in the repo folder
- **[Browser]** — nothing to type, just click

---

## Before you start

Open these three things so you can switch between them without fumbling:

1. An SSH session to the VPS, sitting in `~/laravel`
2. https://github.com/isratarna/MosqueConnect/actions
3. https://mosqueconnect.austattendance.online

**[VPS]** Get into position:

```bash
cd ~/laravel
```

---

## 0. The pre-check: the PHP-FPM socket

The one thing we were told to verify before anything else.

**[VPS]**

```bash
ls -l /run/php/php8.4-fpm-s20230204056.sock
```

**Expected:** a line beginning `srw-rw---- 1 www-data www-data`. The socket exists,
so there was nothing to report to the instructor.

---

## 1. React builds into Laravel's `public/app`, and calls the API

**[Laptop]** Show the Vite config that targets Laravel's public folder:

```powershell
type apps\web\vite.config.js
```

**Expected:** `base: "/app/"` and `outDir: "../api/public/app"`.

**[VPS]** Show that the built bundle is actually on the server:

```bash
ls -l ~/laravel/public/app/index.html
ls ~/laravel/public/app/assets | head -5
```

**Expected:** `index.html` plus hashed JS/CSS assets — built by GitHub Actions, not here.

**[Browser]** Open the site, press **F12**, go to the **Network** tab, reload, and
click something that loads data (mosque list / prayer times).

**Expected:** requests to `/api/...` returning **200** with JSON. This is React
reaching the API in the real deployment.

---

## 2. Our own database and MySQL user in the shared `cse3100-db`

**[VPS]** Show the connection settings — this deliberately does not print the password:

```bash
grep -E '^DB_(CONNECTION|HOST|PORT|DATABASE|USERNAME)=' ~/laravel/.env
```

**Expected:**

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=mosqueconnect_db
DB_USERNAME=mosqueconnect
```

`127.0.0.1:3307` is the published port of the existing `cse3100-db` container, so
this is the shared container being reused — no new container was created.

**[VPS]** Prove the app is *not* connecting as root, and that the user is scoped to
our database only:

```bash
php artisan tinker --execute="print_r(DB::select('SELECT CURRENT_USER() AS mysql_user, DATABASE() AS db'));"
php artisan tinker --execute="print_r(DB::select('SHOW GRANTS FOR CURRENT_USER()'));"
```

**Expected:** `mysql_user => mosqueconnect@%` and `db => mosqueconnect_db`, and the
grants show privileges on `` `mosqueconnect_db`.* `` only — not `*.*`, and not root.

**[VPS]** Show we have no Docker access at all, so we could not have made our own
database server or restarted anyone's container:

```bash
docker ps
```

**Expected:** `permission denied while trying to connect to the docker API`. The
instructor ran our `CREATE DATABASE` / `CREATE USER` SQL inside `cse3100-db`.

---

## 3. `.env` was made by hand on the server and is not in git

**[VPS]** Show it exists and when it was created:

```bash
ls -l ~/laravel/.env
```

**[Laptop]** Show git has never tracked it, and that CI refuses to ship it:

```powershell
git ls-files | Select-String "\.env$"
git check-ignore -v apps\api\.env
```

**Expected:** the first command prints **nothing** (no `.env` is tracked), and the
second shows the `.gitignore` rule that blocks it.

**[Laptop]** The pipeline also actively guards this — show the check in the workflow:

```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "env found in archive" -Context 4,1
```

**Expected:** the release archive excludes `.env`, and the build **fails** if a
`.env` ever appears inside it.

---

## 4. The nginx site, reloaded only after `nginx -t` passed

**[VPS]** Show the site is enabled and actually loaded by nginx:

```bash
ls -l /etc/nginx/sites-enabled/ | grep mosqueconnect
sudo nginx -T | grep -n 'server_name mosqueconnect'
```

**Expected:** a symlink into `sites-available`, and hits inside the live
configuration dump — proving nginx is really serving this `server_name`.

**[VPS]** Show the config is valid, which is the gate before any reload:

```bash
sudo nginx -t
```

**Expected:** `syntax is ok` and `test is successful`.

> Our setup script enforces this ordering: it only runs
> `systemctl reload nginx` **inside** an `if sudo nginx -t; then` block, so a bad
> config can never be reloaded. Show it if asked:
> **[Laptop]** `Select-String -Path deploy\server-setup.sh -Pattern "nginx -t" -Context 1,4`

**[VPS]** Show nginx points at the right PHP-FPM socket (ours, not another student's):

```bash
sudo nginx -T | grep 'fastcgi_pass.*s20230204056'
```

**Expected:** `fastcgi_pass unix:/run/php/php8.4-fpm-s20230204056.sock;`

---

## 5. A separate deploy key

**[VPS]** Show the deploy key sits on its own line in `authorized_keys`, alongside
the original login key:

```bash
wc -l ~/.ssh/authorized_keys
cut -d' ' -f3 ~/.ssh/authorized_keys
```

**Expected:** more than one line, and the comment field identifies the extra key as
the deploy key — it was appended, not substituted for the login key.

**[Browser]** GitHub → **Settings → Secrets and variables → Actions**.

**Expected:** `SSH_PRIVATE_KEY` listed. GitHub never shows a secret's value, which
is the point. The private half is only ever in that secret; it is not in the repo.

**[Laptop]** Show the private key is not in git:

```powershell
git ls-files | Select-String "s20230204056"
```

**Expected:** **nothing** — the key file in the folder is gitignored and untracked.

---

## 6. The workflow builds on GitHub, `scp`s the release, then unpacks it

**[Laptop]** Walk the step names, which map one-to-one onto the requirements:

```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "- name:"
```

**Expected, in order:** install PHP packages (Composer) → build the React app →
pack the release → load the deploy key → **copy the release with scp** → unpack,
migrate and cache on the server.

**[Laptop]** Show the three required server-side commands:

```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "scp -i|tar -xzf|artisan migrate|artisan optimize"
```

**Expected:** `scp` for the transfer, then `tar -xzf`, `php artisan migrate --force`
and `php artisan optimize` running over SSH on the server.

**[Laptop]** Show the forbidden commands are never run on the VPS — the build happens
on the GitHub runner only:

```powershell
Select-String -Path .github\workflows\deploy.yml -Pattern "composer install|npm ci|npm run build" -Context 2,0
```

**Expected:** every one of them sits in a runner step with
`working-directory: apps/api` or `apps/web`, *above* the `scp` step. Nothing inside
the `ssh ... <<'REMOTE'` block installs or builds anything.

---

## 7. A green run, and the site serving that exact commit

This is the proof that **the pipeline deployed the site** — not a manual copy.

**[Browser]** GitHub → **Actions** tab.

**Expected:** a green ✅ "Deploy to VPS" run on the latest push to `main`. Click into
it to show the steps, including **Copy the release with scp**.

**[Laptop]** Get the commit currently at the tip of `main`:

```powershell
git fetch origin; git log origin/main -1 --format=%H
```

**[VPS]** Show the same commit was written into the release by CI, and that the
**running application** reports it:

```bash
cat ~/laravel/REVISION
curl -s https://mosqueconnect.austattendance.online/api/health
```

**Expected:** all three SHAs identical. For example, at the last check all three
read `fe68899159dd94bd9c5a9aac373f0b3762310406`
(`Merge pull request #289 from isratarna/fix/login-accept-terms`).

> The SHA changes on every push to `main`. Re-run these three commands immediately
> before the demo so the numbers on screen match.

CI writes `REVISION` while packing the release, and `/api/health` reads that file at
request time — so a matching SHA can only mean the live code arrived via the pipeline.

**[VPS]** Show migrations ran on the server, as part of the deploy:

```bash
php artisan migrate:status | tail -5
```

**Expected:** every migration marked `Ran`.

---

## QA: the site works end to end

**[VPS]** One request that exercises nginx → PHP-FPM → MySQL together:

```bash
curl -iL http://mosqueconnect.austattendance.online/api/health
```

**Expected:** `301` to HTTPS, then `HTTP/2 200` with JSON. The redirect is intended —
the site is HTTPS.

**[VPS]** A real database-backed endpoint:

```bash
curl -s https://mosqueconnect.austattendance.online/api/mosques | head -c 300; echo
```

**Expected:** JSON rows from MySQL.

**[Browser]** With **F12 → Console** open, click through the proposed features:

- Log in by phone OTP
- Search / browse mosques, open a mosque page
- Prayer schedule and Ramadan mode
- Announcements, campaigns, volunteer opportunities
- Submit one form so an action is seen working

**Expected:** pages load, no red errors in Console, no failed requests in Network.

**[VPS]** If you need the OTP code during the demo (the server logs it rather than
sending SMS):

```bash
grep -i 'otp' ~/laravel/storage/logs/laravel.log | tail -3
```

**[Browser]** Confirm the repo is public — open it in a private/incognito window:

https://github.com/isratarna/MosqueConnect

**Expected:** the code and the Actions tab are visible without signing in.

---

## Rules we were asked to respect

| Rule | How it is shown |
| --- | --- |
| Deployment only counts if the pipeline did it | Section 7 — `REVISION` = `origin/main` = `/api/health` |
| Repo public before the checkpoint | Incognito window above |
| Never run composer/npm/Node on the VPS | Section 6 — all builds are runner steps; also `docker ps` denied, and nothing in the remote block builds |
| Don't touch other students' files, DB or nginx | Our nginx file is `sites-available/mosqueconnect.austattendance.online`; our socket and logs are `s20230204056`-suffixed; MySQL grants cover `mosqueconnect_db` only |
| Don't restart `cse3100-db` | No Docker permission at all — section 2 |

---

## If something fails mid-demo

```bash
tail -20 /var/log/nginx/s20230204056-error.log
tail -20 ~/laravel/storage/logs/laravel.log
ls -l /run/php/php8.4-fpm-s20230204056.sock
```

A `502` usually means the PHP-FPM socket is gone — the third command tells you. Do
**not** restart PHP-FPM yourself; it is a shared service for the whole class, so ask
the instructor. A `500` means the application itself errored, so read `laravel.log`.
