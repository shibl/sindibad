"""Build an immutable static-site release and confirm it over public HTTPS."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import time
import urllib.request


def api(path, method='GET', body=None):
    args = ['gh', 'api', '--method', method, path]
    if body is not None:
        args += ['--input', '-']
    return json.loads(subprocess.check_output(args, input=None if body is None else json.dumps(body).encode()))


def version(site, environment, repository, sha):
    refs = api(f'repos/{repository}/git/matching-refs/tags/{site}/v')
    stable = []
    for ref in refs:
        match = re.fullmatch(r'refs/tags/' + re.escape(site) + r'/v(\d+)\.(\d+)\.(\d+)', ref['ref'])
        if match:
            number = tuple(map(int, match.groups()))
            stable.append(number)
            if environment == 'production' and ref['object']['sha'] == sha:
                return ref['ref'].removeprefix('refs/tags/')
    major, minor, patch = max(stable) if stable else (1, 0, -1)
    tag = f'{site}/v{major}.{minor}.{patch + 1}'
    if environment == 'staging':
        tag += f'-staging.{os.environ["GITHUB_RUN_ID"]}.{os.environ["GITHUB_RUN_ATTEMPT"]}'
    return tag


def package(dist, output, metadata):
    # GitHub Pages' marker is unnecessary on Caddy; keep other hidden files rejected.
    files = sorted(p for p in dist.rglob('*') if p.is_file() and p.relative_to(dist).as_posix() != '.nojekyll')
    if not (dist / 'index.html').is_file() or not (dist / 'ar/index.html').is_file():
        raise ValueError('Both English and Arabic entries are required')
    for path in dist.rglob('*'):
        if path.is_symlink():
            raise ValueError(f'Symlinks are forbidden: {path}')
    hashes = {p.relative_to(dist).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    output.mkdir(parents=True, exist_ok=True)
    manifest = output / 'manifest.json'
    manifest.write_text(json.dumps({'release': metadata, 'files': hashes}, indent=2) + '\n')
    archive = output / 'release.tar.gz'
    with tarfile.open(archive, 'w:gz') as tar:
        tar.add(manifest, arcname='manifest.json')
        for path in files:
            tar.add(path, arcname='site/' + path.relative_to(dist).as_posix(), recursive=False)
    return archive


def wait_for_release(url, sha, run_id, attempt, timeout=900):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            request = urllib.request.Request(
                f'{url}/__release.json?run={run_id}&attempt={attempt}', headers={'Cache-Control': 'no-cache', 'User-Agent': 'SyrAI-Deployment-Health/1.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                current = json.load(response)
            if (current.get('sha'), str(current.get('run_id')), str(current.get('attempt'))) == (sha, str(run_id), str(attempt)):
                for path in ['/', '/ar/']:
                    with urllib.request.urlopen(urllib.request.Request(url + path, headers={'User-Agent': 'SyrAI-Deployment-Health/1.0'}), timeout=20) as response:
                        if response.status != 200:
                            raise ValueError(f'Health check failed: {path}')
                return current
        except Exception as error:
            print(f'Waiting for VPS: {type(error).__name__}', flush=True)
        time.sleep(15)
    raise TimeoutError('The VPS did not serve this exact release within 15 minutes')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['package', 'wait', 'publish'])
    parser.add_argument('--site', required=True, choices=['syrai', 'sindibad'])
    parser.add_argument('--dist', type=Path)
    parser.add_argument('--url')
    args = parser.parse_args()
    repository, sha = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_SHA']
    branch = os.environ['GITHUB_REF_NAME']
    if branch not in ('main', 'studio-staging'):
        raise ValueError('Only main and studio-staging can deploy')
    environment = 'production' if branch == 'main' else 'staging'
    if args.command == 'package':
        tag = version(args.site, environment, repository, sha)
        metadata = dict(site=args.site, environment=environment, repository=repository,
                        sha=sha, branch=branch, run_id=os.environ['GITHUB_RUN_ID'],
                        attempt=os.environ['GITHUB_RUN_ATTEMPT'], tag=tag)
        package(args.dist, Path('.vps-release'), metadata)
        if os.getenv('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
                output.write(f'tag={tag}\nenvironment={args.site}-{environment}\n')
        print(f'Packaged {tag} from {sha}')
    elif args.command == 'wait':
        release = wait_for_release(args.url, sha, os.environ['GITHUB_RUN_ID'], os.environ['GITHUB_RUN_ATTEMPT'])
        Path('verified-release.json').write_text(json.dumps(release))
        print(f'Verified {release["tag"]} at {args.url}')
    else:
        release = json.loads(Path('verified-release.json').read_text())
        tag = release['tag']
        existing = api(f'repos/{repository}/git/matching-refs/tags/{tag}')
        exact = [ref for ref in existing if ref['ref'] == f'refs/tags/{tag}']
        if exact and exact[0]['object']['sha'] != sha:
            raise ValueError('Refusing to move an existing release tag')
        if not exact:
            api(f'repos/{repository}/git/refs', 'POST', {'ref': f'refs/tags/{tag}', 'sha': sha})
        notes = (f'Deployed **{args.site} {environment}** to {args.url}.\n\n'
                 f'Source commit: `{sha}`\n\n'
                 f'Workflow: https://github.com/{repository}/actions/runs/{os.environ["GITHUB_RUN_ID"]}\n\n'
                 'Build checks, artifact integrity, container health, and public HTTPS checks passed.\n')
        Path('release-notes.md').write_text(notes)
        found = subprocess.run(['gh', 'release', 'view', tag, '--repo', repository], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if found.returncode:
            command = ['gh', 'release', 'create', tag, '--repo', repository, '--verify-tag',
                       '--title', tag, '--notes-file', 'release-notes.md']
            if environment == 'staging':
                command += ['--prerelease', '--latest=false']
            subprocess.run(command, check=True)


if __name__ == '__main__':
    main()
