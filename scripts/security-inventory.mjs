import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packages = ['@azure/msal-browser', 'pyodide'];
const exactVersion = /^\d+\.\d+\.\d+$/;

export function checkBrowserInventory({ manifest, lock, msalBundle, packageBundle, pyodideWorker, pagesWorkflow, pyodideTest }) {
    const versions = manifest.dependencies;
    assert.deepEqual(Object.keys(versions).sort(), packages, 'Unexpected direct browser inventory dependencies');
    assert.equal(lock.lockfileVersion, 3, 'Browser inventory requires an npm v3 lockfile');
    assert.deepEqual(lock.packages[''].dependencies, versions, 'Browser inventory manifest/lock mismatch');
    for (const name of packages) {
        assert.match(versions[name], exactVersion, `${name} must use an exact version`);
        assert.equal(lock.packages[`node_modules/${name}`].version, versions[name], `${name} resolved version mismatch`);
    }
    for (const [path, entry] of Object.entries(lock.packages)) {
        if (path === '') continue;
        const name = path.split('node_modules/').at(-1);
        assert.match(name, /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/, `${path} must name an npm package`);
        assert.match(entry.version, exactVersion, `${path} must resolve to an exact version`);
        const tarball = `${name.split('/').at(-1)}-${entry.version}.tgz`;
        assert.equal(entry.resolved, `https://registry.npmjs.org/${name}/-/${tarball}`, `${path} must resolve from the public npm registry`);
        assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/, `${path} must have a SHA-512 integrity digest`);
    }
    const msalVersion = msalBundle.toString('utf8').match(/^\/\*! @azure\/msal-browser v(\d+\.\d+\.\d+) /)?.[1];
    assert.equal(msalVersion, versions['@azure/msal-browser'], 'Shipped MSAL version differs from the audit inventory');
    assert.ok(msalBundle.equals(packageBundle), 'Shipped MSAL bytes differ from the locked npm package');
    const workerModule = pyodideWorker.match(/^\s*import\s*\{\s*loadPyodide\s*\}\s*from\s*(['"])([^'"\r\n]+)\1\s*;/)?.[2];
    assert.equal(workerModule, `https://cdn.jsdelivr.net/pyodide/v${versions.pyodide}/full/pyodide.mjs`, 'Ledger runtime differs from the audit inventory');
    const pagesSteps = pagesWorkflow.split(/\r?\n/).map(line => line.trim());
    const testStep = pagesSteps.indexOf('node scripts/test-ledger-pyodide.mjs');
    assert.ok(testStep > 0 && pagesSteps[testStep - 1] === 'npm ci --prefix scripts/security-js --ignore-scripts --no-audit --no-fund',
        'Pages must install the locked browser inventory before running the Ledger runtime test');
    assert.equal(pyodideTest.match(/^import\s*\{\s*loadPyodide\s*\}\s*from\s*(['"])([^'"\r\n]+)\1\s*;/m)?.[2],
        './security-js/node_modules/pyodide/pyodide.mjs', 'Ledger runtime test must import Pyodide from the audited inventory');
}

async function main() {
    const root = new URL('../', import.meta.url);
    const read = path => readFile(new URL(path, root));
    const [manifest, lock, msalBundle, packageBundle, pyodideWorker, pagesWorkflow, pyodideTest] = await Promise.all([
        read('scripts/security-js/package.json'),
        read('scripts/security-js/package-lock.json'),
        read('BankClient/wwwroot/js/vendor/msal-browser.min.js'),
        read('scripts/security-js/node_modules/@azure/msal-browser/lib/msal-browser.min.js'),
        read('AITest/wwwroot/js/ledger-worker.js'),
        read('.github/workflows/pages.yml'),
        read('scripts/test-ledger-pyodide.mjs')
    ]);
    checkBrowserInventory({ manifest: JSON.parse(manifest), lock: JSON.parse(lock), msalBundle, packageBundle,
        pyodideWorker: pyodideWorker.toString('utf8'), pagesWorkflow: pagesWorkflow.toString('utf8'), pyodideTest: pyodideTest.toString('utf8') });
    console.log('Browser dependency inventory matches the shipped MSAL file and pinned Pyodide references.');
    console.log('Coverage excludes hosted Plaid code, Python/WASM internals and dependencies embedded in prebuilt upstream editors.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
