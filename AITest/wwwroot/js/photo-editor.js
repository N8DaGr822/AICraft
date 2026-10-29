export async function create(input, before, after, download) {
    const worker = new Worker(new URL('./photo-worker.js', import.meta.url), { type: 'module' });
    const pending = new Map();
    let sequence = 0;
    let disposed = false;
    let failed = false;
    let downloadUrl;
    let width = 0;
    let height = 0;
    let filename = 'photo';

    function send(data, transfer = []) {
        if (disposed || failed) return Promise.reject(new Error('Photo engine unavailable. Reload the page to retry.'));
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error('Photo processing timed out. Try a smaller image or reload the page.'));
            }, 60000);
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
    function stop(message) {
        worker.terminate();
        for (const request of pending.values()) {
            clearTimeout(request.timer);
            request.reject(new Error(message));
        }
        pending.clear();
    }
    worker.onerror = () => {
        failed = true;
        stop('Could not load the Rust photo engine. Reload the page to retry.');
    };
    function clearDownload() {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = undefined;
        download.removeAttribute('href');
    }
    async function prepareDownload() {
        const blob = await new Promise(resolve => after.toBlob(resolve, 'image/png'));
        if (disposed) return;
        if (!blob) throw new Error('Could not export the edited photo.');
        clearDownload();
        downloadUrl = URL.createObjectURL(blob);
        download.href = downloadUrl;
        download.download = `${filename}-aicraft.png`;
    }
    try {
        await send({ type: 'ready' });
    } catch (error) {
        stop('Photo engine initialization failed.');
        throw error;
    }
    return {
        async load() {
            const file = input.files?.[0];
            if (!file) throw new Error('Choose a photo first.');
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                throw new Error('Choose a JPEG, PNG, or WebP photo.');
            if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
            const bitmap = await createImageBitmap(file);
            try {
                if (disposed) return '';
                // Mobile Memory: Limit the working copy to four megapixels and 2560px per side.
                const scale = Math.min(1, 2560 / bitmap.width, 2560 / bitmap.height,
                    Math.sqrt(4_000_000 / (bitmap.width * bitmap.height)));
                width = Math.max(1, Math.floor(bitmap.width * scale));
                height = Math.max(1, Math.floor(bitmap.height * scale));
                before.width = after.width = width;
                before.height = after.height = height;
                const context = before.getContext('2d', { willReadFrequently: true });
                context.drawImage(bitmap, 0, 0, width, height);
                after.getContext('2d').drawImage(before, 0, 0);
                clearDownload();
                const pixels = context.getImageData(0, 0, width, height).data;
                await send({ type: 'load', pixels: pixels.buffer }, [pixels.buffer]);
                filename = file.name.replace(/\.[^.]+$/, '');
                await prepareDownload();
                return `${file.name} · ${width} × ${height}${scale < 1 ? ' · resized working copy' : ''}`;
            } finally { bitmap.close(); }
        },
        async edit(exposure, saturation, hue, grayscale) {
            clearDownload();
            const result = await send({ type: 'edit', exposure, saturation, hue, grayscale });
            if (disposed) return;
            after.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels), width, height), 0, 0);
            await prepareDownload();
        },
        dispose() {
            disposed = true;
            stop('Photo editor closed.');
            clearDownload();
            before.width = before.height = after.width = after.height = 0;
        }
    };
}
