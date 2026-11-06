# Sindibad Studios website — Design A

The Studio website is Design A from
[sam-a1a/sindibad-studio-design-a](https://github.com/sam-a1a/sindibad-studio-design-a),
imported from `main` at commit `dd6cf8a52aad92d33af93fce054218587f7e6651` on 2026-11-06.
It replaces both the old Studio website and the multi-design preview.

- [Source](Source/README.md): the complete tracked upstream source, including artwork and Unity projects.
- [Published build](Designs/README.md): generated English, Arabic, and portal pages.
- [Legacy links](Web/README.md): redirects from the old Studio pages.
- [Publishing](Infra/README.md): how the build reaches GitHub Pages.
- [Android](Android/README.md) and [iOS](iOS/README.md): reserved studio applications.

Live: https://shibl.github.io/sindibad/studio/
Arabic: https://shibl.github.io/sindibad/studio/ar/

`Source/` is an exact snapshot of the upstream commit, without `.git`, dependencies,
or generated build directories. The build uses `BASE_PATH=/sindibad/studio`.
The existing source-only/no-testing instruction applies to work in this repository;
build upstream for publication, then replace `Designs/Web/` with the generated output.

Playable curriculum experiences remain in
[Sindibad & Yasmina](../Games/Sindibad-Yasmina/README.md), including the Grade 10
Chemistry Lab. They are not part of this website replacement.
