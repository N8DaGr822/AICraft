import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the shipped bank-page callbacks with a small DOM; Python transport is tested separately.
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.value = ''; this.style = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; if (name === 'value') this.value = value; }
    addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
    async fire(name) { for (const handler of this.listeners[name] || []) await handler({ target: this, preventDefault() {} }); }
    get options() { return this.children.filter(child => child.tag === 'option'); }
    get selectedIndex() { return this.options.findIndex(option => option.value === this.value); }
    set selectedIndex(index) { this.value = this.options[index]?.value || ''; }
    get textContent() { return this.text ?? this.children.map(child => child.textContent ?? child).join(''); }
    set textContent(value) { this.text = value; }
}
const roots = new Map(['#workpaper', '#report-sidebar', '#notice'].map(id => [id, new Element('div')]));
const context = vm.createContext({
    console, URLSearchParams, Node: Element,
    location: { search: '' }, localStorage: { getItem() { return null; } },
    document: { createElement: tag => new Element(tag), createTextNode: value => value, querySelector: id => roots.get(id) }
});
const source = await readFile(new URL('../AITest/wwwroot/ledger-reborn/2026.10.12-preview.1/app.js', import.meta.url), 'utf8');
const startup = source.indexOf("$('#window-menu').addEventListener");
assert.ok(startup > 0, 'Find the event wiring after the shipped function definitions');
vm.runInContext(source.slice(0, startup), context);
const descendants = node => [node, ...node.children.flatMap(child => child instanceof Element ? descendants(child) : [])];
const nodes = () => descendants(roots.get('#workpaper'));
const control = name => nodes().find(node => node.attributes.name === name);
const button = label => nodes().find(node => node.tag === 'button' && node.textContent === label);
const calls = [];
context.fixture = {
    read_only: false,
    data: {
        accounts: [
            ['1000', 'Checking', 'asset'], ['1001', 'Savings', 'asset'], ['1100', 'Accounts Receivable', 'asset'],
            ['1200', 'Inventory', 'asset'], ['2000', 'Accounts Payable', 'liability'], ['2200', 'Credit Card', 'liability'],
            ['4000', 'Revenue', 'income'], ['6300', 'Supplies', 'expense']
        ].map(([code, name, kind]) => ({ code, name, kind })),
        projects: [], items: [],
        bank_transactions: [{ id: 1, bank_account: '1001', date: '2026-10-03', description: 'Synthetic savings deposit', amount_cents: 1500, status: 'pending' }]
    }
};
context.saveStub = async (action, payload) => {
    calls.push({ action, ...payload });
    if (context.failSave) throw Error('Synthetic save failure');
    context.fixture.data.bank_transactions[0].status = action === 'classify_bank_transaction' ? 'classified' : 'matched';
};
context.reportStub = async (name, args) => {
    assert.equal(name, 'bank_register');
    return { rows: args.bank_account === '1001' ? [{ id: 7, entry_id: 3, date: '2026-10-03', memo: 'Synthetic transfer', amount_cents: 1500 }] : [] };
};
vm.runInContext('state = fixture; save = saveStub; report = reportStub;', context);

await vm.runInContext("bankTransactions('1001')", context);
await button('Add to Ledger').fire('click');
assert.equal(control('bank_account').value, '1001', 'Classification keeps the selected nondefault bank');
assert.ok(roots.get('#workpaper').textContent.includes('classified'), 'Classification displays the refreshed row status');
assert.equal(calls.at(-1).transaction_id, 1);
assert.equal(calls.at(-1).account, '4000');

context.fixture.data.bank_transactions[0].status = 'pending';
await vm.runInContext("bankTransactions('1001')", context);
control('entry_line_id').value = '7';
await button('Match').fire('click');
assert.equal(control('bank_account').value, '1001', 'Matching keeps the selected nondefault bank');
assert.ok(roots.get('#workpaper').textContent.includes('matched'), 'Matching displays the refreshed row status');
assert.equal(calls.at(-1).entry_line_id, 7);

context.fixture.data.bank_transactions[0].status = 'pending';
await vm.runInContext("bankTransactions('1001')", context);
const counterAccounts = control('account').options.map(option => option.value);
assert.equal(control('account').options.find(option => option.value === '4000').textContent, '4000 \u2014 Revenue');
for (const code of ['1100', '1200', '2000']) assert.ok(!counterAccounts.includes(code), `Classification excludes control account ${code}`);
for (const code of ['1000', '2200', '4000', '6300']) assert.ok(counterAccounts.includes(code), `Classification retains supported account ${code}`);
assert.match(roots.get('#workpaper').textContent, /Receive Payments.*Pay Bills.*Match/);
assert.match(roots.get('#workpaper').textContent, /inventory/i);
context.failSave = true;
await button('Add to Ledger').fire('click');
assert.equal(control('bank_account').value, '1001', 'Failed saves leave the selected bank unchanged');
assert.equal(context.fixture.data.bank_transactions[0].status, 'pending');
assert.equal(roots.get('#notice').textContent, 'Synthetic save failure');
console.log('Ledger bank UI: classify/match retain account and refresh status; control accounts excluded; failed saves preserve review state.');
