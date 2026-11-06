# Claw game

The Unity project behind the claw machine in the hero. It builds entirely from scripts, in batch mode, so nothing here needs
the editor's window, though the project opens normally in Unity 6000.6.

    # 1. Geometry, textures, sounds and the arcade backdrop (Blender 5, Python 3)
    OUT=$PWD/Assets/Art blender -b --factory-startup -P blender/claw_game.py
    OUT=$PWD/Assets/Art/Textures blender -b --factory-startup --python blender/gen_textures.py
    OUT=$PWD/Assets/Art/Textures SPP=128 blender -b --factory-startup -P blender/arcade_pano.py   # then delete _pano_raw.exr
    OUT=$PWD/Assets/Audio python3 blender/gen_audio.py

    # 2. Settings, materials, scene and player. Twice, because phones need ASTC textures and desktops DXT.
    #    CLAW_ASTC=1 and CLAW_OUT pick the texture format and the folder.
    Unity -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod ClawBuild.All

    # 3. Copy Build/claw-game/* to public/concepts/claw-game/ in the site, and the ASTC build's
    #    claw-game.data.unityweb to Build/claw-game-astc.data.unityweb beside it.

`ClawBuild.Scene` regenerates `Assets/Scenes/Claw.unity` and all materials on every run, so change them in
`Assets/Editor/ClawBuild.cs`, not in the editor. `ClawBuild.SceneAndShots` writes stills to `$CLAW_SHOTS` without a player build.

All the words on screen belong to the site, in `src/claw.ts`, which sends and receives messages through the page in
`Assets/WebGLTemplates/Claw/index.html`.
