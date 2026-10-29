import init, { generate } from '../wasm-vector/aicraft_vector.js';
const ready = init();
self.onmessage = async ({ data }) => {
    try {
        await ready;
        const result = data.settings ? JSON.parse(generate(JSON.stringify(data.settings))) : null;
        self.postMessage({ id: data.id, result });
    } catch (error) {
        self.postMessage({ id: data.id, error: String(error.message ?? error) });
    }
};
