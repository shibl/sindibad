// Made from env.ts by tools/build.ts. Edit that file, then run: npm run build
// Which copy of the game is this? The live game and the staging copy (where
// the developers try changes first) share one website: staging lives under
// /staging/ (.github/workflows/site.yml). So the staging copy keeps its own
// saves and its own offline copy (service-worker.js), and wears a ribbon.
// (Outside a browser, as in the tests' content check, it is neither.)
export const STAGING = typeof location !== 'undefined' && /\/staging\//.test(location.pathname);
// The name of something the game keeps in the browser:
//   storeKey('profiles') → 'sindbad.profiles' (live), 'sindbad-staging.profiles' (staging)
export const storeKey = (name) => `${STAGING ? 'sindbad-staging' : 'sindbad'}.${name}`;
// The game's server (Studio/Games/Sindibad-Yasmina/Backend): backups and
// stats. Play never waits for it; with no server nothing is sent.
//   live, staging: set when the server is deployed
//   on this computer or the local network: the Docker server on port 8080
//   ?api=<url> once: use that server on this device (?api=off: back to the default)
// The tests (window.__SINDBAD_TEST__) talk to no server unless given ?api=.
const API_LIVE = '';
const API_STAGING = '';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;
export function apiBase() {
    if (typeof location === 'undefined')
        return null;
    const key = storeKey('api');
    let chosen = null;
    try {
        const asked = new URLSearchParams(location.search).get('api');
        if (asked === 'off')
            localStorage.removeItem(key);
        else if (asked)
            localStorage.setItem(key, asked.replace(/\/+$/, ''));
        chosen = localStorage.getItem(key);
    }
    catch { /* Storage blocked: defaults only. */ }
    if (chosen)
        return chosen;
    if (typeof window !== 'undefined' && window.__SINDBAD_TEST__)
        return null;
    if (LOCAL_HOST.test(location.hostname))
        return `${location.protocol}//${location.hostname}:8080`;
    return (STAGING ? API_STAGING : API_LIVE) || null;
}
