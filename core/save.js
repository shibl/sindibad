// Local save data (localStorage). No server, no accounts, nothing leaves the
// device. Everything the game remembers lives in one JSON object:
//
//   {
//     version: 1,
//     hero: 'sindbad' | 'yasmina' | null,   // chosen character
//     topics: { [topicId]: { stars: 0–3, best: 0–1, plays: n, last: ms } },
//     review: { [topicId]: { due: ms, box: n } }  // spaced-review schedule
//     muted: false
//   }
//
// Storage can be missing or throw (private mode, blocked site data), so every
// access is wrapped and the game keeps working in memory if it fails.

const KEY = 'sindbad.save.v1';

function fresh() {
  return { version: 1, hero: null, topics: {}, review: {}, muted: false };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* fall through to a fresh save */ }
  return fresh();
}

let state = load();

export const save = {
  get: () => state,
  // Mutate the save through a callback, then persist it.
  update(fn) {
    fn(state);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* in-memory only */ }
    return state;
  },
  reset() {
    state = fresh();
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
};
