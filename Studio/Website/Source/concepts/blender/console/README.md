# Sindibad pocket console

Original collectible device designed and modeled in Blender 5.2, with no
external models or textures. Rebuild from the website Source directory:

    nice -n 10 /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P concepts/blender/console/build.py

Append -- --draft for 630px draft. Final is a 900px transparent WebP poster,
160 Cycles samples, and an editable console.blend with camera/material viewport.
Exported model is public/console/console.glb. Review composite (exact footer
green #013f3b) is /tmp/sindibad-console-art/preview.png, not distributed.

Hollow translucent-pink perimeter shell; visible pearl structural core and
teal/gold rear PCB; chrome d-pad; tactile pearl-blue and pink action buttons;
rounded dark display; original SINDIBAD wordmark; status LED, speaker apertures,
shoulder buttons, screws, USB-C recess and case seam. All are modeled geometry.

Blender units: x width 2.45, y depth .57, z height 3.8; front is -Y, centered
at origin. Camera [4,-11,4], orthographic scale 4.85, target origin. GLB
converts automatically to Y-up: runtime camera [4,4,11], front +Z.

Named meshes/nodes: DisplayScreen (planar rounded mesh, UV 0..1), FaceEyeL,
FaceEyeR, FaceMouth, DPad, ActionA, ActionB. Each facial node and button has its
own centered origin. The eye vertical axis is localY in Blender (localZ after
GLB conversion), already scaled 1.65; the mouth vertical axis is localZ in
Blender (localY after conversion). Button depression is -Z in runtime.
Display plane Blender y=-.355, center z=.70, size 1.86 x 1.54.

Material names: ShellPink, Chrome, Core, PCB, Gold, Screen, Eye, Mouth,
ButtonPearl, ButtonPink, Seams, Wordmark. Original PBR materials are exported;
the web renderer can adapt reflections and transmission for its environment.
