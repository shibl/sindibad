"""Pull verified Actions artifacts; never execute repository code on the VPS."""
import argparse
import base64
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.request
import zipfile

ROOT = Path('/opt/github-deploy')
MAX_BYTES = 350 * 1024 * 1024


def run(*args, **kwargs):
    return subprocess.run(args, check=True, timeout=kwargs.pop('timeout', 180), **kwargs)


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], timeout=60))


def eligible(workflow, jobs, repository, environment):
    branch = 'main' if environment == 'production' else 'studio-staging'
    return (workflow.get('event') in ('push', 'workflow_dispatch')
            and workflow.get('head_branch') == branch
            and workflow.get('head_repository', {}).get('full_name', '').lower() == repository.lower()
            and workflow.get('path') == '.github/workflows/vps.yml'
            and workflow.get('status') == 'in_progress'
            and any(j['name'] == 'Build and test' and j['conclusion'] == 'success' for j in jobs)
            and any(j['name'] == 'Deploy to VPS' and j['status'] == 'in_progress' for j in jobs))


def safe_name(name):
    path = PurePosixPath(name)
    if (path.is_absolute() or '..' in path.parts or '\\' in name
            or any(part.startswith('.') for part in path.parts)
            or name != path.as_posix() or any(ord(c) < 32 for c in name)):
        raise ValueError(f'Unsafe release path: {name!r}')
    return path


def unpack(archive, destination, expected):
    """Validate the entire archive before creating any site file."""
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        if len(members) > 10000 or sum(m.size for m in members) > MAX_BYTES:
            raise ValueError('Release exceeds extraction limits')
        names = set()
        for member in members:
            safe_name(member.name)
            if not member.isfile() or member.name in names:
                raise ValueError('Only unique regular files are allowed')
            names.add(member.name)
        if 'manifest.json' not in names:
            raise ValueError('Missing manifest')
        manifest_member = tar.getmember('manifest.json')
        if manifest_member.size > 2 * 1024 * 1024:
            raise ValueError('Manifest too large')
        manifest = json.load(tar.extractfile(manifest_member))
        metadata = manifest['release']
        if any(str(metadata.get(k)) != str(v) for k, v in expected.items()):
            raise ValueError('Artifact provenance does not match the trusted workflow')
        tag_pattern = re.escape(metadata['site']) + r'/v\d+\.\d+\.\d+'
        if metadata['environment'] == 'staging':
            tag_pattern += r'-staging\.\d+\.\d+'
        if not re.fullmatch(tag_pattern, metadata.get('tag', '')):
            raise ValueError('Invalid release tag')
        files = manifest['files']
        if set(names) != {'manifest.json'} | {'site/' + name for name in files}:
            raise ValueError('Manifest does not describe every file')
        if not {'index.html', 'ar/index.html'}.issubset(files):
            raise ValueError('Missing language entry')
        for name, digest in files.items():
            safe_name(name)
            member = tar.getmember('site/' + name)
            data = tar.extractfile(member).read()
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError(f'Checksum mismatch: {name}')
        if destination.exists():
            raise ValueError('Release directory must be new')
        destination.mkdir(parents=True, mode=0o755)
        for name in files:
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(tar.extractfile('site/' + name).read())
            path.chmod(0o644)
        for path in destination.rglob('*'):
            if path.is_dir():
                path.chmod(0o755)
        (destination / '__release.json').write_text(json.dumps(metadata) + '\n')
        return metadata


def caddy_config(site, staging, directory):
    hashes = set()
    for path in directory.rglob('*.html'):
        for attrs, body in re.findall(rb'<script\b([^>]*)>(.*?)</script\s*>', path.read_bytes(), re.I | re.S):
            if body.strip() and not re.search(rb'\bsrc\s*=', attrs, re.I):
                hashes.add("'sha256-" + base64.b64encode(hashlib.sha256(body).digest()).decode() + "'")
    scripts = "'self' " + ' '.join(sorted(hashes))
    if site == 'sindibad':
        scripts += " blob: 'wasm-unsafe-eval'"
    csp = (f"default-src 'self'; script-src {scripts}; style-src 'self' 'unsafe-inline'; "
           "img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; "
           "object-src 'none'; base-uri 'self'; form-action 'self'; ")
    if site == 'sindibad':
        csp += "worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'"
        frame, permissions = 'SAMEORIGIN', 'camera=(self), microphone=(), geolocation=(), payment=(), accelerometer=(self), gyroscope=(self), xr-spatial-tracking=(self)'
    else:
        csp += "frame-ancestors 'none'; upgrade-insecure-requests"
        frame, permissions = 'DENY', 'camera=(), microphone=(), geolocation=(), payment=()'
    config = '''{
  admin off
  auto_https off
}
:8080 {
  root * /srv
  encode zstd gzip
  header {
    -Server
    Strict-Transport-Security "max-age=31536000"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
'''
    config += f'    X-Frame-Options {frame}\n    Permissions-Policy "{permissions}"\n    Content-Security-Policy "{csp}"\n'
    if staging:
        config += '    X-Robots-Tag "noindex, nofollow, noarchive"\n'
    config += '''  }
  @private path /.git* /.env* /node_modules/*
  respond @private 404
  header Cache-Control "public, max-age=0, must-revalidate"
  header /assets/* Cache-Control "public, max-age=31536000, immutable"
  header /__release.json Cache-Control "no-store"
'''
    if site == 'syrai':
        config += '''  @static path /assets/* /images/* /__release.json
  handle @static {
    file_server
  }
  handle {
    try_files {path} /index.html
    file_server
  }
'''
    else:
        config += '  file_server\n'
    return config + '}\n'


def compose(config, release):
    site, environment = config['site'], config['environment']
    name = f'{site}-{environment}'
    rule = ' || '.join(f'Host(`{domain}`)' for domain in config['domains'])
    labels = {'traefik.enable': 'true', 'traefik.docker.network': 'coolify',
              f'traefik.http.routers.{name}-http.rule': rule,
              f'traefik.http.routers.{name}-http.entrypoints': 'http',
              f'traefik.http.routers.{name}-http.middlewares': name + '-redirect',
              f'traefik.http.routers.{name}-http.service': name,
              f'traefik.http.middlewares.{name}-redirect.redirectscheme.scheme': 'https',
              f'traefik.http.middlewares.{name}-redirect.redirectscheme.permanent': 'true',
              f'traefik.http.routers.{name}-https.rule': rule,
              f'traefik.http.routers.{name}-https.entrypoints': 'https',
              f'traefik.http.routers.{name}-https.tls': 'true',
              f'traefik.http.routers.{name}-https.tls.certresolver': 'letsencrypt',
              f'traefik.http.routers.{name}-https.service': name,
              f'traefik.http.services.{name}.loadbalancer.server.port': '8080'}
    web = dict(image=config['image'], container_name=config['container'], restart='unless-stopped',
               user='10001:10001', read_only=True, cap_drop=['ALL'], security_opt=['no-new-privileges:true'],
               mem_limit='256m', pids_limit=100, environment={'XDG_CONFIG_HOME': '/config', 'XDG_DATA_HOME': '/data'},
               tmpfs=['/data:uid=10001,gid=10001,mode=700,size=16m', '/config:uid=10001,gid=10001,mode=700,size=16m', '/tmp:uid=10001,gid=10001,mode=700,size=16m'],
               volumes=[f'{release}/site:/srv:ro', f'{release}/Caddyfile:/etc/caddy/Caddyfile:ro'],
               networks=['coolify'], labels=labels,
               healthcheck={'test': ['CMD', 'wget', '-q', '--spider', 'http://127.0.0.1:8080/__release.json'],
                            'interval': '10s', 'timeout': '5s', 'retries': 3, 'start_period': '5s'},
               logging={'driver': 'json-file', 'options': {'max-size': '10m', 'max-file': '3'}})
    return {'name': config['project'], 'services': {'web': web}, 'networks': {'coolify': {'external': True}}}


def activate(config, candidate, previous, verify):
    def up(path):
        run('docker', 'compose', '-p', config['project'], '-f', str(path), 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90', 'web')
    try:
        up(candidate)
        verify()
    except Exception:
        if previous.exists():
            print('Health verification failed; restoring previous deployment', flush=True)
            up(previous)
        else:
            run('docker', 'compose', '-p', config['project'], '-f', str(candidate), 'down')
        raise


def public_health(config, expected):
    for attempt in range(18):
        try:
            url = f'https://{config["domains"][0]}'
            with urllib.request.urlopen(urllib.request.Request(f'{url}/__release.json?run={expected["run_id"]}&attempt={expected["attempt"]}', headers={'User-Agent': 'SyrAI-Deployment-Health/1.0'}), timeout=15) as response:
                actual = json.load(response)
            if actual != expected:
                raise ValueError('Public release marker is not the candidate')
            for path in ['/', '/ar/']:
                with urllib.request.urlopen(urllib.request.Request(url + path, headers={'User-Agent': 'SyrAI-Deployment-Health/1.0'}), timeout=15) as response:
                    if response.status != 200:
                        raise ValueError('Public language route failed')
            return
        except Exception:
            if attempt == 17:
                raise
            time.sleep(5)


def deploy(config, workflow):
    repository, site, environment = config['repository'], config['site'], config['environment']
    run_id, attempt = workflow['id'], workflow['run_attempt']
    name = f'vps-{site}-{run_id}-{attempt}'
    artifacts = api(f'repos/{repository}/actions/runs/{run_id}/artifacts')['artifacts']
    artifact = next(a for a in artifacts if a['name'] == name and not a['expired'])
    if artifact['size_in_bytes'] > MAX_BYTES:
        raise ValueError('Artifact too large')
    root = ROOT / f'{site}-{environment}'
    release = root / 'releases' / f'{workflow["head_sha"][:12]}-{run_id}-{attempt}'
    if release.exists():
        raise ValueError('Release was already attempted; rerun the complete workflow to retry')
    release.mkdir(parents=True, mode=0o755)
    expected = dict(site=site, environment=environment, repository=repository, sha=workflow['head_sha'],
                    branch=workflow['head_branch'], run_id=str(run_id), attempt=str(attempt))
    with tempfile.TemporaryDirectory(dir=ROOT / 'downloads') as temporary:
        archive = Path(temporary) / 'artifact.zip'
        with archive.open('wb') as output:
            run('gh', 'api', f'repos/{repository}/actions/artifacts/{artifact["id"]}/zip', stdout=output, timeout=300)
        digest = artifact.get('digest', '')
        if digest and digest != 'sha256:' + hashlib.sha256(archive.read_bytes()).hexdigest():
            raise ValueError('GitHub artifact digest mismatch')
        with zipfile.ZipFile(archive) as zipfile_:
            entries = zipfile_.infolist()
            if len(entries) != 1 or entries[0].filename != 'release.tar.gz' or entries[0].file_size > MAX_BYTES:
                raise ValueError('Unexpected artifact contents')
            tar_path = Path(temporary) / 'release.tar.gz'
            with zipfile_.open(entries[0]) as source, tar_path.open('wb') as output:
                shutil.copyfileobj(source, output)
        metadata = unpack(tar_path, release / 'site', expected)
    (release / 'Caddyfile').write_text(caddy_config(site, environment == 'staging', release / 'site'))
    for path in [release, release.parent, root]:
        path.chmod(0o755)
    run('docker', 'run', '--rm', '--network', 'none', '--user', '10001:10001',
        '-v', f'{release}/Caddyfile:/etc/caddy/Caddyfile:ro', '--entrypoint', 'caddy',
        config['image'], 'validate', '--config', '/etc/caddy/Caddyfile')
    candidate, previous = release / 'compose.json', root / 'current-compose.json'
    candidate.write_text(json.dumps(compose(config, release), indent=2))
    # The workflow must still be eligible immediately before touching the service.
    current = api(f'repos/{repository}/actions/runs/{run_id}')
    jobs = api(f'repos/{repository}/actions/runs/{run_id}/jobs')['jobs']
    if current['run_attempt'] != attempt or not eligible(current, jobs, repository, environment):
        raise ValueError('Workflow was cancelled or changed while downloading')
    activate(config, candidate, previous, lambda: public_health(config, metadata))
    if previous.exists():
        shutil.copy2(previous, root / 'previous-compose.json')
    shutil.copy2(candidate, root / 'current-compose.tmp')
    os.replace(root / 'current-compose.tmp', previous)
    (root / 'current-release.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'Deployed {metadata["tag"]} to {config["domains"][0]}', flush=True)


def tick(configs):
    for config in configs:
        try:
            repository = config['repository']
            branch = 'main' if config['environment'] == 'production' else 'studio-staging'
            workflows = api(f'repos/{repository}/actions/workflows/vps.yml/runs?branch={branch}&status=in_progress&per_page=5')['workflow_runs']
            for workflow in workflows:
                key = f'{config["site"]}-{workflow["id"]}-{workflow["run_attempt"]}'
                state = ROOT / 'processed' / key
                if state.exists():
                    continue
                jobs = api(f'repos/{repository}/actions/runs/{workflow["id"]}/jobs')['jobs']
                if not eligible(workflow, jobs, repository, config['environment']):
                    continue
                try:
                    deploy(config, workflow)
                    state.write_text('success\n')
                except Exception as error:
                    state.write_text(f'failure: {type(error).__name__}: {error}\n')
                    raise
        except Exception as error:
            print(f'{config["site"]}-{config["environment"]}: {type(error).__name__}: {error}', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default=str(ROOT / 'config.json'))
    parser.add_argument('--rollback', choices=['syrai-production', 'syrai-staging', 'sindibad-production', 'sindibad-staging'])
    args = parser.parse_args()
    configs = json.loads(Path(args.config).read_text())
    ROOT.mkdir(parents=True, exist_ok=True)
    for folder in ['downloads', 'processed']:
        (ROOT / folder).mkdir(exist_ok=True)
    with (ROOT / '.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.rollback:
            config = next(c for c in configs if f'{c["site"]}-{c["environment"]}' == args.rollback)
            root = ROOT / args.rollback
            previous, current = root / 'previous-compose.json', root / 'current-compose.json'
            if not previous.exists():
                raise ValueError('No previous deployment recorded')
            run('docker', 'compose', '-p', config['project'], '-f', str(previous), 'up', '-d', '--no-build', '--wait', 'web')
            old = current.read_bytes()
            current.write_bytes(previous.read_bytes())
            previous.write_bytes(old)
            print(f'Rolled back {args.rollback}; automatic deployments remain enabled')
        else:
            tick(configs)


if __name__ == '__main__':
    main()
