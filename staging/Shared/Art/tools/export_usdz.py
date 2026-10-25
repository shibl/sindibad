"""Convert selected shared GLBs for Swift/RealityKit, without opening Blender UI.

Blender --background --factory-startup --python export_usdz.py -- sea/letters
Output: Shared/Art/derived/usdz/<asset-id>.usdz (generated, not a second source).
"""
from pathlib import Path
import sys
import bpy

art = Path(__file__).resolve().parents[1]
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if not args:
    raise SystemExit("Pass one or more manifest model IDs, for example: sea/letters farm/shamiCow")
for asset_id in args:
    source = (art / "models" / f"{asset_id}.glb").resolve()
    if not source.is_relative_to((art / "models").resolve()) or not source.is_file():
        raise SystemExit(f"Unknown model ID: {asset_id}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    target = art / "derived/usdz" / f"{asset_id}.usdz"
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.usd_export(filepath=str(target), export_materials=True, export_textures_mode="NEW")
    if not target.is_file() or target.stat().st_size == 0:
        raise RuntimeError(f"Empty USDZ: {target}")
    print(f"EXPORTED_USDZ {asset_id} {target.stat().st_size} bytes")
