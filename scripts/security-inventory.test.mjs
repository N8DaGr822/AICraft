import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBrowserInventory } from './security-inventory.mjs';

function fixture() {
    const dependencies = { '@azure/msal-browser': '3.28.1', pyodide: '314.0.7' };
    const bundle = Buffer.from('/*! @azure/msal-browser v3.28.1 2025-01-14 */\nsynthetic bundle');
    return {
        manifest: { dependencies },
        lock: { packages: { '': { dependencies: { ...dependencies } },
            'node_modules/@azure/msal-browser': { version: '3.28.1' }, 'node_modules/pyodide': { version: '314.0.7' } } },
        msalBundle: bundle, packageBundle: Buffer.from(bundle),
        pyodideWorker: "import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';",
        pagesWorkflow: 'npm install --prefix .tools/pyodide pyodide@314.0.7 --no-audit --no-fund'
    };
}

test('accepts a matching pinned dependency inventory', () => checkBrowserInventory(fixture()));

test('rejects a changed shipped bundle even if its version header is unchanged', () => {
    const input = fixture();
    input.msalBundle = Buffer.concat([input.msalBundle, Buffer.from('\nchanged')]);
    assert.throws(() => checkBrowserInventory(input), /Shipped MSAL bytes/);
});

test('rejects runtime references or lock resolution that drift from the audited versions', () => {
    for (const mutate of [
        input => { input.pyodideWorker = input.pyodideWorker.replace('314.0.7', '314.0.8'); },
        input => { input.pagesWorkflow = input.pagesWorkflow.replace('314.0.7', '314.0.8'); },
        input => { input.lock.packages['node_modules/@azure/msal-browser'].version = '3.28.2'; },
        input => { input.manifest.dependencies.pyodide = '^314.0.7'; }
    ]) {
        const input = fixture();
        mutate(input);
        assert.throws(() => checkBrowserInventory(input));
    }
});
