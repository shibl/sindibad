import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import agent
import release


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / 'dist'
        (self.dist / 'ar').mkdir(parents=True)
        (self.dist / 'index.html').write_text('<html><script>window.theme="light"</script>Hello</html>')
        (self.dist / 'ar/index.html').write_text('<html lang="ar">مرحبا</html>')
        self.meta = dict(site='syrai', environment='production', repository='sam-a1a/SyrAI',
                         sha='a' * 40, branch='main', run_id='10', attempt='1', tag='syrai/v1.0.0')
        self.archive = release.package(self.dist, self.root / 'output', self.meta)

    def rewrite(self, transform):
        with tarfile.open(self.archive) as source:
            items = [(member, source.extractfile(member).read()) for member in source.getmembers()]
        with tarfile.open(self.archive, 'w:gz') as target:
            for member, data in transform(items):
                member.size = len(data)
                target.addfile(member, io.BytesIO(data))

    def test_round_trip_preserves_files_and_records_exact_release(self):
        target = self.root / 'site'
        self.assertEqual(agent.unpack(self.archive, target, self.meta), self.meta)
        self.assertEqual((target / 'ar/index.html').read_bytes(), (self.dist / 'ar/index.html').read_bytes())
        self.assertEqual(json.loads((target / '__release.json').read_text()), self.meta)

    def test_wrong_commit_is_rejected_without_extraction(self):
        with self.assertRaises(ValueError):
            agent.unpack(self.archive, self.root / 'site', {**self.meta, 'sha': 'b' * 40})
        self.assertFalse((self.root / 'site').exists())

    def test_tampered_content_is_rejected(self):
        self.rewrite(lambda items: [(m, b'changed' if m.name == 'site/index.html' else data) for m, data in items])
        with self.assertRaisesRegex(ValueError, 'Checksum'):
            agent.unpack(self.archive, self.root / 'site', self.meta)
        self.assertFalse((self.root / 'site').exists())

    def test_traversal_is_rejected(self):
        def transform(items):
            member = tarfile.TarInfo('site/../../escape')
            return items + [(member, b'bad')]
        self.rewrite(transform)
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            agent.unpack(self.archive, self.root / 'site', self.meta)
        self.assertFalse((self.root / 'escape').exists())

    def test_links_and_duplicate_files_are_rejected(self):
        def transform(items):
            member = tarfile.TarInfo('site/linked')
            member.type, member.linkname = tarfile.SYMTYPE, '/etc/passwd'
            return items + [(member, b'')]
        self.rewrite(transform)
        with self.assertRaisesRegex(ValueError, 'regular'):
            agent.unpack(self.archive, self.root / 'site', self.meta)

    def test_no_pull_requests_untrusted_repositories_or_failed_tests(self):
        workflow = dict(event='push', head_branch='main', head_repository={'full_name': 'sam-a1a/SyrAI'},
                        path='.github/workflows/vps.yml', status='in_progress')
        jobs = [{'name': 'Build and test', 'conclusion': 'success', 'status': 'completed'},
                {'name': 'Deploy to VPS', 'conclusion': None, 'status': 'in_progress'}]
        self.assertTrue(agent.eligible(workflow, jobs, 'sam-a1a/SyrAI', 'production'))
        for updates in [dict(event='pull_request'), dict(head_branch='feature'),
                        dict(head_repository={'full_name': 'attacker/SyrAI'}), dict(status='completed')]:
            self.assertFalse(agent.eligible({**workflow, **updates}, jobs, 'sam-a1a/SyrAI', 'production'))
        jobs[0]['conclusion'] = 'failure'
        self.assertFalse(agent.eligible(workflow, jobs, 'sam-a1a/SyrAI', 'production'))

    def test_failed_health_check_restores_previous_compose(self):
        previous, candidate = self.root / 'previous.json', self.root / 'candidate.json'
        previous.write_text('{}')
        with patch.object(agent, 'run') as run:
            with self.assertRaises(ValueError):
                agent.activate({'project': 'test-site'}, candidate, previous,
                               lambda: (_ for _ in ()).throw(ValueError('unhealthy')))
        self.assertEqual(run.call_count, 2)
        self.assertIn(str(previous), run.call_args_list[1].args)

    def test_security_policy_covers_inline_scripts_and_isolates_staging(self):
        config = agent.caddy_config('syrai', True, self.dist)
        self.assertIn('sha256-', config)
        self.assertIn('noindex, nofollow', config)
        self.assertIn('/__release.json Cache-Control "no-store"', config)
        self.assertNotIn("'unsafe-eval'", config)
        self.assertNotIn('X-Robots-Tag', agent.caddy_config('syrai', False, self.dist))


if __name__ == '__main__':
    unittest.main()
