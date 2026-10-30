"""Validate generated Pages routes, metadata and catalog coverage without network access."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys
sys.dont_write_bytecode = True
from html.parser import HTMLParser
from xml.etree import ElementTree
spec = importlib.util.spec_from_file_location('discovery', Path(__file__).with_name('generate-discovery.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.tags = []; self.feed(html)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

class DiscoveryTests(unittest.TestCase):
    def test_routes_metadata_and_editor_isolation(self):
        apps = json.loads(module.CATALOG.read_text())
        for base in ['/AICraft/', '/']:
            with self.subTest(base=base), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                module.generate(root, base, '<html><head></head><body><div id="app"></div><script src="_framework/blazor.js"></script></body></html>')
                titles = set()
                for app in apps:
                    page = root / 'applications' / app['Slug'] / 'index.html'
                    html = page.read_text(encoding='utf-8'); tags = Tags(html).tags
                    canonicals = [a['href'] for t,a in tags if t=='link' and a.get('rel')=='canonical']
                    self.assertEqual(canonicals, [module.ORIGIN+base+'applications/'+app['Slug']+'/'])
                    self.assertEqual(sum(t=='h1' for t,a in tags), 1)
                    self.assertNotIn('_framework/', html)
                    self.assertIn('application/ld+json', html)
                    self.assertIn(app['Route']+'/', html)
                    title = html.split('<title>')[1].split('</title>')[0]
                    self.assertNotIn(title,titles); titles.add(title)
                    editor = (root/app['Route']/'index.html').read_text()
                    self.assertIn('_framework/',editor)
                    self.assertIn('noindex,follow',editor)
                tree=ElementTree.parse(root/'sitemap.xml')
                self.assertEqual(len(tree.getroot()),len(apps)+6)
                for node in tree.getroot():
                    url=node[0].text
                    self.assertTrue((root/url.removeprefix(module.ORIGIN+base)/'index.html').exists())
                self.assertIn('id="catalog"', (root/'apps/index.html').read_text())
    def test_catalog_has_required_details(self):
        for app in json.loads(module.CATALOG.read_text()):
            for field in ['Id','Name','Slug','Description','Category','Features','Limitations','License','Access','DataHandling']:
                self.assertTrue(app[field], (app['Name'],field))

if __name__ == '__main__': unittest.main()
