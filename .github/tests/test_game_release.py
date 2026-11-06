"""Check game versioning and deployment-history preservation without publishing."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('game_release', Path(__file__).resolve().parents[1] / 'scripts/game-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class GameReleaseTests(unittest.TestCase):
    def test_versions_continue_existing_game_release_and_ignore_previews(self):
        self.assertEqual(release.choose_tag([], 'a', False, '10', '1'), 'game/v2.0.1')
        refs = [{'ref': 'refs/tags/game/v2.3.4', 'object': {'sha': 'a'}},
                {'ref': 'refs/tags/game/v99.0.0-staging.9.1', 'object': {'sha': 'b'}}]
        self.assertEqual(release.choose_tag(refs, 'c', False, '10', '1'), 'game/v2.3.5')
        self.assertEqual(release.choose_tag(refs, 'c', True, '10', '2'), 'game/v2.3.5-staging.10.2')

    def test_production_reruns_reuse_the_same_immutable_tag(self):
        refs = [{'ref': 'refs/tags/game/v2.0.1', 'object': {'sha': 'a'}}]
        self.assertEqual(release.choose_tag(refs, 'a', False, '20', '2'), 'game/v2.0.1')

    def test_wrong_public_commit_cannot_be_released(self):
        with patch.object(release, 'fetch', return_value=b'{"sha":"wrong"}'), \
             patch.object(release.time, 'monotonic', side_effect=[0, 0.1, 2]), \
             patch.object(release.time, 'sleep'):
            with self.assertRaises(TimeoutError):
                release.wait_for_publication('https://example.test/', {'sha': 'expected', 'run_id': '1', 'attempt': '1'}, timeout=1)

    def test_relabel_does_not_repeat_when_github_filters_by_original_name(self):
        with patch.object(release, 'api', side_effect=[[{'id': 1, 'environment': 'game-production'}], []]) as api:
            release.relabel_legacy('owner/repo')
        self.assertEqual(api.call_count, 2)

    def test_relabel_keeps_status_url_logs_and_prior_history(self):
        old = dict(state='success', environment_url='https://example.test/', log_url='https://example.test/log', description='Original result')
        with patch.object(release, 'api', side_effect=[[{'id': 1, 'environment': 'github-pages'}], [old], {}, []]) as api:
            release.relabel_legacy('owner/repo')
        posted = api.call_args_list[2].args[1]
        self.assertEqual(posted, dict(old, environment='game-production', auto_inactive=False))


if __name__ == '__main__':
    unittest.main()
