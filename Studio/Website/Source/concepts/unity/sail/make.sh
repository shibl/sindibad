#!/bin/zsh
# Rebuilds everything from nothing: models, textures, sounds, the poster, the game's player and the copy in the site.
#   concepts/unity/sail/make.sh [assets|poster|player|all]        (default all)
# Unity is 6000.6.7f1, in batch mode on this project only, so it doesn't touch any other Unity window.
set -e
cd "$(dirname "$0")"
P=$PWD
REPO=$(cd ../../.. && pwd)
SITE=$REPO/public/about/sail
B=/Applications/Blender.app/Contents/MacOS/Blender
U=/Applications/Unity/Hub/Editor/6000.6.7f1/Unity.app/Contents/MacOS/Unity
WHAT=${1:-all}
WORK=${WORK:-$(mktemp -d)}

assets() {
  OUT=$P/Assets/Art nice -n 10 $B -b --factory-startup -P blender/world.py
  OUT=$P/Assets/Art/Textures nice -n 10 $B -b --factory-startup --python blender/gen_textures.py
  OUT=$P/Assets/Audio nice -n 10 $B -b --factory-startup --python blender/gen_audio.py
}

poster() {
  mkdir -p $SITE
  for M in wide tall; do
    OUT=$WORK MODE=$M SPP=${SPP:-256} nice -n 10 $B -b blender/world.blend -P $REPO/concepts/blender/about/sail/keyart.py
    IN=$WORK MODE=$M SITE=$SITE nice -n 10 $B -b --factory-startup --python $REPO/concepts/blender/about/sail/grade.py
  done
}

player() {
  # Twice, because phones need ASTC textures and desktops DXT. Only the data file differs between the two.
  SAIL_OUT=Build/sail-game nice -n 5 $U -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod SailBuild.All -logFile $WORK/build.log
  SAIL_ASTC=1 SAIL_OUT=Build/sail-astc nice -n 5 $U -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod SailBuild.WebGL -logFile $WORK/build-astc.log
  rm -rf $SITE/game
  mkdir -p $SITE/game/Build
  cp Build/sail-game/index.html $SITE/game/
  cp Build/sail-game/Build/* $SITE/game/Build/
  cp Build/sail-astc/Build/sail-astc.data.unityweb $SITE/game/Build/sail-game-astc.data.unityweb
  du -sh $SITE/game/Build/*
}

case $WHAT in
  assets) assets ;;
  poster) poster ;;
  player) player ;;
  all) assets; poster; player ;;
esac
