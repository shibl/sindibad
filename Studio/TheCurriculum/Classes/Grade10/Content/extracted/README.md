# Grade 10 Scientific — Chemistry & Physics: full transcription

A complete, page-by-page Markdown transcription of the two Syrian Grade 10 (Scientific track) textbooks, produced from the
page images (the PDFs' own text layer is unreliable: garbled ligatures, broken math). The text stays in the books' Arabic,
exactly as printed. It is meant as the content source for the game.

| Book | Source | Pages | Figures described | Tables | Boxes (activities, summaries, self-tests…) |
|---|---|---|---|---|---|
| الكيمياء | `k10al.pdf` | 156 | 182 | 45 | 253 |
| الفيزياء | `ph10al.pdf` | 232 | 319 | 47 | 310 |

## Layout

```
extracted/
├── content-map.json          units → lessons → page ranges, headings, box types, counts (start here)
├── chemistry/
│   ├── chemistry-full.md     the whole book in one file
│   ├── chemistry-errata.md   apparent errors in the book itself + unclear spots, by page
│   └── lessons/              one file per lesson: U1-L1.md … plus front matter, unit openers, unit questions (U*-Q)
├── physics/
│   ├── physics-full.md
│   ├── physics-errata.md
│   └── lessons/              U1-L1.md … U4-L6.md, plus projects (U1-P, U3-P)
└── pages/                    the raw per-page files (p-001.md …), if you need exact page granularity
```

PDF page number = printed page number. Every page starts with a marker `<!-- page N -->`.

## Conventions

- **Headings** follow the book's numbering: `#` unit, `##` lesson (e.g. `## 2-1 الحركة المستقيمة`), `###`/`####` sections.
- **Boxes** are blockquotes with the book's own label: `> **[نشاط (5)]**`, `> **[أجرب وأستنتج]**`, `> **[تعلمت]**`,
  `> **[أختبر نفسي]**`, `> **[تطبيق (3)]**`, `> **[الأهداف]**`, `> **[الكلمات المفتاحية]**` … — handy for pulling all
  objectives, key terms, worked examples or self-test questions per lesson.
- **Math** is LaTeX (`$…$`, `$$…$$`); **chemistry** uses mhchem (`$\ce{Zn(s) + CuSO4(aq) -> Cu(s) + ZnSO4(aq)}$`).
- **Tables** are Markdown tables (HTML `<table>` where cells are merged).
- **Figures**: `> 🖼️ **[الشكل …]** caption` followed by `> *وصف:* …` — the description is **our addition**, not book
  text (labels, values, axes, rays, circuit components…). Crop the actual image from the PDF page when you need art.
- **Questions** keep the book's numbering and answer letters (a–d). Worked solutions printed in the book are included;
  **no answers were added** for unsolved exercises.
- `[ملاحظة المُفرِّغ: …]` marks an apparent error in the book (transcribed as printed); `[غير واضح: …]` marks a spot
  that was illegible even when zoomed (only one, p.44 chemistry). Both are collected in the `*-errata.md` files.

## Verification

Each page was compared against the PDF text layer with a ligature-tolerant word match: average coverage 98.5%
(chemistry) and 99.2% (physics). Every remaining "miss" was checked and is a text-layer artifact, not missing content.
