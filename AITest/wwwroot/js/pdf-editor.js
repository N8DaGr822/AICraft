export async function create(input, download, preview, viewer, sourceLink, mergeInput) {
    input.value = '';
    const worker = new Worker(new URL('./pdf-worker.js', import.meta.url), { type: 'module' });
    const pending = new Map();
    let sequence = 0;
    let stopped = false;
    let downloadUrl;
    let sourceUrl;
    let filename = 'document';

    function clearOutput() {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = undefined;
        download.removeAttribute('href');
        preview.removeAttribute('href');
        if (sourceUrl) viewer.src = sourceUrl;
    }
    function showSource(blob) {
        if (sourceUrl) URL.revokeObjectURL(sourceUrl);
        sourceUrl = URL.createObjectURL(blob);
        viewer.src = sourceLink.href = sourceUrl;
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
    function send(data, transfer = []) {
        if (stopped) return Promise.reject(new Error('PDF engine stopped. Use Restart PDF lab to try again.'));
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            // Worker Budget: Terminate stalled parsing, not just the waiting UI promise.
            const timer = setTimeout(() => stop('PDF processing exceeded 30 seconds. Restart the PDF lab and try a smaller file.'), 30000);
            pending.set(id, { resolve, reject, timer });
            worker.postMessage({ ...data, id }, transfer);
        });
    }
    worker.onmessage = ({ data }) => {
        const request = pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data);
    };
    worker.onerror = () => stop('The PDF engine failed. Restart the PDF lab to try again.');
    worker.onmessageerror = () => stop('The PDF engine returned an unreadable result. Restart the PDF lab.');
    try {
        await send({ type: 'ready' });
    } catch (error) {
        stop('PDF initialization failed.');
        throw error;
    }
    return {
        async load(sample) {
            clearOutput();
            viewer.removeAttribute('src');
            sourceLink.removeAttribute('href');
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
            sourceUrl = undefined;
            let file;
            if (sample) {
                input.value = ''; 
                const response = await fetch(new URL('../sample-data/pdf-lab-sample.pdf', import.meta.url));
                if (!response.ok) throw new Error('The sample PDF could not be loaded.');
                file = new File([await response.blob()], 'aicraft-sample.pdf', { type: 'application/pdf' });
            } else {
                file = input.files?.[0];
            }
            if (!file) throw new Error('Choose a PDF first.');
            if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')
                throw new Error('Choose a PDF file.');
            if (file.size === 0 || file.size > 15 * 1024 * 1024)
                throw new Error('Choose a PDF between 1 byte and 15 MB.');
            const bytes = await file.arrayBuffer();
            const result = await send({ type: 'load', bytes }, [bytes]);
            if (stopped) throw new Error('PDF lab closed.');
            filename = file.name.replace(/\.pdf$/i, '');
            showSource(new Blob([file], { type: 'application/pdf' }));
            return { ...result.info, filename: file.name };
        },
        async merge() {
            clearOutput();
            const file = mergeInput.files?.[0];
            if (!file || file.size === 0 || file.size > 15 * 1024 * 1024) throw new Error('Choose a PDF between 1 byte and 15 MB to append.');
            const bytes = await file.arrayBuffer();
            const result = await send({ type: 'merge', bytes }, [bytes]);
            if (stopped) throw new Error('PDF lab closed.');
            showSource(new Blob([result.bytes], { type: 'application/pdf' }));
            mergeInput.value = '';
            return { ...result.info, filename: `${filename} (combined)` };
        },
        async exportPdf(pages, rotation) {
            clearOutput();
            const result = await send({ type: 'export', pages, rotation });
            if (stopped) return;
            downloadUrl = URL.createObjectURL(new Blob([result.bytes], { type: 'application/pdf' }));
            download.href = preview.href = downloadUrl;
            viewer.src = downloadUrl;
            download.download = `${filename}-selected.pdf`;
            return result.bytes.byteLength;
        },
        clearOutput,
        dispose() {
            stop('PDF lab closed.');
            clearOutput();
            viewer.removeAttribute('src');
            sourceLink.removeAttribute('href');
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
        }
    };
}
