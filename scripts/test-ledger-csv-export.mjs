import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual download callback without opening formulas in a spreadsheet application.
const source = await readFile(new URL('../AITest/wwwroot/ledger-reborn/2026.10.12-preview.1/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function exportReport()');
const end = source.indexOf('function addDocumentGrid(', start);
assert.ok(start >= 0 && end > start, 'Find the shipped report export callback');
let tab, download, blob, clicked = 0, revoked = 0;
const context = vm.createContext({
    Blob,
    activeTab: () => tab,
    URL: {
        createObjectURL(value) { blob = value; return 'blob:synthetic-report'; },
        revokeObjectURL(value) { assert.equal(value, 'blob:synthetic-report'); revoked++; }
    },
    E(tag, attributes) { assert.equal(tag, 'a'); download = attributes; return { click() { clicked++; } }; },
    notice() {}
});
vm.runInContext(source.slice(start, end), context);

function parseCsv(text) {
    const rows = [], row = [];
    let value = '', quoted = false;
    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        if (character === '"') {
            if (quoted && text[index + 1] === '"') { value += '"'; index++; }
            else quoted = !quoted;
        } else if (!quoted && (character === ',' || character === '\n')) {
            row.push(value); value = '';
            if (character === '\n') { rows.push([...row]); row.length = 0; }
        } else value += character;
    }
    assert.equal(quoted, false, 'CSV quoted fields close correctly');
    row.push(value); rows.push(row);
    return rows;
}

const risky = ['=1+1', '+1+1', '-1+1', '@SUM(1,1)', '＝1+1', '＋1+1', '－1+1', '＠SUM(1,1)',
    ' \t\r\n=1+1', '\u0000\u007f@SUM(1,1)', '\u00a0＝1+1', '\tplain text', '\rplain text', '\nplain text',
    '=1+2";=1+2', '=1+2\'" ;,=1+2', '-123'];
const ordinary = ['Synthetic memo', 'Café 日本語', 'comma, semi; quote " and\nnew line', '', null, false, 0, -1219, 1117];
const rows = [...risky, ...ordinary].map(value => ({ memo: value, amount_cents: -1219, '=synthetic_header': 'kept' }));
const original = structuredClone(rows);
for (const result of [rows, { rows }, { display_rows: rows, rows: [{ memo: 'unused fallback' }] }]) {
    tab = { result, method: 'general_ledger', config: { to: '2026-11-19' } };
    vm.runInContext('exportReport()', context);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'Preserve the UTF-8 BOM');
    const csv = new TextDecoder().decode(bytes);
    const output = parseCsv(csv);
    assert.deepEqual(output[0], ['memo', 'amount_cents', "'=synthetic_header"]);
    assert.equal(output.length, rows.length + 1, 'Delimiters/newlines cannot create injected cells or rows');
    for (let index = 0; index < risky.length; index++) assert.equal(output[index + 1][0], "'" + risky[index]);
    for (let index = 0; index < ordinary.length; index++) assert.equal(output[risky.length + index + 1][0], String(ordinary[index] ?? ''));
    assert.ok(output.slice(1).every(row => row.length === 3 && row[1] === '-1219' && row[2] === 'kept'));
    assert.equal(download.href, 'blob:synthetic-report');
    assert.equal(download.download, 'general_ledger-2026-11-19.csv');
    assert.equal(blob.type, 'text/csv;charset=utf-8');
    assert.deepEqual(rows, original, 'Export must not mutate stored/report data');
}
assert.equal(clicked, 3);
assert.equal(revoked, 3);
tab = undefined;
vm.runInContext('exportReport()', context);
assert.equal(clicked, 3, 'No active report does not trigger a download');
console.log('Ledger CSV export regression passed: formula text guarded, numeric amounts and report data preserved.');
