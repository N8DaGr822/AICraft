export async function create(download) {
    if (!navigator.locks) throw new Error('This browser does not support the lock needed to protect your ledger.');
    let release;
    // Cross-tab Ownership: A single editor prevents stale snapshots from overwriting another tab's ledger.
    await new Promise((resolve, reject) => {
        navigator.locks.request('aicraft-ledger-v1', { ifAvailable: true }, lock => {
            if (!lock) { reject(new Error('Ledger is already open in another tab. Close that lab and retry.')); return; }
            return new Promise(done => { release = done; resolve(); });
        }).catch(reject);
    });
    let worker;
    try { worker = new Worker(new URL('./ledger-worker.js', import.meta.url), { type: 'module' }); }
    catch (error) { release(); throw error; }
    const pending = new Map();
    let sequence = 0, stopped = false, url;
    function clearDownload() {
        download.removeAttribute('href');
        if (url) URL.revokeObjectURL(url);
        url = undefined;
    }
    function stop(message) {
        stopped = true;
        worker.terminate();
        release();
        for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error(message)); }
        pending.clear();
    }
    function send(action, args, asOf) {
        if (stopped) return Promise.reject(new Error('Reopen the ledger to restore the last saved state.'));
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => stop('Ledger timed out. Reopen it and check saved entries before retrying.'), 120000);
            pending.set(id, { resolve, reject, timer });
            worker.postMessage({ id, action, args, asOf });
        });
    }
    worker.onmessage = ({ data }) => {
        const request = pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.fatal ? 'Could not save changes. Reopen the ledger to restore the last saved state.' : data.error));
        else request.resolve(data.bytes ?? data.result);
        if (data.fatal) stop('Browser storage failed.');
    };
    worker.onerror = () => stop('Python could not run. Check your connection, then reopen the ledger.');
    worker.onmessageerror = () => stop('Python returned an unreadable result. Reopen the ledger.');
    return {
        async execute(action, args, asOf) { clearDownload(); return await send(action, args, asOf); },
        async backup() {
            clearDownload();
            const bytes = await send('backup');
            url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.sqlite3' }));
            download.href = url;
            download.download = 'aicraft-ledger.sqlite';
        },
        dispose() { stop('Ledger closed.'); clearDownload(); }
    };
}
