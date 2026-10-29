import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import init, { adjust } from '../AITest/wwwroot/wasm/aicraft_photo.js';
await init({ module_or_path: await readFile(new URL('../AITest/wwwroot/wasm/aicraft_photo_bg.wasm', import.meta.url)) });
assert.deepEqual([...adjust(new Uint8Array([1, 128, 255, 17]), 0, 1, 0, false)], [1, 128, 255, 17]);
assert.deepEqual([...adjust(new Uint8Array([255, 0, 0, 37]), 0, 1, 0, true)], [76, 76, 76, 37]);
assert.deepEqual([...adjust(new Uint8Array([255, 0, 0, 255]), 0, 1, 120, false)], [0, 255, 0, 255]);
assert.deepEqual([...adjust(new Uint8Array([128, 128, 128, 19]), 1, 1, 0, false)], [176, 176, 176, 19]);
for (const pixels of [new Uint8Array(), new Uint8Array(3), new Uint8Array(16_000_004)]) {
    assert.throws(() => adjust(pixels, 0, 1, 0, false));
}
for (const args of [[NaN, 1, 0], [0, Infinity, 0], [4, 1, 0], [0, 1, 181]]) {
    assert.throws(() => adjust(new Uint8Array(4), ...args, false));
}
console.log('Compiled WebAssembly: identity, alpha, grayscale, hue, exposure, and input validation passed.');
