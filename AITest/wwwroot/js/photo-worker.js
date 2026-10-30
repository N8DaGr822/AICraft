import init, { adjust } from '../wasm/aicraft_photo.js';
import { transformPixels } from './photo-geometry.js';

const ready = init();
let original;
self.onmessage = async ({ data }) => {
    try {
        await ready;
        if (data.type === 'load') original = new Uint8Array(data.pixels);
        if (data.type === 'edit') {
            if (!original) throw new Error('Choose a photo first.');
            const adjusted = adjust(original, data.exposure, data.saturation, data.hue, data.grayscale);
            const result = transformPixels(adjusted, data.width, data.height, data.geometry);
            self.postMessage({ id: data.id, pixels: result.pixels.buffer, width: result.width, height: result.height }, [result.pixels.buffer]);
        } else {
            self.postMessage({ id: data.id });
        }
    } catch (error) {
        self.postMessage({ id: data.id, error: String(error.message ?? error) });
    }
};
