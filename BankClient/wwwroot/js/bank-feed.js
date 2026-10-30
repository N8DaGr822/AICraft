let msalPromise, plaidPromise;

export async function create() {
    const response = await fetch(new URL('bank-config.json', document.baseURI), { cache: 'no-store' });
    if (!response.ok) throw new Error('Bank configuration could not be loaded.');
    const config = await response.json();
    if (!config.apiUrl || !config.clientId || !config.authority || !config.scope) return null;
    const api = new URL(config.apiUrl, document.baseURI);
    if (api.origin !== new URL(document.baseURI).origin) throw new Error('Bank API must share the isolated banking origin.');
    if (api.protocol !== 'https:' && api.hostname !== 'localhost') throw new Error('Bank API must use HTTPS.');
    msalPromise ??= import('./vendor/msal-browser.min.js').then(() => window.msal);
    const msal = await msalPromise;
    const auth = new msal.PublicClientApplication({
        auth: { clientId: config.clientId, authority: config.authority,
            redirectUri: new URL('bank-auth.html', document.baseURI).href },
        cache: { cacheLocation: 'sessionStorage' }
    });
    await auth.initialize();
    const lifetime = new AbortController();
    let account = null, handler = null, disposed = false, cancelLink = null;

    async function request(path, method = 'GET', body) {
        if (disposed || !account) throw new Error('Sign in to the bank feed first.');
        let access;
        try { access = await auth.acquireTokenSilent({ account, scopes: [config.scope] }); }
        catch { account = null; throw new Error('Your session expired. Select Sign in again.'); }
        const response = await fetch(new URL(`api/bank/${path}`, api.href.endsWith('/') ? api : `${api}/`), {
            method, headers: { Authorization: `Bearer ${access.accessToken}`, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: lifetime.signal
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Bank API returned ${response.status}. Check sign-in and API access.`);
        }
        return response.status === 204 ? null : response.json();
    }

    async function loadPlaid() {
        if (window.Plaid) return;
        plaidPromise ??= new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
            script.onload = resolve;
            script.onerror = () => { plaidPromise = null; script.remove(); reject(new Error('Bank connection window could not load.')); };
            document.head.append(script);
        });
        await plaidPromise;
    }

    return {
        async signIn() {
            account = null;
            const result = await auth.loginPopup({ scopes: [config.scope], prompt: 'select_account' });
            if (!disposed) account = result.account;
        },
        async connect(connectionId = null) {
            await loadPlaid();
            if (disposed) return;
            const oauth = new URL(location.href).searchParams.has('oauth_state_id');
            const saved = oauth ? JSON.parse(sessionStorage.getItem('aicraft-bank-link') || 'null') : null;
            if (oauth && !saved) throw new Error('Bank authorization session expired. Reopen Ledger without the OAuth query and connect again.');
            if (saved && saved.owner !== account?.homeAccountId) throw new Error('Sign in with the Microsoft account that started this bank connection.');
            const link = saved || { ...(await request('link-token', 'POST', { connectionId })), connectionId, owner: account?.homeAccountId };
            // OAuth Recovery: Store only the short-lived Link token, never the bank access token.
            sessionStorage.setItem('aicraft-bank-link', JSON.stringify(link));
            return new Promise((resolve, reject) => {
                cancelLink = () => reject(new Error('Bank connection closed.'));
                const finish = () => {
                    sessionStorage.removeItem('aicraft-bank-link');
                    cancelLink = null;
                    handler?.destroy(); handler = null;
                    if (oauth) history.replaceState(null, '', location.pathname);
                };
                handler = window.Plaid.create({ token: link.linkToken,
                    ...(oauth ? { receivedRedirectUri: location.href } : {}),
                    onSuccess: async publicToken => {
                        try {
                            const result = link.connectionId ? { id: link.connectionId } : await request('exchange', 'POST', { publicToken });
                            finish(); resolve(result.id);
                        } catch (error) { finish(); reject(error); }
                    },
                    onExit: error => { finish(); reject(new Error(error ? 'Bank connection was unsuccessful. Try again.' : 'Bank connection canceled.')); }
                });
                if (disposed) { finish(); reject(new Error('Bank feed closed.')); }
                else handler.open();
            });
        },
        connections: () => request('connections'),
        sync: id => request(`connections/${encodeURIComponent(id)}/sync`, 'POST'),
        transactions: (id, accountId, offset) => request(`connections/${encodeURIComponent(id)}/transactions?accountId=${encodeURIComponent(accountId)}&offset=${offset}`),
        async disconnect(id) {
            if (!window.confirm('Disconnect this bank and delete its imported feed from Azure SQL? Posted local ledger entries will remain.')) return false;
            await request(`connections/${encodeURIComponent(id)}`, 'DELETE'); return true;
        },
        async signOut() {
            if (account) await auth.clearCache({ account });
            account = null;
            sessionStorage.removeItem('aicraft-bank-link');
        },
        dispose() { disposed = true; lifetime.abort(); handler?.destroy(); handler = null; cancelLink?.(); account = null; }
    };
}
