"""Lossless container conversion of the repository's OFL fonts, not new art.
Run with: uv run --with fonttools --with brotli fonts.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from shutil import copyfile

art = Path(__file__).resolve().parents[1]
repo = art.parents[1]
(art / "fonts").mkdir(parents=True, exist_ok=True)
(art / "licenses").mkdir(exist_ok=True)
for weight in (500, 800):
    for script in ("arabic", "latin"):
        font = TTFont(repo / f"Web/fonts/baloo-bhaijaan-2-{script}-{weight}-normal.woff2", recalcTimestamp=False)
        font.flavor = None
        font.save(art / f"fonts/baloo_{script}_{weight}.ttf")
copyfile(repo / "Web/fonts/OFL.txt", art / "licenses/Baloo-OFL.txt")
