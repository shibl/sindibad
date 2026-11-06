#!/bin/zsh
# Runs any steps of the pipeline, in order. For a quick look: OUT=<cache> DEST=<dir> RES=0.5 Q=0.5 W=1280 SPP=64 PW=1280 ./run_draft.sh terrain clouds build sim data render grade passes
# make_all.sh has the final settings.
B=/Applications/Blender.app/Contents/MacOS/Blender
HERE=${0:A:h}
cd $HERE
F='^\[|Traceback|File |rror|rendered|text area'
for step in $@; do
  case $step in
    terrain) OUT=$OUT RES=${RES:-0.5} nice -n 10 $B -b --factory-startup -P terrain.py 2>&1 | grep -E 'Traceback|File |rror|done' ;;
    clouds) OUT=$OUT Q=${Q:-0.5} nice -n 10 $B -b --factory-startup -P clouds.py 2>&1 | grep -E 'Traceback|File |rror|done' ;;
    build) OUT=$OUT DENSITY=${DENSITY:-1} nice -n 10 $B -b --factory-startup -P build.py 2>&1 | grep -E 'Traceback|File |rror|saved' ;;
    sim) OUT=$OUT AGENTS=${AGENTS:-3200} nice -n 10 $B -b --factory-startup -P sim.py 2>&1 | grep -E 'Traceback|File |rror|finished|saved' ;;
    data) OUT=$OUT W=${DW:-2560} nice -n 10 $B -b $OUT/world.blend -P data_pass.py 2>&1 | grep -E 'data passes|Traceback|File |rror' ;;
    render) OUT=$OUT W=${W:-1280} SPP=${SPP:-64} NAME=${NAME:-beauty} VOLB=${VOLB:-6} nice -n 10 $B -b $OUT/world.blend -P render.py 2>&1 | grep -E 'Traceback|File |rror|rendered' ;;
    passes) OUT=$OUT DEST=$DEST W=${PW:-1280} nice -n 10 $B -b --factory-startup -P passes.py 2>&1 | grep -E 'webp|routes|Traceback|File |rror' ;;
    grade) POSTER_TS=$POSTER_TS OUT=$OUT DEST=$DEST NAME=${NAME:-beauty} Q=${QW:-98} nice -n 10 $B -b --factory-startup -P grade.py 2>&1 | grep -E 'webp|text area|percentiles|Traceback|File |rror' ;;
  esac
done
