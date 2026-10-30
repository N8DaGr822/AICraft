// Local Transport: The original UI calls its allowlisted Python routes inside our existing worker.
(() => {
    const originalFetch = window.fetch.bind(window);
    const scriptUrl = document.currentScript.src;
    let editorPromise, pendingWrites = 0;
    function editor() {
        return editorPromise ??= import(new URL('../../js/ledger-editor.js', scriptUrl)).then(module => {
            const download = document.createElement('a'); download.hidden = true; document.body.append(download);
            return module.create(download);
        });
    }
    window.fetch = async (input, options = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, options);
        const method = (options.method || 'GET').toUpperCase();
        if (method === 'POST') pendingWrites++;
        try {
            const client = await editor();
            const result = await client.execute('http', { path: url.pathname + url.search, method, body: options.body || '' }, new Date().toISOString().slice(0, 10));
            return new Response(Uint8Array.from(atob(result.body), char => char.charCodeAt(0)), {
                status: result.status, headers: { 'Content-Type': result.contentType,
                    ...(result.filename ? { 'Content-Disposition': `attachment; filename="${result.filename}"` } : {}) }
            });
        } finally { if (method === 'POST') pendingWrites--; }
    };
    document.addEventListener('click', async event => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        const url = new URL(link.href);
        if (url.origin !== location.origin || !['/api/backup', '/api/export'].includes(url.pathname)) return;
        event.preventDefault();
        try {
            const response = await window.fetch(url.href);
            if (!response.ok) throw new Error('Export failed. Reopen the ledger and retry.');
            const blobUrl = URL.createObjectURL(await response.blob());
            const download = document.createElement('a'); download.href = blobUrl;
            download.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'ledger-export';
            document.body.append(download); download.click(); download.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (error) { document.querySelector('#notice').textContent = error.message; }
    });
    window.addEventListener('beforeunload', event => { if (pendingWrites) { event.preventDefault(); event.returnValue = ''; } });
    window.addEventListener('pagehide', () => { editorPromise?.then(client => client.dispose()).catch(() => {}); });
})();
