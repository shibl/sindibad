#!/usr/bin/env bash
# Sets up the game server on a fresh Ubuntu or Debian VPS, or updates it.
# Run as root from this folder (README.md here):
#
#   ./setup.sh api.example.org      first time: the server's domain
#   ./setup.sh                      later: update and restart
#
# It installs Docker if missing, opens the firewall for SSH and HTTPS,
# writes .env with new secrets (once; it never overwrites them), starts
# everything, and checks that the server answers.
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo ./setup.sh ...)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

if command -v ufw >/dev/null 2>&1; then
  say "Firewall: SSH, HTTP and HTTPS only"
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
  ufw status | sed 's/^/  /'
fi

if [ ! -f .env ]; then
  domain="${1:-}"
  if [ -z "$domain" ]; then
    echo "First time: give the server's domain, for example ./setup.sh api.example.org" >&2
    echo "(no domain: ./setup.sh $(curl -fsS https://api.ipify.org 2>/dev/null | tr . -).sslip.io)" >&2
    exit 1
  fi
  say "Writing .env (keep it secret; it is not in git)"
  sed -e "s|^API_DOMAIN=.*|API_DOMAIN=$domain|" \
      -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
      -e "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$(openssl rand -hex 24)|" \
      env.example > .env
  chmod 600 .env
elif [ -n "${1:-}" ]; then
  sed -i "s|^API_DOMAIN=.*|API_DOMAIN=$1|" .env
fi

# shellcheck disable=SC1091
. ./.env

say "Building and starting (the first build takes a few minutes)"
docker compose up -d --build --remove-orphans

say "Waiting for https://$API_DOMAIN/healthz"
for _ in $(seq 1 60); do
  if curl -fsS "https://$API_DOMAIN/healthz" 2>/dev/null; then
    echo
    say "The server is up."
    cat <<DONE
  Debug page:  https://$API_DOMAIN/admin/debug
  Stats page:  https://$API_DOMAIN/admin
  Admin token: $ADMIN_TOKEN

  On the phone, open the game once with
    ?debug=1&api=https://$API_DOMAIN
  (for example https://<the game's address>/staging/Web/?debug=1&api=https://$API_DOMAIN)

  The server's log, live:     docker compose logs -f api
  Only the devices' reports:  ./logs.sh
DONE
    exit 0
  fi
  sleep 5
done

say "No answer over HTTPS yet. What the containers say:"
docker compose ps
docker compose logs --tail 30 caddy api
echo
echo "Check that $API_DOMAIN points at this server's address, and that ports 80 and 443 are open"
echo "(on Hostinger also in hPanel: VPS, Security, Firewall)." >&2
exit 1
