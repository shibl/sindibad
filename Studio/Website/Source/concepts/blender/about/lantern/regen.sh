#!/bin/bash
# Regenerates everything in public/about/lantern. Run from the repo root with the dev server up. Takes about five minutes.
#   concepts/blender/about/lantern/regen.sh [scratch dir]
set -e
BL=/Applications/Blender.app/Contents/MacOS/Blender
HERE=concepts/blender/about/lantern
DEST=public/about/lantern
OUT=${1:-/tmp/lantern-renders}
mkdir -p "$OUT" "$DEST"
run() { nice -n 10 env OUT="$OUT" "$@" "$BL" -b --factory-startup --python-use-system-env -P "$HERE/lantern.py"; }
# The twist frames, the gobo the flame sees through the piercing, and the two chain links.
run MODE=frames W=540 H=968 SPP=160 FRAMES=13 RANGE=12
run MODE=mask W=2048 H=1536 SPP=24
run MODE=chain W=120 H=220 SPP=96
# To WebP, plus the plaster tile.
IN="$OUT" DEST="$DEST" ONLY=mask,frames,chain,plaster FRAME_Q=88 nice -n 10 "$BL" -b --factory-startup --python-use-system-env -P "$HERE/export.py"
# The stills for browsers without WebGL2 are screenshots of the page itself, reduced motion, with the words hidden.
HIDE="document.head.append(Object.assign(document.createElement('style'),{textContent:'#about .a-intro-copy{visibility:hidden!important}'}))"
bun scripts/about-shot.ts --id lantern --reduce --clean --ps 0 --settle 2400 --eval "$HIDE" --out "$OUT/still"
bun scripts/about-shot.ts --id lantern --reduce --clean --ps 0 --settle 2400 --phone --dpr 2 --eval "$HIDE" --out "$OUT/still-phone"
IN="$OUT" DEST="$DEST" ONLY=stills STILL_Q=74 nice -n 10 "$BL" -b --factory-startup --python-use-system-env -P "$HERE/export.py"
du -sk "$DEST"
