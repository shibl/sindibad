// Which copy of the game is this? The live game and the staging copy (where
// the developers try changes first) share one website: staging lives under
// /staging/ (.github/workflows/site.yml). So the staging copy keeps its own
// saves and its own offline copy (service-worker.js), and wears a ribbon.

// (Outside a browser, as in the tests' content check, it is neither.)
export const STAGING = typeof location !== 'undefined' && /\/staging\//.test(location.pathname);

// The name of something the game keeps in the browser:
//   storeKey('profiles') → 'sindbad.profiles' (live), 'sindbad-staging.profiles' (staging)
export const storeKey = (name: string) => `${STAGING ? 'sindbad-staging' : 'sindbad'}.${name}`;
