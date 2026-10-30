import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { loadPyodide } from '../.tools/pyodide/node_modules/pyodide/pyodide.mjs';
const py = await loadPyodide();
for (const name of ['ledger.py','ledger_bridge.py']) py.FS.writeFile(`/home/pyodide/${name}`, await readFile(new URL(`../AITest/wwwroot/python/${name}`, import.meta.url)));
await py.runPythonAsync('from ledger_bridge import dispatch, book');
const call = (action,args={}) => {
    py.globals.set('request_json',JSON.stringify({action,args,asOf:'2026-10-29'}));
    return JSON.parse(py.runPython('dispatch(request_json)'));
};
call('contact',{name:'Synthetic customer'});
let result = call('invoice',{date:'2026-10-01',contactId:1,description:'Test service',amountCents:10000,requestId:'test-invoice'});
assert.equal(result.invoices[0].outstandingCents,10000);
result = call('payment',{date:'2026-10-02',invoiceId:1,amountCents:4000,requestId:'test-payment'});
assert.equal(result.invoices[0].outstandingCents,6000);
assert.equal(result.profitCents,10000);
assert.equal(result.accounts.find(x=>x.code==='1000').balanceCents,4000);
assert.equal(result.accounts.find(x=>x.code==='4000').balanceCents,10000);
assert.equal(result.ledgerRows.filter(x=>x.account==='1000').length,1);
assert.equal(result.ledgerRows.find(x=>x.account==='1000').balanceCents,4000);
assert.equal(result.ledgerRows.find(x=>x.account==='1000').name,'Synthetic customer');
py.globals.set('request_json',JSON.stringify({action:'snapshot',args:{},asOf:'2026-10-01'}));
const earlier = JSON.parse(py.runPython('dispatch(request_json)'));
assert.equal(earlier.accounts.find(x=>x.code==='1000').balanceCents,0);
assert.equal(earlier.ledgerRows.filter(x=>x.account==='1000').length,0);
assert.equal(result.rows.find(x=>x.code==='1000').debitCents,4000);
assert.equal(result.rows.find(x=>x.code==='1100').debitCents,6000);
assert.equal(result.rows.reduce((a,r)=>a+r.debitCents-r.creditCents,0),0);
assert.throws(()=>call('payment',{date:'2026-10-02',invoiceId:1,amountCents:6001,requestId:'bad-payment'}));
assert.throws(()=>call('invoice',{date:'2026-10-01',contactId:1,description:'Bad fractional cents',amountCents:1.1,requestId:'bad-invoice'}));
assert.throws(()=>call('__import__'));
assert.equal(call('snapshot').invoices.length,1);
// Bank Review: Stage without posting, preserve direction, and prevent replay across local accounts.
const bankExport = (rows, accountId='source-checking') => JSON.stringify({format:'aicraft-bank',version:1,accountId,transactions:rows});
const bankRow = (id,amountCents,name='Synthetic bank transaction') => ({id,date:'2026-10-03',name,amountCents,currency:'USD',pending:false});
const incoming = bankExport([bankRow('expense',1000),bankRow('income',-2000)]);
const importRows = (contents,bankAccount='1000') => call('bank_import',{contents,bankAccount});
result=importRows(incoming);
assert.equal(result.accounts.find(x=>x.code==='1000').balanceCents,4000,'Staging does not post');
assert.equal(result.bankRows.length,2);
assert.equal(importRows(incoming).bankRows.length,2,'Same file is idempotent');
call('account',{code:'1001',name:'Synthetic savings',kind:'asset'});
call('account',{code:'2200',name:'Synthetic credit card',kind:'liability'});
assert.throws(()=>importRows(incoming,'1001'),/different local bank/);
const expense=result.bankRows.find(x=>x.amountCents===-1000);
result=call('bank_classify',{id:expense.id,account:'6300'});
assert.equal(result.accounts.find(x=>x.code==='1000').balanceCents,3000);
assert.equal(result.accounts.find(x=>x.code==='6300').balanceCents,1000);
assert.throws(()=>call('bank_classify',{id:expense.id,account:'6300'}),/already classified/);
const income=result.bankRows.find(x=>x.amountCents===2000);
result=call('bank_classify',{id:income.id,account:'4000'});
assert.equal(result.accounts.find(x=>x.code==='1000').balanceCents,5000);
assert.equal(importRows(incoming).bankRows.filter(x=>x.status==='classified').length,2);
// Atomic Import: A conflicting existing ID must roll back earlier rows in the same file.
assert.throws(()=>importRows(bankExport([bankRow('must-rollback',100),bankRow('expense',1001)])),/different transaction data/);
assert.equal(call('snapshot').bankRows.length,2);
for (const patch of [{pending:true},{currency:'EUR'},{amountCents:1.5},{amountCents:0},{date:'not-a-date'}])
    assert.throws(()=>importRows(bankExport([{...bankRow('bad',100),...patch}])));
assert.throws(()=>importRows(bankExport([bankRow('repeated',100),bankRow('repeated',100)])));
assert.throws(()=>importRows('{}'));
assert.throws(()=>importRows(incoming,'1100'));
// Transfer: Post checking outflow once, match savings inflow to its existing journal leg.
result=importRows(bankExport([bankRow('transfer-out',1500)]));
const transfer=result.bankRows.find(x=>x.status==='pending');
result=call('bank_classify',{id:transfer.id,account:'1001'});
result=importRows(bankExport([bankRow('transfer-in',-1500)],'source-savings'),'1001');
const savings=result.bankRows.find(x=>x.bankAccount==='1001');
const line=result.bankLines.find(x=>x.bankAccount==='1001' && x.amountCents===1500);
const beforeMatch=result.ledgerRows.length;
result=call('bank_match',{id:savings.id,lineId:line.id});
assert.equal(result.ledgerRows.length,beforeMatch,'Matching does not double-post transfers');
assert.equal(result.accounts.find(x=>x.code==='1001').balanceCents,1500);
assert.equal(result.bankRows.find(x=>x.id===savings.id).status,'matched');
// Card Payment: Debit liability; do not increase expenses.
const profitBeforeCard=result.profitCents;
result=importRows(bankExport([bankRow('card-payment',500)]));
result=call('bank_classify',{id:result.bankRows.find(x=>x.status==='pending').id,account:'2200'});
assert.equal(result.accounts.find(x=>x.code==='2200').balanceCents,-500);
assert.equal(result.profitCents,profitBeforeCard);
assert.equal(result.rows.reduce((total,row)=>total+row.debitCents-row.creditCents,0),0);
assert.equal(result.accounts.find(x=>x.code==='1000').balanceCents,3000);
// Persistence Round-trip: Reopen the bytes exported from the actual WASM SQLite filesystem.
const bytes = py.FS.readFile('/ledger.sqlite');
await mkdir(new URL('../.tools/',import.meta.url),{recursive:true});
await writeFile(new URL('../.tools/ledger-test.sqlite',import.meta.url),bytes);
py.runPython("book.close()\nfrom ledger import Ledger\nimport ledger_bridge\nledger_bridge.book = Ledger('/ledger.sqlite')");
assert.equal(call('snapshot').invoices[0].outstandingCents,6000);
assert.equal(call('snapshot').bankRows.length,5);
assert.equal(importRows(incoming).bankRows.length,5,'Duplicate protection survives reopening');
console.log('Pyodide ledger: bank review, duplicate protection, atomic rollback, transfer matching, card payment,  invoice, partial payment, balanced reports, validation, and SQLite reopen passed.');
// Full upstream UI routes run against the same saved company through the browser transport.
py.FS.mkdirTree('/home/pyodide/fixtures');
for (const name of ['ledger_server.py','ledger_suite_bridge.py','fixtures/scenario.json','fixtures/bank.csv']) py.FS.writeFile(`/home/pyodide/${name}`, await readFile(new URL(`../AITest/wwwroot/python/${name}`, import.meta.url)));
await py.runPythonAsync('from ledger_suite_bridge import suite_dispatch');
function http(path, data) {
    py.globals.set('suite_request', JSON.stringify({args:{path,method:data===undefined?'GET':'POST',body:data===undefined?'':JSON.stringify(data)}}));
    const response=JSON.parse(py.runPython('suite_dispatch(suite_request)'));
    response.bytes=Buffer.from(response.body,'base64');
    if(response.contentType.startsWith('application/json')) response.json=JSON.parse(response.bytes);
    return response;
}
let state=http('/api/state');
assert.equal(state.status,200,JSON.stringify(state.json));
assert.equal(state.json.book,'company');
assert.equal(http('/api/action',{action:'load_demo',payload:{}}).status,400);
let demo=http('/api/action?book=demo',{action:'load_demo',payload:{}});
assert.equal(demo.status,200,JSON.stringify(demo.json));
assert.equal(http('/api/state?book=demo').status,200);
assert.deepEqual(http('/api/state').json,state.json,'Demo must not modify company');
assert.equal(http('/api/action',{action:'__import__',payload:{}}).status,400);
assert.equal(http('/api/action',[]).status,400);
assert.equal(http('/api/state?book=reference').status,400);
assert.throws(()=>http('/etc/passwd'));
assert.equal(http('/api/export').status,200);
let backup=http('/api/backup');
assert.equal(backup.status,200,JSON.stringify(backup.json));
assert.equal(backup.bytes.subarray(0,15).toString(),'SQLite format 3');
const imported=http('/api/action',{action:'import_bank_csv',payload:{contents:incoming,bank_account:'1000'}});
assert.equal(imported.status,200,JSON.stringify(imported.json));
assert.equal(call('snapshot').bankRows.length,5,'Full UI and quick UI share duplicate protection');
assert.equal(http('/api/action?book=demo',{action:'import_bank_csv',payload:{contents:incoming,bank_account:'1000'}}).status,200);
assert.equal(call('snapshot').bankRows.length,5);
console.log('Full Ledger transport: company/demo isolation, upstream actions, shared imports, route validation, exports and SQLite backup passed.');
// Reports exercise the fixture's invoices, bills, inventory, projects and budgets through upstream routing.
for (const [name,params] of Object.entries({profit_loss:{start_date:'2026-01-01',end_date:'2026-12-31'},balance_sheet:{as_of:'2026-12-31'},trial_balance:{as_of:'2026-12-31'},ar_aging:{as_of:'2026-12-31'},ap_aging:{as_of:'2026-12-31'},inventory_report:{as_of:'2026-12-31'},audit_log:{},project_profitability:{start:'2026-01-01',end:'2026-12-31'},budget_vs_actual:{period:'2026-10'},bank_register:{bank_account:'1000',as_of:'2026-12-31'},general_ledger:{start_date:'2026-01-01',end_date:'2026-12-31'},account_listing:{as_of:'2026-12-31'}})) {
    const response=http('/api/report?'+new URLSearchParams({book:'demo',name,...params}));
    assert.equal(response.status,200,name+': '+JSON.stringify(response.json));
}
console.log('Full Ledger reports: 12 report routes passed.');
