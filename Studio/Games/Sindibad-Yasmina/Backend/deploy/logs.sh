#!/usr/bin/env bash
# What the devices report, live, as they send it: their diagnostics (diag),
# their log lines (log, from a device in debug mode) and their errors.
#
#   ./logs.sh                 from now on
#   ./logs.sh --since 2h      the last two hours too
#   ./logs.sh --all           every request as well
set -euo pipefail
cd "$(dirname "$0")"

all=0
args=(--no-log-prefix -f)
while [ $# -gt 0 ]; do
  case "$1" in
    --all) all=1 ;;
    --since) args+=(--since "$2"); shift ;;
    *) echo "usage: ./logs.sh [--since 2h] [--all]" >&2; exit 1 ;;
  esac
  shift
done
[ "${#args[@]}" -eq 2 ] && args+=(--since 1s)

if ! command -v jq >/dev/null 2>&1; then
  echo "(apt install jq for a tidier view)" >&2
  docker compose logs "${args[@]}" api | grep --line-buffered -E '"target":"client"|client (diag|log|error)'
  exit
fi

docker compose logs "${args[@]}" api | jq --unbuffered -rR --argjson all "$all" '
  fromjson? // {fields: {message: .}} |
  if .target == "client" then
    (.fields.props | fromjson? // .) as $p |
    "\(.timestamp[11:19]) \(.fields.event | ascii_upcase) \(.fields.device[0:8])  " +
    (if .fields.event == "log" then ($p.lines // [] | map("\n    \(.level) \(.text)") | join(""))
     elif .fields.event == "diag" then
       ($p.gl // [] | map("\n    \(.type) \(.options): \(if .ok then "yes, \(.info.unmaskedRenderer // .info.renderer)" else "NO, \(.message // .thrown // "no reason")" end)") | join("")) +
       ($p.facts // {} | to_entries | map("\n    \(.key): \(.value | tojson)") | join("")) +
       "\n    \($p.env.ua // "")"
     else "\($p.kind // ""): \($p.message // "")\n    \($p.stack // "" | .[0:600])" end)
  elif $all == 1 then "\(.timestamp[11:19] // "") \(.span.method // "") \(.span.path // "") \(.fields.status // "") \(.fields.latency // "") \(.fields.message // "")"
  else empty end'
