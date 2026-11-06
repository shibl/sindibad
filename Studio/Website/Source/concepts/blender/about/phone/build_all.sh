#!/bin/zsh
# Regenerates every asset of the phone concept. Long: about 45 minutes on an M5 Pro, one Blender at a time, as the README asks.
#   WORK=<scratch dir> ROOT=<repo> zsh build_all.sh [textures] [world] [sim] [frames] [pack] [still]
# Needs the dev server running for dump-screen (the game's screen is captured from its own shader, then baked into the frames).
set -e
B=/Applications/Blender.app/Contents/MacOS/Blender
HERE=${0:A:h}
OUT=$ROOT/public/about/phone
what=${@:-textures world sim frames pack still}
run() { nice -n 10 $B -b --factory-startup -P "$@" > $WORK/last.log 2>&1 || { tail -20 $WORK/last.log; exit 1 } }
cd $HERE

if [[ $what == *textures* ]]; then run textures.py; fi
if [[ $what == *world* ]]; then
  SCALE=1 SPP=128 DST=$WORK/world WHAT=cards,world run render_world.py
  OUT=$OUT WHAT=cards run pack.py
  (cd $ROOT && bun concepts/blender/about/phone/dump-screen.ts $WORK/tex/screen.png)
fi
if [[ $what == *sim* ]]; then TAG=final N=1100 FRAMES=150 run hydro.py; fi
if [[ $what == *frames* ]]; then
  mkdir -p $OUT/land $OUT/port $WORK/seq/poster-land $WORK/seq/poster-port
  # Desktop and phone sequences, each with its manifest and the raft's card.
  TAG=final ASPECT=land W=${LW:-1360} H=${LH:-850} SPP=96 Q=${LQ:-78} DST=$OUT/land RAFT=1 RAFT_SCALE=2 run render_seq.py
  TAG=final ASPECT=port W=${PW:-585} H=${PH:-1266} SPP=96 Q=${PQ:-64} DST=$OUT/port RAFT=1 RAFT_SCALE=2 run render_seq.py
  # A sharper first impression for each.
  TAG=final ASPECT=land W=2000 H=1250 SPP=128 Q=74 DST=$WORK/seq/poster-land FRAMES=0 MANIFEST=0 run render_seq.py
  TAG=final ASPECT=port W=900 H=1948 SPP=128 Q=70 DST=$WORK/seq/poster-port FRAMES=0 MANIFEST=0 run render_seq.py
  cp $WORK/seq/poster-land/f000.webp $OUT/poster-land.webp
  cp $WORK/seq/poster-port/f000.webp $OUT/poster-port.webp
fi
if [[ $what == *pack* ]]; then
  for set in land port; do
    OUT=$OUT WHAT=raft SET=$set SEQ=$OUT/$set run pack.py
    # The working files stay out of the public folder.
    mv -f $OUT/$set/raft_full.png $WORK/seq/raft_full_$set.png
    mv -f $OUT/$set/raft.json $WORK/seq/raft_$set.json
  done
fi
if [[ $what == *still* ]]; then
  # Needs the concept mounted on the dev server: the stills are screenshots of the live scene with the words hidden.
  hide="document.querySelectorAll('.ph-copy,.ph-panel,.about-switch,.a-header').forEach(e=>e.style.display='none')"
  (cd $ROOT && bun scripts/about-shot.ts --id phone --w 1600 --h 1000 --ps 0.9 --wait 6000 --settle 3000 --eval "$hide" --out $WORK/still-land)
  (cd $ROOT && bun scripts/about-shot.ts --id phone --phone --ps 0.9 --wait 6000 --settle 3000 --eval "$hide" --out $WORK/still-port)
  OUT=$OUT WHAT=still IN=$WORK/still-land.png NAME=still-land.webp TW=1600 STILL_Q=80 run pack.py
  OUT=$OUT WHAT=still IN=$WORK/still-port.png NAME=still-port.webp TW=780 STILL_Q=78 run pack.py
fi
du -sh $OUT
