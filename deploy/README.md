# MosqueConnect VPS deploy checklist

1. Copy this folder to the VPS home: `scp -r deploy s20230204056@187.52.122.100:~/deploy`
2. On the VPS run `bash ~/deploy/server-setup.sh` (it asks for the cse3100-db port and MySQL root password; leave the password blank to just print the SQL for the instructor). Re-run is safe.
3. Add the deploy public key to `~/.ssh/authorized_keys` on a NEW line (append with `>>`; never delete line 1).
4. In GitHub: Settings > Secrets and variables > Actions > add `SSH_PRIVATE_KEY` (private half of that key).
5. Push to the deploy branch; check the Actions run is green.
6. Verify: open http://mosqueconnect.austattendance.online and an API route; on failure see `/var/log/nginx/s20230204056-error.log` and `~/laravel/storage/logs/laravel.log`.
7. HTTPS (once certs exist in `~/ssl/live/mosqueconnect.austattendance.online/`): `bash ~/deploy/server-setup.sh --https`.

Notes: server never runs composer/npm (CI builds and uploads vendor/assets). `.env` is created once and never overwritten; DB user has rights on `mosqueconnect_db` only.
