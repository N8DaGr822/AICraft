"""GitHub Pages: Set the project base path and retain SPA routes on refresh."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True

root = Path(sys.argv[1])
base = sys.argv[2]
if not base.startswith('/') or not base.endswith('/'):
    raise ValueError('The base path must start and end with /.')
index = root / 'index.html'
html = index.read_text(encoding='utf-8')
if '<base href="/" />' not in html:
    raise ValueError('Expected the development base path in the published index.')
html = html.replace('<base href="/" />', f'<base href="{base}" />')
index.write_text(html, encoding='utf-8')
(root / '404.html').write_text(html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'), encoding='utf-8')
(root / '.nojekyll').touch()

# Discovery pages are static HTML; preserve the Blazor shell for editor routes.
from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location('discovery', Path(__file__).with_name('generate-discovery.py'))
discovery = module_from_spec(spec)
spec.loader.exec_module(discovery)
discovery.generate(root, base, html)
