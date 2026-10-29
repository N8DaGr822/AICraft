import init, { PdfSession } from '../wasm-pdf/aicraft_pdf.js';

const ready = init();
let document;
self.onmessage = async ({ data }) => {
    try {
        await ready;
        switch (data.type) {
            case 'load':
                document?.free();
                document = undefined;
                document = new PdfSession(new Uint8Array(data.bytes));
                self.postMessage({ id: data.id, info: JSON.parse(document.inspect()) });
                break;
            case 'export': {
                if (!document) throw new Error('Choose a PDF first.');
                const bytes = document.export(data.pages, data.rotation);
                self.postMessage({ id: data.id, bytes: bytes.buffer }, [bytes.buffer]);
                break;
            }
            case 'ready':
                self.postMessage({ id: data.id });
                break;
            default:
                throw new Error('Unknown PDF operation.');
        }
    } catch (error) {
        self.postMessage({ id: data.id, error: String(error.message ?? error) });
    }
};
