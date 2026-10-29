// Made from kit.ts by tools/build.ts. Edit that file, then run: npm run build
// A small helper for the English island's content (worlds/grade6/english/).
// Draft content, pending review by Syrian educators. CC-BY-SA.
//
// en('…') marks English inside an Arabic sentence, so it reads left to
// right and keeps its punctuation in place inside the right-to-left game:
//   q: `اختر الكلمة: ${en('Those tickets are ___.')}`
export const en = (t) => `<bdi class="en" dir="ltr" lang="en">${t}</bdi>`;
