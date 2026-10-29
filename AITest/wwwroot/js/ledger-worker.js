import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';
let runtime, database;
function transaction(mode, operation) {
    return new Promise((resolve, reject) => {
        const tx = database.transaction('books', mode);
        const request = operation(tx.objectStore('books'));
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Browser storage failed.'));
    });
}
async function initialize() {
    database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('aicraft-ledger-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('books');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const saved = await transaction('readonly', store => store.get('company'));
    runtime = await loadPyodide();
    for (const name of ['ledger.py', 'ledger_bridge.py']) {
        const response = await fetch(new URL(`../python/${name}`, import.meta.url));
        if (!response.ok) throw new Error(`Cannot load ${name}.`);
        runtime.FS.writeFile(`/home/pyodide/${name}`, await response.text());
    }
    if (saved) runtime.FS.writeFile('/ledger.sqlite', new Uint8Array(saved));
    await runtime.runPythonAsync('from ledger_bridge import dispatch');
}
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
    // Worker Ordering: Serialize engine operations and acknowledge writes only after durable storage succeeds.
    queue = queue.then(async () => {
        let fatal = false;
        try {
            if (!runtime) await initialize();
            if (data.action === 'backup') {
                const bytes = runtime.FS.readFile('/ledger.sqlite');
                self.postMessage({ id: data.id, bytes }, [bytes.buffer]);
                return;
            }
            runtime.globals.set('request_json', JSON.stringify(data));
            const result = JSON.parse(runtime.runPython('dispatch(request_json)'));
            fatal = true;
            await transaction('readwrite', store => store.put(runtime.FS.readFile('/ledger.sqlite'), 'company'));
            self.postMessage({ id: data.id, result });
        } catch (error) {
            self.postMessage({ id: data.id, error: String(error.message ?? error).trim().split('\n').at(-1), fatal });
            if (fatal) self.close();
        }
    });
};
