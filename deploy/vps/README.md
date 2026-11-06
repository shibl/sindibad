# Tested VPS deployments

`shibl/sindibad` owns this site's deployment history and releases.

| Branch | GitHub environment | Website |
| --- | --- | --- |
| `main` | `sindibad-production` | https://sindibad.studio |
| `studio-staging` | `sindibad-staging` | https://staging.sindibad.studio |

Push to `studio-staging` to preview changes. Merge reviewed changes into `main` to publish production automatically after tests and the production build succeed. Pull requests run checks without deploying. Sindibad's existing game `staging` branch and Pages workflow remain separate; production also waits for the existing repository test job for the exact commit.

Every successful deployment verifies its commit, workflow run and attempt at `/__release.json`, plus English and Arabic pages over public HTTPS. It then creates an immutable Git tag and GitHub release. Production starts at `sindibad/v1.0.0` and increments the patch number; staging uses `sindibad/v1.0.0-staging.RUN.ATTEMPT` prereleases. Failed builds and deployments create no release. Reruns of the same production commit reuse its existing tag. To intentionally start a new major/minor series, maintainers may create its stable release tag on the desired commit; subsequent deployments continue from the highest stable version.

## Server operation

GitHub-hosted runners build static files. The VPS polls the workflow every 30 seconds using its existing GitHub CLI identity, accepts only successful build artifacts from this repository's allowed branches, verifies provenance and SHA-256 checksums, and replaces the site's Caddy container. It never executes code from the artifact. The server agent is installed separately and cannot be updated by a repository workflow. No SSH private key is stored in GitHub.

Containers share the existing `coolify` proxy network, expose no host port, run as UID 10001 with read-only filesystems, and serve HTTPS through Traefik and Cloudflare. Staging is public but returns `X-Robots-Tag: noindex, nofollow, noarchive`; it is not access controlled. DNS uses a proxied `staging` A record to the existing VPS.

The trusted server agent and configuration live in `/opt/github-deploy`. Existing production Compose files are backed up before activation. A failed activation or HTTPS check restores the preceding Compose deployment. Releases remain on disk for rollback; review disk usage periodically. Uploaded Actions artifacts expire after seven days.

Use the persistent identity `ssh sindibad-vps`. Do not create or rotate SSH keys.

```sh
ssh sindibad-vps 'systemctl status github-deploy.timer --no-pager'
ssh sindibad-vps 'journalctl -u github-deploy.service -n 80 --no-pager'
# Restore the previous production deployment (the next new push still deploys):
ssh sindibad-vps 'python3 /opt/github-deploy/agent.py --rollback sindibad-production'
# Pause all four automatic VPS environments if necessary:
ssh sindibad-vps 'systemctl stop github-deploy.timer'
# Resume:
ssh sindibad-vps 'systemctl start github-deploy.timer'
```

After fixing a deployment failure, rerun **all jobs** in the Actions run, so a fresh artifact and attempt are validated. GitHub's deployment history is historical; a manual server rollback does not rewrite past workflow results or tags. The live `/__release.json` marker is the authoritative running version.

## Validation

Run `python3 -m unittest discover -s deploy/vps -p 'test_*.py' -v` for provenance, checksum, traversal, symlink, workflow eligibility, and rollback tests. The workflow also validates every built HTML entry's local assets using `check_site.py`. These checks do not constitute browser or device testing.
