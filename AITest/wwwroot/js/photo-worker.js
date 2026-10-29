import init, { adjust } from '../wasm/aicraft_photo.js';

const ready = init();
let original;
self.onmessage = async ({ data }) => {
    try {
        await ready;
        if (data.type === 'load') original = new Uint8Array(data.pixels);
        if (data.type === 'edit') {
            if (!original) throw new Error('Choose a photo first.');
            const pixels = adjust(original, data.exposure, data.saturation, data.hue, data.grayscale);
            self.postMessage({ id: data.id, pixels: pixels.buffer }, [pixels.buffer]);
        } else {
            self.postMessage({ id: data.id });
        }
    } catch (error) {
        self.postMessage({ id: data.id, error: String(error.message ?? error) });
    }
};
