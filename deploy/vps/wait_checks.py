"""For Sindibad production, require the existing game/publication check job too."""
import json
import os
import subprocess
import time


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], timeout=60))


if __name__ == '__main__':
    if os.environ['GITHUB_REF_NAME'] != 'main':
        print('Preview is gated by the website tests and build in this workflow.')
        raise SystemExit(0)
    repository, sha = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_SHA']
    for _ in range(160):
        runs = api(f'repos/{repository}/actions/workflows/site.yml/runs?head_sha={sha}&branch=main&per_page=10')['workflow_runs']
        runs = [r for r in runs if r['event'] in ('push', 'workflow_dispatch')]
        if runs:
            current = max(runs, key=lambda r: (r['id'], r['run_attempt']))
            jobs = api(f'repos/{repository}/actions/runs/{current["id"]}/jobs')['jobs']
            check = next((j for j in jobs if j['name'] == 'test'), None)
            if check and check['status'] == 'completed':
                if check['conclusion'] != 'success':
                    raise RuntimeError('Existing repository checks failed; production deployment blocked')
                print('Existing repository test gate passed for this exact commit.')
                break
            if current['status'] == 'completed' and current['conclusion'] != 'success':
                raise RuntimeError('Existing check workflow failed before its test gate passed')
        print('Waiting for the existing repository checks...', flush=True)
        time.sleep(15)
    else:
        raise TimeoutError('Existing repository checks did not finish within 40 minutes')
