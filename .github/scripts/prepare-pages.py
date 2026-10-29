"""Assemble the public site without tying its URLs to repository folders."""
from pathlib import Path
import argparse
import html
import json
import posixpath
import shutil


GRADE6 = Path("Studio/Games/Sindibad-Yasmina/Classes/Grade6")
WEBSITE = Path("Studio/Website/Web")
CHEMISTRY = Path("Studio/Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web")
# Built design drafts for the studio website (Studio/Website/Designs/README.md), published at
# /studio/ when present; the game publishes without them. studio/ sits next to the Studio/
# folder, so this needs a case-sensitive file system, as on the Actions runner.
DESIGNS = Path("Studio/Website/Designs/Web")
IGNORED = shutil.ignore_patterns("node_modules", ".git", ".DS_Store", "__pycache__", ".preview")


def redirect(output: Path, old: Path, target: Path):
    relative = posixpath.relpath(target.as_posix(), old.parent.as_posix())
    page = output / old
    page.parent.mkdir(parents=True, exist_ok=True)
    page.write_text(
        '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
        f'<meta http-equiv="refresh" content="0; url={html.escape(relative, quote=True)}">\n'
        f'<script>location.replace({json.dumps(relative)} + location.search + location.hash);</script>\n'
        f'</head><body><a href="{html.escape(relative, quote=True)}">Continue</a></body></html>\n',
        encoding="utf-8",
    )


def prepare(source: Path, output: Path):
    source, output = source.resolve(), output.resolve()
    if output == source or source.is_relative_to(output) or output.is_relative_to(source):
        raise ValueError("The output must be outside the source checkout")
    if output.exists() and any(output.iterdir()):
        raise ValueError("The output directory must be empty")
    # Refuse incomplete input before writing any deployment files.
    for path in [GRADE6 / "Web/index.html", GRADE6 / "Web/service-worker.js",
                 GRADE6 / "Infra/Pages/index.html", GRADE6 / "Infra/Pages/service-worker.js",
                 GRADE6 / "docs/original-project-brief.pdf", WEBSITE / "home/index.html",
                 CHEMISTRY / "lab.html"]:
        if not (source / path).is_file():
            raise FileNotFoundError(f"Missing publication input: {path}")
    output.mkdir(parents=True, exist_ok=True)
    for origin, destination in [(GRADE6 / "Web", Path("Web")),
                                (GRADE6 / "docs", Path("docs")),
                                (WEBSITE, WEBSITE), (CHEMISTRY, CHEMISTRY)]:
        shutil.copytree(source / origin, output / destination, ignore=IGNORED)
    if (source / DESIGNS / "index.html").is_file():
        shutil.copytree(source / DESIGNS, output / "studio", ignore=IGNORED)
    for name in ["index.html", "service-worker.js"]:
        shutil.copyfile(source / GRADE6 / "Infra/Pages" / name, output / name)
    # Keep bookmarks for the previous Studio/Web tree, including deep pages.
    for page in sorted((output / WEBSITE).rglob("*.html")):
        relative = page.relative_to(output / WEBSITE)
        redirect(output, Path("Studio/Web") / relative, WEBSITE / relative)
    redirect(output, Path("Studio/Web/lab.html"), CHEMISTRY / "lab.html")
    redirect(output, WEBSITE / "lab.html", CHEMISTRY / "lab.html")
    for name in ["index.html", "lab.html"]:
        redirect(output, Path("Studio/TheCurriculum/Classes/Grade10/Chemistry/Web") / name, CHEMISTRY / name)
    redirect(output, Path("Studio/index.html"), WEBSITE / "home/index.html")
    (output / ".nojekyll").touch()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.output)
    print(f"Prepared public Web/, studio website, design drafts and Grade 10 Chemistry Lab in {args.output}")
