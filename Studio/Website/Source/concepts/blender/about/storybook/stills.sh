#!/bin/bash
# Shoots the four stills from the running page, then converts them. Run from the repo root with the dev server up:
#   SCRATCH=<dir> bash concepts/blender/about/storybook/stills.sh
SHOT=scripts/about-shot.ts
HIDE="document.querySelector('.sb-ink').style.visibility='hidden';document.querySelector('.sb-tab').style.visibility='hidden';document.querySelector('.sb').style.background='#fff'"
bun $SHOT --id storybook --w 1600 --h 1000 --ps 1 --clean --settle 1400 --eval "$HIDE" --out $SCRATCH/still-wide-en | tail -1
bun $SHOT --id storybook --lang ar --w 1600 --h 1000 --ps 1 --clean --settle 1400 --eval "$HIDE" --out $SCRATCH/still-wide-ar | tail -1
bun $SHOT --id storybook --phone --dpr 2 --ps 1 --clean --settle 1400 --eval "$HIDE" --out $SCRATCH/still-tall-en | tail -1
bun $SHOT --id storybook --phone --dpr 2 --lang ar --ps 1 --clean --settle 1400 --eval "$HIDE" --out $SCRATCH/still-tall-ar | tail -1
ROOT=$PWD SCRATCH=$SCRATCH nice -n 10 /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P concepts/blender/about/storybook/stills.py 2>&1 | grep -E 'KB|Error'
