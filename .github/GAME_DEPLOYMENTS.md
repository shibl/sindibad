# Game deployment names and releases

| Branch | GitHub environment | URL |
| --- | --- | --- |
| `main` | `game-production` | https://shibl.github.io/sindibad/ |
| `staging` | `game-staging` | https://shibl.github.io/sindibad/staging/ |

The environments formerly named `github-pages` and `staging` now use these game-specific names. Existing deployment records are relabeled by adding a status that preserves their outcome, URL and logs; history is not deleted. GitHub Pages can generate a built-in `github-pages` record during a build. Successful game publications relabel completed legacy records too. The old environment settings can remain for Pages compatibility while deployment records use the new names.

Production still requires the existing repository tests. Staging keeps its existing policy of publishing without the production test suite. Publication paths, offline saves, and Studio's VPS environments are unchanged.

After Pages finishes rebuilding, the workflow verifies the exact commit/run/attempt in `__game_release.json` and checks the public root and `Web/` entry pages. Only then does it create an immutable Git tag and GitHub release. Production tags start at `game/v2.0.1`, continuing the existing `v2.0` game release, and increase the patch number. Staging uses `game/v2.0.1-staging.RUN.ATTEMPT` prereleases. Existing tags are never moved. Reruns of an already released production commit reuse its tag.

Game releases use their own prefix and do not replace the repository's latest Studio release designation. Studio tags remain `sindibad/v...`; its environments remain `sindibad-production` and `sindibad-staging`.

Run `python3 .github/tests/test_game_release.py` to check version selection, rerun behavior, public-commit verification and preservation of deployment history.
