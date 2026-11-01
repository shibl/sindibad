# The game server on a VPS

Everything for running the server on a VPS (for example Hostinger's,
Ubuntu 24.04): PostgreSQL, Valkey and the API in Docker, behind Caddy, which
gets the HTTPS certificate by itself. The game is served over HTTPS, so its
server must be too.

| File | |
| --- | --- |
| `setup.sh` | Installs and starts everything, or updates it. |
| `compose.yaml` | The four services, and their logs (kept on disk, rotated). |
| `Caddyfile` | HTTPS in front of the API. |
| `env.example` | The settings; `setup.sh` copies it to `.env` and fills in the secrets. |
| `logs.sh` | What the phones report (diagnostics, log lines, errors), live. |

## 1. A domain for the server

Add an **A record** for a name such as `api.<your domain>`, pointing at the
VPS's IP address (Hostinger: hPanel → Domains → DNS). No domain of your
own: use `<the IP with dashes>.sslip.io`, for example `203-0-113-5.sslip.io`
for `203.0.113.5`. It needs no setup.

## 2. Copy the server to the VPS

From your computer, in the repository:

```sh
rsync -a --exclude target Studio/Games/Sindibad-Yasmina/Backend/ root@<VPS IP>:/opt/sindibad/
```

(Or `scp -r Studio/Games/Sindibad-Yasmina/Backend root@<VPS IP>:/opt/sindibad`.)

## 3. Start it

On the VPS (`ssh root@<VPS IP>`):

```sh
cd /opt/sindibad/deploy
./setup.sh api.example.org          # your domain from step 1
```

It installs Docker if needed, opens the firewall for SSH, HTTP and HTTPS
only, writes `.env` with a new database password and admin token, builds
the server (a few minutes the first time), and waits until
`https://<domain>/healthz` answers. Then it prints the admin token and the
addresses. Keep the token: it opens the debug and stats pages.

If it does not answer: check that the domain points at the VPS, and that
ports 80 and 443 are open in Hostinger's own firewall too (hPanel → VPS →
Security → Firewall).

## 4. Point a phone at it

Open the game once with the server and debug mode in the address:

```
https://<the game's address>/staging/Web/?debug=1&api=https://<domain>
```

The phone remembers both (`?debug=0` and `?api=off` undo them). A red 🐞
button appears: it shows the 3D report and the log on the phone, and
**Send to server** sends them at once. Without the button, the report goes
eight seconds after start, and the log every fifteen seconds.

## 5. Read what it sent

- **Debug page:** `https://<domain>/admin/debug` (the admin token). New
  reports appear at the top as they arrive; tap a device id to see only it.
- **The server's log, live:** `./logs.sh` (only what the phones report), or
  `./logs.sh --all` (every request too), or `docker compose logs -f api`
  (everything, as JSON). `./logs.sh --since 2h` starts two hours back.
- **The database:**

  ```sh
  docker compose exec postgres psql -U sindibad -c \
    "select received_at, device_id, props->'gl' from events where name = 'diag' order by received_at desc limit 5"
  ```

The logs are kept on disk, 20 files of 50 MB per service at most. For even
more (every database query): `RUST_LOG=debug,hyper=info,h2=info` in `.env`,
then `docker compose up -d`.

## Update

Copy the new `Backend/` over (step 2), then `./setup.sh` on the VPS. `.env`
and the data stay.

## Back up

```sh
mkdir -p backups
docker compose exec -T postgres pg_dump -U sindibad sindibad | gzip > backups/$(date +%F).sql.gz
```

Every night at 03:17 (`crontab -e`):

```
17 3 * * * cd /opt/sindibad/deploy && mkdir -p backups && docker compose exec -T postgres pg_dump -U sindibad sindibad | gzip > backups/$(date +\%F).sql.gz && find backups -mtime +30 -delete
```

## What is and isn't logged

Every request: method, path, status, time taken, the browser. Every report
from the devices: their 3D report, their log lines (in debug mode) and their
errors. The 3D report holds every detail of the phone and its browser: the
model, the Android and browser versions, memory, processor, screen,
network, storage, battery, sound, voices, graphics chip and what the
browser supports. Never: location, camera, microphone, contacts, IP
addresses, tokens, or request bodies such as a child's save (it holds their
name). The game's diagnostics hold nothing about the child either.
