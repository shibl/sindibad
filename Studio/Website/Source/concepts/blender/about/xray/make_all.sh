#!/bin/zsh
# Regenerates every X-ray lens asset from nothing: land, cloud, world, simulation, renders, passes, sprite and the inlined poster.
#   CACHE=/some/scratch/dir ./make_all.sh
# Set DEST and POSTER_TS as well to write somewhere other than the live folders.
# About 15 minutes on an M5 Pro. The cache holds several GB of voxel, mesh and EXR data, so keep it out of the repo.
# Change SEED or AGENTS (see sim.py) for a different simulation; the land and the render don't depend on either.
set -e
HERE=${0:A:h}
ROOT=${HERE:h:h:h:h}
CACHE=${CACHE:-/tmp/xray-cache}
DEST=${DEST:-$ROOT/public/about/xray}
POSTER_TS=${POSTER_TS:-$ROOT/src/about/xray/poster.ts}
mkdir -p $CACHE $DEST
cd $HERE
OUT=$CACHE DEST=$DEST RES=0.32 RELAX=5 Q=1.25 W=2560 SPP=192 DW=5120 PW=2560 VOLB=8 QW=97 POSTER_TS=$POSTER_TS \
  ./run_draft.sh terrain clouds build sim data render grade passes
ROOT=$ROOT DEST=$DEST nice -n 10 /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P sprite.py
