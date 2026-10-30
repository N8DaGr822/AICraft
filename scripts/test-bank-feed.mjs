import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const calls = [], storage = new Map();
let enabled = false, loggedIn = false, confirmDelete = false;
const config = { apiUrl: '/', clientId: 'test', authority: 'https://login.microsoftonline.com/test', scope: 'api://test/access_as_user' };
const context = vm.createContext({
    URL, JSON, Error, Promise, console, AbortController,
    document: { baseURI: 'https://bank.example/' },
    location: { href: 'https://bank.example/', pathname: '/' },
    history: { replaceState() {} },
    sessionStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key), removeItem: key => storage.delete(key) },
    window: {
        confirm: () => confirmDelete,
        Plaid: { create: options => ({ open: () => queueMicrotask(() => options.onSuccess('public-test')), destroy() {} }) }
    },
    fetch: async (url, options) => {
        if (String(url).endsWith('bank-config.json')) return { ok: true, json: async () => enabled ? config : {} };
        assert.equal(options.headers.Authorization, 'Bearer synthetic-session-token');
        assert.ok(String(url).startsWith('https://bank.example/api/bank/'));
        calls.push({ url: String(url), ...options });
        return { ok: true, status: options.method === 'DELETE' ? 204 : 200,
            json: async () => String(url).endsWith('link-token') ? { linkToken: 'link-test' } : String(url).endsWith('exchange') ? { id: 'connection-test' } : [] };
    }
});
const authentication = new vm.SyntheticModule(['PublicClientApplication'], function () {
    this.setExport('PublicClientApplication', class {
        async initialize() {}
        async loginPopup() { loggedIn = true; return { account: { homeAccountId: 'owner' } }; }
        async acquireTokenSilent() { assert.ok(loggedIn); return { accessToken: 'synthetic-session-token' }; }
        async clearCache() { loggedIn = false; }
    });
}, { context });
await authentication.link(() => {}); await authentication.evaluate();
context.window.msal = authentication.namespace;
const module = new vm.SourceTextModule(await fs.readFile(new URL('../BankClient/wwwroot/js/bank-feed.js', import.meta.url), 'utf8'), {
    context, importModuleDynamically: async () => authentication
});
await module.link(() => {}); await module.evaluate();
assert.equal(await module.namespace.create(), null, 'Unconfigured feed stays disabled');
enabled = true;
const feed = await module.namespace.create();
await assert.rejects(feed.connections(), /Sign in/);
await feed.signIn();
assert.equal(await feed.connect(), 'connection-test');
assert.equal(storage.size, 0, 'Successful link clears temporary OAuth state');
assert.equal(calls.filter(x => x.url.endsWith('/exchange')).length, 1);
assert.equal(await feed.connect('existing'), 'existing');
assert.equal(calls.filter(x => x.url.endsWith('/exchange')).length, 1, 'Reconnect does not exchange an update-mode token');
await feed.transactions('existing', 'account & one', 100);
assert.ok(calls.at(-1).url.includes('accountId=account%20%26%20one&offset=100'));
assert.equal(await feed.disconnect('existing'), false);
assert.equal(calls.filter(x => x.method === 'DELETE').length, 0, 'Cancel preserves bank connection');
confirmDelete = true;
assert.equal(await feed.disconnect('existing'), true);
await feed.signOut();
await assert.rejects(feed.connections(), /Sign in/);
await feed.signIn(); feed.dispose();
assert.ok(calls.at(-1).signal.aborted, 'Disposal cancels outstanding API requests');
await assert.rejects(feed.connections(), /Sign in/);
console.log('Bank browser adapter checks passed: disabled setup, sign-in, Link/update mode, paging, disconnect, sign-out and disposal.');
