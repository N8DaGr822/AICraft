"""Verify pinned bundle installation and reject unsafe/tampered archives."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('install-craft-apps.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

class BundleTests(unittest.TestCase):
    def test_verified_install_and_tamper_detection(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder)
            archive = cache / 'testcraft-1.0.0.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                for name in ['index.html','LICENSE-MIT','LICENSE-APACHE','NOTICE','HOSTING.md','app.wasm','index.html.br']:
                    z.writestr('testcraft-web-1.0.0/' + name, 'fixture')
            app = dict(id='testcraft',version='1.0.0',url='https://github.com/storytold/testcraft/releases/download/v1.0.0/testcraft-web-1.0.0.zip',size=archive.stat().st_size,sha256=hashlib.sha256(archive.read_bytes()).hexdigest())
            installer.install(app, cache/'out', cache)
            self.assertEqual((cache/'out/testcraft/1.0.0/NOTICE').read_text(),'fixture')
            self.assertFalse((cache/'out/testcraft/1.0.0/index.html.br').exists())
            archive.write_bytes(b'wrong archive')
            with self.assertRaisesRegex(ValueError, 'checksum/size mismatch'):
                installer.install(app, cache/'out', cache)

    def test_rejects_archive_traversal(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder)
            archive = cache/'testcraft-1.0.0.zip'
            with zipfile.ZipFile(archive,'w') as z:
                z.writestr('testcraft-web-1.0.0/../../outside.txt','unsafe')
            app = dict(id='testcraft',version='1.0.0',url='https://github.com/storytold/testcraft/releases/download/v1.0.0/testcraft-web-1.0.0.zip',size=archive.stat().st_size,sha256=hashlib.sha256(archive.read_bytes()).hexdigest())
            with self.assertRaisesRegex(ValueError, 'unsafe archive path'):
                installer.install(app, cache/'out', cache)
            self.assertFalse((cache/'outside.txt').exists())

    def test_catalog_matches_pinned_releases(self):
        catalog = Path('AITest/Apps/AppCatalog.cs').read_text(encoding='utf-8')
        apps = json.loads(installer.MANIFEST.read_text())
        self.assertEqual(len({app['id'] for app in apps}),10)
        for app in apps:
            entry = next(line for line in catalog.splitlines() if f'"craft/{app["id"]}"' in line)
            self.assertIn(f'"{app["version"]}"',entry)

if __name__ == '__main__':
    unittest.main()
