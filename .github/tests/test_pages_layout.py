"""Exercise publication layout with synthetic files; no app is launched."""
from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util
import unittest


spec = importlib.util.spec_from_file_location(
    "prepare_pages", Path(__file__).resolve().parents[1] / "scripts/prepare-pages.py")
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class PagesLayoutTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.output = self.root / "public"
        self.inputs = {
            publisher.GRADE6 / "Web/index.html": "game entry",
            publisher.GRADE6 / "Web/service-worker.js": "existing offline worker",
            publisher.GRADE6 / "Web/core/save.js": "existing save logic",
            publisher.GRADE6 / "Web/node_modules/ignored.js": "development dependency",
            publisher.GRADE6 / "Infra/Pages/index.html": "existing root entry",
            publisher.GRADE6 / "Infra/Pages/service-worker.js": "existing legacy worker",
            publisher.GRADE6 / "docs/original-project-brief.pdf": "brief fixture",
            publisher.GRADE6 / "docs/screens/1-title.jpg": "image fixture",
            publisher.WEBSITE / "home/index.html": "studio entry",
            publisher.WEBSITE / "products/the-curriculam/grade-10/chemistry/index.html": "intro",
            publisher.WEBSITE / ".preview/ignored.html": "private preview",
            publisher.CHEMISTRY / "lab.html": "lab entry",
            publisher.CHEMISTRY / "js/exp-a.js": "experiment fixture",
        }
        for path, body in self.inputs.items():
            target = self.source / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body)

    def test_public_paths_preserve_game_bytes_and_link_targets(self):
        publisher.prepare(self.source, self.output)
        for public, original in {
            Path("Web/index.html"): publisher.GRADE6 / "Web/index.html",
            Path("Web/service-worker.js"): publisher.GRADE6 / "Web/service-worker.js",
            Path("Web/core/save.js"): publisher.GRADE6 / "Web/core/save.js",
            Path("index.html"): publisher.GRADE6 / "Infra/Pages/index.html",
            Path("service-worker.js"): publisher.GRADE6 / "Infra/Pages/service-worker.js",
            Path("docs/original-project-brief.pdf"): publisher.GRADE6 / "docs/original-project-brief.pdf",
            Path("docs/screens/1-title.jpg"): publisher.GRADE6 / "docs/screens/1-title.jpg",
            publisher.WEBSITE / "home/index.html": publisher.WEBSITE / "home/index.html",
            publisher.CHEMISTRY / "js/exp-a.js": publisher.CHEMISTRY / "js/exp-a.js",
        }.items():
            self.assertEqual((self.output / public).read_bytes(), (self.source / original).read_bytes())
        self.assertFalse((self.output / "Web/node_modules").exists())
        self.assertFalse((self.output / publisher.WEBSITE / ".preview").exists())
        self.assertFalse((self.output / publisher.GRADE6 / "Web").exists())
        self.assertTrue((self.output / ".nojekyll").exists())
        aliases = [Path("Studio/Web/home/index.html"), Path("Studio/Web/lab.html"),
                   Path("Studio/Web/products/the-curriculam/grade-10/chemistry/index.html")]
        for alias in aliases:
            body = (self.output / alias).read_text()
            target = body.split('content="0; url=', 1)[1].split('"', 1)[0]
            self.assertTrue((self.output / alias.parent / target).is_file(), alias)
            self.assertIn("location.search + location.hash", body)

    def test_refuses_incomplete_source_without_writing_output(self):
        (self.source / publisher.GRADE6 / "Web/index.html").unlink()
        with self.assertRaises(FileNotFoundError):
            publisher.prepare(self.source, self.output)
        self.assertFalse(self.output.exists())

    def test_never_overwrites_an_existing_deployment(self):
        self.output.mkdir()
        sentinel = self.output / "staging-save"
        sentinel.write_text("keep")
        with self.assertRaises(ValueError):
            publisher.prepare(self.source, self.output)
        self.assertEqual(sentinel.read_text(), "keep")


if __name__ == "__main__":
    unittest.main()
