import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkBrowserInventory({ manifest, lock, msalBundle, packageBundle, pyodideWorker, pagesWorkflow }) {
    const versions = manifest.dependencies;
    for (const name of ['@azure/msal-browser', 'pyodide']) {
        assert.match(versions[name], /^\d+\.\d+\.\d+$/, `${name} must use an exact version`);
        assert.equal(lock.packages[''].dependencies[name], versions[name], `${name} manifest/lock mismatch`);
        assert.equal(lock.packages[`node_modules/${name}`].version, versions[name], `${name} resolved version mismatch`);
    }
    const msalVersion = msalBundle.toString('utf8').match(/^\/\*! @azure\/msal-browser v(\d+\.\d+\.\d+) /)?.[1];
    assert.equal(msalVersion, versions['@azure/msal-browser'], 'Shipped MSAL version differs from the audit inventory');
    assert.ok(msalBundle.equals(packageBundle), 'Shipped MSAL bytes differ from the locked npm package');
    const pyodideVersions = [...pyodideWorker.matchAll(/https:\/\/cdn\.jsdelivr\.net\/pyodide\/v([^/]+)\/full\/pyodide\.mjs/g)].map(match => match[1]);
    assert.deepEqual(pyodideVersions, [versions.pyodide], 'Ledger runtime differs from the audit inventory');
    const installedVersions = [...pagesWorkflow.matchAll(/npm install --prefix \.tools\/pyodide pyodide@([^\s]+)/g)].map(match => match[1]);
    assert.deepEqual(installedVersions, [versions.pyodide], 'Pages test runtime differs from the audit inventory');
}

async function main() {
    const root = new URL('../', import.meta.url);
    const read = path => readFile(new URL(path, root));
    const [manifest, lock, msalBundle, packageBundle, pyodideWorker, pagesWorkflow] = await Promise.all([
        read('scripts/security-js/package.json'),
        read('scripts/security-js/package-lock.json'),
        read('BankClient/wwwroot/js/vendor/msal-browser.min.js'),
        read('scripts/security-js/node_modules/@azure/msal-browser/lib/msal-browser.min.js'),
        read('AITest/wwwroot/js/ledger-worker.js'),
        read('.github/workflows/pages.yml')
    ]);
    checkBrowserInventory({ manifest: JSON.parse(manifest), lock: JSON.parse(lock), msalBundle, packageBundle,
        pyodideWorker: pyodideWorker.toString('utf8'), pagesWorkflow: pagesWorkflow.toString('utf8') });
    console.log('Browser dependency inventory matches the shipped MSAL file and pinned Pyodide references.');
    console.log('Coverage excludes hosted Plaid code, Python/WASM internals and dependencies embedded in prebuilt upstream editors.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
