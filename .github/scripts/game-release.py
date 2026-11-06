"""Version verified Pages publications separately from Studio website releases."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request


def api(path, body=None):
    command = ['gh', 'api', path]
    if body is not None:
        command += ['--method', 'POST', '--input', '-']
    return json.loads(subprocess.check_output(command, input=None if body is None else json.dumps(body).encode()))


def choose_tag(refs, sha, staging, run_id, attempt):
    # Continue the game's existing v2.0 release in its own namespace.
    stable = [(2, 0, 0)]
    for ref in refs:
        match = re.fullmatch(r'refs/tags/game/v(\d+)\.(\d+)\.(\d+)', ref['ref'])
        if match:
            stable.append(tuple(map(int, match.groups())))
            if not staging and ref['object']['sha'] == sha:
                return ref['ref'].removeprefix('refs/tags/')
    major, minor, patch = max(stable)
    tag = f'game/v{major}.{minor}.{patch + 1}'
    return tag + (f'-staging.{run_id}.{attempt}' if staging else '')


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Sindibad-Game-Deployment/1.0', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError('Public game endpoint is not healthy')
        return response.read()


def wait_for_publication(url, expected, timeout=600):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            actual = json.loads(fetch(f'{url}__game_release.json?run={expected["run_id"]}&attempt={expected["attempt"]}'))
            if actual == expected:
                fetch(url)
                fetch(url + 'Web/')
                return
        except Exception as error:
            print(f'Waiting for public game publication: {type(error).__name__}', flush=True)
        time.sleep(10)
    raise TimeoutError('The exact game release did not appear over public HTTPS')


def relabel_legacy(repository):
    # Pages can create its own github-pages records. Preserve their history and
    # status while assigning the game's descriptive environment name.
    for old, new in [('github-pages', 'game-production'), ('staging', 'game-staging')]:
        while True:
            deployments = api(f'repos/{repository}/deployments?environment={old}&per_page=100')
            if not deployments:
                break
            changed = False
            for deployment in deployments:
                base = f'repos/{repository}/deployments/{deployment["id"]}'
                statuses = api(base + '/statuses')
                if not statuses or statuses[0]['state'] in ('queued', 'pending', 'in_progress'):
                    continue
                previous = statuses[0]
                body = {key: previous.get(key) or '' for key in ['state', 'environment_url', 'log_url', 'description']}
                body.update(environment=new, auto_inactive=False)
                api(base + '/statuses', body)
                changed = True
            if not changed:
                break


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['prepare', 'publish'])
    parser.add_argument('--directory', type=Path)
    parser.add_argument('--url')
    args = parser.parse_args()
    repo, sha, branch = (os.environ[key] for key in ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF_NAME'])
    if branch not in ('main', 'staging'):
        raise ValueError('Only game main and staging branches can publish releases')
    staging = branch == 'staging'
    record = Path(os.environ['RUNNER_TEMP']) / 'game-release.json'
    if args.command == 'prepare':
        tag = choose_tag(api(f'repos/{repo}/git/matching-refs/tags/game/v'), sha, staging,
                         os.environ['GITHUB_RUN_ID'], os.environ['GITHUB_RUN_ATTEMPT'])
        metadata = dict(repository=repo, sha=sha, branch=branch, environment='game-staging' if staging else 'game-production',
                        run_id=os.environ['GITHUB_RUN_ID'], attempt=os.environ['GITHUB_RUN_ATTEMPT'], tag=tag)
        record.write_text(json.dumps(metadata) + '\n')
        (args.directory / '__game_release.json').write_bytes(record.read_bytes())
        return
    metadata = json.loads(record.read_text())
    if metadata['sha'] != sha or metadata['repository'] != repo or metadata['branch'] != branch:
        raise ValueError('Release metadata does not belong to this publication')
    wait_for_publication(args.url, metadata)
    tag = metadata['tag']
    refs = api(f'repos/{repo}/git/matching-refs/tags/{tag}')
    exact = [ref for ref in refs if ref['ref'] == f'refs/tags/{tag}']
    if exact and exact[0]['object']['sha'] != sha:
        raise ValueError('Refusing to move an existing game tag')
    if not exact:
        api(f'repos/{repo}/git/refs', {'ref': f'refs/tags/{tag}', 'sha': sha})
    notes = Path(os.environ['RUNNER_TEMP']) / 'game-release-notes.md'
    gate = 'Staging publishes without the production test suite, following the existing staging policy.' if staging else 'The repository test gate passed before production publishing.'
    notes.write_text(f'Game {"staging" if staging else "production"}: {args.url}\n\nSource: `{sha}`\n\n{gate}\n\nThe exact release marker and both game entry pages passed public HTTPS checks.\n\nWorkflow: https://github.com/{repo}/actions/runs/{metadata["run_id"]}\n')
    found = subprocess.run(['gh', 'release', 'view', tag, '--repo', repo], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if found.returncode:
        command = ['gh', 'release', 'create', tag, '--repo', repo, '--verify-tag', '--title', tag,
                   '--notes-file', str(notes), '--latest=false']
        if staging:
            command += ['--prerelease']
        subprocess.run(command, check=True)
    relabel_legacy(repo)
    print(f'Verified and tagged {tag}', flush=True)


if __name__ == '__main__':
    main()
