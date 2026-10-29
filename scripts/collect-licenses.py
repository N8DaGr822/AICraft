"""Collect dependency license texts beside the deployed WebAssembly module."""
import json
from pathlib import Path
import subprocess

metadata = json.loads(subprocess.check_output(['cargo', '+1.95.0', 'metadata', '--locked', '--manifest-path', 'rust/Cargo.toml', '--format-version', '1'], text=True))
output = Path('AITest/wwwroot/licenses/dependencies')
output.mkdir(parents=True, exist_ok=True)
index = []
for package in metadata['packages']:
    if package['name'] == 'aicraft-photo':
        continue
    root = Path(package['manifest_path']).parent
    files = [p for p in root.iterdir() if p.is_file() and p.name.upper().startswith(('LICENSE', 'COPYING', 'NOTICE'))]
    if not files and package['name'].startswith('photocraft-'):
        index.append(f"{package['name']} {package['version']}: see ../PhotoCraft-LICENSE-MIT.txt")
        continue
    if not files:
        raise RuntimeError(f"Missing license text for {package['name']}; inspect before distributing.")
    for file in files:
        name = f"{package['name']}-{package['version']}-{file.name}.txt"
        (output / name).write_bytes(file.read_bytes())
        index.append(name)
(output / 'index.txt').write_text('\n'.join(index), encoding='utf-8')
