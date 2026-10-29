export async function create(preview, download) {
    const worker = new Worker(new URL('./vector-worker.js', import.meta.url), { type: 'module' });
    const pending = new Map();
    let sequence = 0;
    let stopped = false;
    let outputUrl;
    function clearOutput() {
        preview.removeAttribute('src');
        download.removeAttribute('href');
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        outputUrl = undefined;
    }
    function stop(message) {
        stopped = true;
        worker.terminate();
        for (const request of pending.values()) {
            clearTimeout(request.timer);
            request.reject(new Error(message));
        }
        pending.clear();
    }
    function send(settings) {
        if (stopped) return Promise.reject(new Error('Restart the vector lab to try again.'));
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => stop('The vector engine timed out. Restart the vector lab.'), 30000);
            pending.set(id, { resolve, reject, timer });
            worker.postMessage({ id, settings });
        });
    }
    worker.onmessage = ({ data }) => {
        const request = pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
    };
    worker.onerror = () => stop('The vector engine failed. Restart the vector lab.');
    worker.onmessageerror = () => stop('The vector engine returned an unreadable result. Restart the vector lab.');
    try { await send(null); }
    catch (error) { stop('Vector initialization failed.'); throw error; }
    return {
        async generate(settings) {
            clearOutput();
            const result = await send(settings);
            if (stopped) throw new Error('Vector lab closed.');
            outputUrl = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
            // Preview Isolation: Load generated SVG as an image, never as executable page markup.
            preview.src = outputUrl;
            try { await preview.decode(); }
            catch (error) { clearOutput(); throw new Error('Could not display the generated SVG.'); }
            if (stopped) throw new Error('Vector lab closed.');
            download.href = outputUrl;
            download.download = `aicraft-${settings.shape}.svg`;
            return result;
        },
        clearOutput,
        dispose() { stop('Vector lab closed.'); clearOutput(); }
    };
}
