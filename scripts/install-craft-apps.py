"""Install pinned upstream Craft web releases, preserving their assets and notices."""
import concurrent.futures
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import urllib.request
import zipfile

MANIFEST = Path(__file__).with_name('craft-releases.json')

def install(app, output, cache):
    name, version = app['id'], app['version']
    if not re.fullmatch(r'[a-z]+craft', name) or not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid release identity')
    expected_url = f'https://github.com/storytold/{name}/releases/download/v{version}/{name}-web-{version}.zip'
    if app['url'] != expected_url or not re.fullmatch(r'[a-f0-9]{64}', app['sha256']):
        raise ValueError('Invalid pinned release')
    archive = cache / f'{name}-{version}.zip'
    if not archive.exists():
        # Download Bound: Stop at the recorded release size, including on unexpected server responses.
        with urllib.request.urlopen(expected_url, timeout=120) as response, archive.open('wb') as target:
            remaining = app['size']
            while chunk := response.read(min(1024 * 1024, remaining + 1)):
                remaining -= len(chunk)
                if remaining < 0:
                    raise ValueError(f'{name}: download exceeds release size')
                target.write(chunk)
    if archive.stat().st_size != app['size'] or hashlib.sha256(archive.read_bytes()).hexdigest() != app['sha256']:
        raise ValueError(f'{name}: release checksum/size mismatch; remove the cached archive before retrying')
    root = output / name / version
    root.mkdir(parents=True, exist_ok=True)
    prefix = f'{name}-web-{version}'
    with zipfile.ZipFile(archive) as bundle:
        if sum(item.file_size for item in bundle.infolist()) > 200 * 1024 * 1024:
            raise ValueError(f'{name}: unexpected unpacked size')
        for item in bundle.infolist():
            path = PurePosixPath(item.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in item.filename or ':' in item.filename or path.parts[0] != prefix:
                raise ValueError(f'{name}: unsafe archive path')
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError(f'{name}: archive symlink is unsupported')
            if item.is_dir():
                continue
            target = root.joinpath(*path.parts[1:])
            if not target.resolve().is_relative_to(root.resolve()):
                raise ValueError(f'{name}: path escapes release directory')
            # Hosting Compatibility: Let the host compress original assets; upstream sidecars
            # otherwise conflict with ASP.NET's generated compression metadata in local development.
            if target.suffix in ('.br', '.gz'):
                target.unlink(missing_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(bundle.read(item))
    for required in ['index.html', 'LICENSE-MIT', 'LICENSE-APACHE', 'NOTICE', 'HOSTING.md']:
        if not (root / required).is_file():
            raise ValueError(f'{name}: missing {required}')
    if not list(root.glob('*.wasm')):
        raise ValueError(f'{name}: missing WebAssembly module')
    print(f'{name} {version}: checksum verified, installed with notices', flush=True)

if __name__ == '__main__':
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('AITest/wwwroot/craft')
    cache = Path('.tools/craft-downloads')
    cache.mkdir(parents=True, exist_ok=True)
    apps = json.loads(MANIFEST.read_text(encoding='utf-8'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda app: install(app, output, cache), apps))
