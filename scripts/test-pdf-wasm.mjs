import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import init, { PdfSession } from '../AITest/wwwroot/wasm-pdf/aicraft_pdf.js';
await init({ module_or_path: await readFile(new URL('../AITest/wwwroot/wasm-pdf/aicraft_pdf_bg.wasm', import.meta.url)) });
const input = await readFile(new URL('../AITest/wwwroot/sample-data/pdf-lab-sample.pdf', import.meta.url));
const source = new PdfSession(input);
try {
    const details = JSON.parse(source.inspect());
    assert.equal(details.count, 3);
    assert.equal(details.title, 'AICraft sample PDF');
    assert.equal(details.repaired, false);
    assert.deepEqual(details.pages.map(p => [p.width, p.height]), [[612,792], [792,612], [500,500]]);
    const output = source.export('3, 1', 90);
    const copy = new PdfSession(output);
    try {
        const selected = JSON.parse(copy.inspect());
        assert.equal(selected.count, 2);
        assert.deepEqual(selected.pages.map(p => [p.width,p.height,p.rotation]), [[500,500,90], [612,792,90]]);
        assert.equal(selected.repaired, false);
    } finally { copy.free(); }
    // Independent content check: selected streams survive and the omitted page does not.
    const text = new TextDecoder().decode(output);
    assert.ok(text.includes('AICraft - Page 3'));
    assert.ok(text.includes('AICraft - Page 1'));
    assert.ok(!text.includes('AICraft - Page 2'));
    assert.equal(JSON.parse(source.inspect()).count, 3);
    assert.equal(JSON.parse(source.inspect()).pages[0].rotation, 0);
    for (const value of ['', '0', '4', '3-1', '1,1', '1-2,2', '1,', 'one', '1-2-3'])
        assert.throws(() => source.export(value, 0), undefined, value);
    assert.throws(() => source.export('1', 45));
    assert.throws(() => new PdfSession(new Uint8Array()));
    assert.throws(() => new PdfSession(new TextEncoder().encode('not a PDF')));
    assert.throws(() => new PdfSession(new Uint8Array(15 * 1024 * 1024 + 1)));
    const merged = source.merge(output);
    const mergedSession = new PdfSession(merged);
    try {
        const mergedInfo = JSON.parse(mergedSession.inspect());
        assert.equal(mergedInfo.count, 5);
        assert.equal(mergedInfo.pages[3].rotation, 90);
        assert.equal(mergedInfo.pages[3].width, 500);
        assert.equal(JSON.parse(source.inspect()).count, 3);
        assert.throws(() => source.merge(new TextEncoder().encode('bad PDF')));
    } finally { mergedSession.free(); }
    // Keep the exported fixture for an independent PDF reader and visual inspection.
    await mkdir(new URL('../.tools/', import.meta.url), { recursive: true });
    await writeFile(new URL('../.tools/pdf-export-test.pdf', import.meta.url), output);
} finally { source.free(); }
console.log('PDF WASM: page metadata, extraction, order, rotation, source preservation, and validation passed.');
