import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBrowserInventory } from './security-inventory.mjs';

function fixture() {
    const dependencies = { '@azure/msal-browser': '3.28.1', pyodide: '314.0.7' };
    const bundle = Buffer.from('/*! @azure/msal-browser v3.28.1 2025-01-14 */\nsynthetic bundle');
    const integrity = 'sha512-' + Buffer.alloc(64).toString('base64');
    return {
        manifest: { dependencies },
        lock: { lockfileVersion: 3, packages: { '': { dependencies: { ...dependencies } },
            'node_modules/@azure/msal-browser': { version: '3.28.1', integrity, resolved: 'https://registry.npmjs.org/@azure/msal-browser/-/msal-browser-3.28.1.tgz' },
            'node_modules/pyodide': { version: '314.0.7', integrity, resolved: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz' },
            'node_modules/ws': { version: '8.23.0', integrity, resolved: 'https://registry.npmjs.org/ws/-/ws-8.23.0.tgz' } } },
        msalBundle: bundle, packageBundle: Buffer.from(bundle),
        pyodideWorker: "import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';",
        pagesWorkflow: '        run: |\n          npm ci --prefix scripts/security-js --ignore-scripts --no-audit --no-fund\n          node scripts/test-ledger-pyodide.mjs',
        pyodideTest: "import { loadPyodide } from './security-js/node_modules/pyodide/pyodide.mjs';"
    };
}

test('accepts a matching pinned dependency inventory', () => checkBrowserInventory(fixture()));

test('rejects a changed shipped bundle even if its version header is unchanged', () => {
    const input = fixture();
    input.msalBundle = Buffer.concat([input.msalBundle, Buffer.from('\nchanged')]);
    assert.throws(() => checkBrowserInventory(input), /Shipped MSAL bytes/);
});

test('rejects runtime references or lock resolution that drift from the audited versions', () => {
    for (const [mutate, message] of [
        [input => { input.pyodideWorker = input.pyodideWorker.replace('314.0.7', '314.0.8'); }, /Ledger runtime differs/],
        [input => { input.pyodideWorker = '/* ' + input.pyodideWorker + " */\nimport { loadPyodide } from './other.mjs';"; }, /Ledger runtime differs/],
        [input => { input.pyodideWorker = input.pyodideWorker.replace('pyodide.mjs', 'pyodide.mjs?module'); }, /Ledger runtime differs/],
        [input => { input.pagesWorkflow = input.pagesWorkflow.replace('npm ci', '# npm ci'); }, /Pages must install/],
        [input => { input.pagesWorkflow = input.pagesWorkflow.replace('scripts/security-js', '.tools/pyodide'); }, /Pages must install/],
        [input => { input.pyodideTest = input.pyodideTest.replace('./security-js', '../.tools/pyodide'); }, /must import Pyodide/],
        [input => { input.lock.packages['node_modules/@azure/msal-browser'].version = '3.28.2'; }, /resolved version mismatch/],
        [input => { input.manifest.dependencies.pyodide = input.lock.packages[''].dependencies.pyodide = '^314.0.7'; }, /must use an exact version/]
    ]) {
        const input = fixture();
        mutate(input);
        assert.throws(() => checkBrowserInventory(input), message);
    }
});

test('rejects unreviewed direct dependencies and lockfile provenance drift', () => {
    for (const [mutate, message] of [
        [input => { input.manifest.dependencies.extra = '1.0.0'; }, /Unexpected direct/],
        [input => { input.lock.packages[''].dependencies.extra = '1.0.0'; }, /manifest\/lock mismatch/],
        [input => { input.lock.lockfileVersion = 2; }, /npm v3 lockfile/],
        [input => { input.lock.packages['node_modules/ws'].resolved = 'https://example.test/ws-8.23.0.tgz'; }, /public npm registry/],
        [input => { input.lock.packages['node_modules/ws'].integrity = 'sha512-invalid'; }, /SHA-512 integrity/]
    ]) {
        const input = fixture();
        mutate(input);
        assert.throws(() => checkBrowserInventory(input), message);
    }
});
