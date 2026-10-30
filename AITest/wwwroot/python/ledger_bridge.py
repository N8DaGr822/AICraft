"""AICraft's narrow browser adapter; upstream ledger.py remains unmodified."""
import json
import csv
import io
import hashlib
from ledger import Ledger, _date

book = Ledger('/ledger.sqlite')
# Browser Storage: Use one file so each IndexedDB snapshot includes committed changes.
book.conn.execute('PRAGMA journal_mode=DELETE')

def import_bank_export(contents, bank_account, ledger=None):
    ledger = book if ledger is None else ledger
    if not isinstance(contents, str) or len(contents.encode('utf-8')) > 512 * 1024:
        raise ValueError('Choose an AICraft bank export smaller than 512 KB.')
    data = json.loads(contents)
    if not isinstance(data, dict) or data.get('format') != 'aicraft-bank' or data.get('version') != 1:
        raise ValueError('Choose a version 1 AICraft bank export.')
    account_id, rows = data.get('accountId'), data.get('transactions')
    if not isinstance(account_id, str) or not 1 <= len(account_id) <= 200:
        raise ValueError('Invalid source bank account.')
    if not isinstance(rows, list) or not 1 <= len(rows) <= 100:
        raise ValueError('Import between 1 and 100 transactions at a time.')
    bank = ledger._account(bank_account, {'asset'})
    if bank_account in ('1100', '1200'):
        raise ValueError('Choose a cash/bank asset account, not receivables or inventory.')
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['date', 'description', 'amount_cents', 'external_id'])
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Invalid transaction.')
        identity, cents, name = row.get('id'), row.get('amountCents'), row.get('name')
        if not isinstance(identity, str) or not 1 <= len(identity) <= 200 or identity in seen:
            raise ValueError('Missing or repeated transaction ID in export.')
        seen.add(identity)
        if row.get('pending') is not False or row.get('currency') != 'USD':
            raise ValueError('Only posted USD transactions can be imported.')
        if type(cents) is not int or not 0 < abs(cents) <= 100000000:
            raise ValueError('Amount must be nonzero whole cents, at most 1,000,000 USD.')
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 1000:
            raise ValueError('Description must contain 1 to 1000 characters.')
        _date(row.get('date'))
        # Provider Identity: Stable IDs protect repeat imports even when another local bank is selected.
        external = 'plaid:' + hashlib.sha256(json.dumps([account_id, identity]).encode()).hexdigest()
        previous = ledger.conn.execute('SELECT bank_account_id FROM bank_transactions WHERE external_id=?', (external,)).fetchone()
        if previous and previous['bank_account_id'] != bank['id']:
            raise ValueError('This transaction was already imported into a different local bank account.')
        # Amount Direction: Plaid outflows are positive; the engine expects positive inflows.
        writer.writerow([row['date'], name, -cents, external])
    return ledger.import_bank_csv(output.getvalue(), bank_account)


def snapshot(as_of):
    trial = book.trial_balance(as_of)
    profit = book.profit_loss(as_of[:4] + '-01-01', as_of)
    contacts = [dict(id=r['id'], name=r['name']) for r in book.conn.execute("SELECT id,name FROM contacts WHERE kind IN ('customer','both') ORDER BY id")]
    invoices = []
    for row in book.conn.execute("SELECT id FROM documents WHERE type='invoice' ORDER BY id DESC"):
        doc = book.get_invoice(row['id'])
        invoices.append(dict(id=doc['id'], date=doc['date'], totalCents=doc['total_cents'], outstandingCents=doc['outstanding_cents']))
    # Account Views: Read posted journal lines and engine balances using the selected report date.
    accounts = book.account_listing(as_of)['rows']
    journal = book.general_ledger('0001-01-01', as_of)['rows']
    bank_rows = [dict(id=r['id'], bankAccount=r['code'], date=r['date'], name=r['description'], amountCents=r['amount_cents'], status=r['status'])
                 for r in book.conn.execute('SELECT b.*,a.code FROM bank_transactions b JOIN accounts a ON a.id=b.bank_account_id ORDER BY b.date DESC,b.id DESC')]
    bank_lines = [dict(id=r['id'], bankAccount=r['code'], date=r['date'], name=r['memo'], amountCents=r['amount'])
                  for r in book.conn.execute('''SELECT l.id,a.code,e.date,e.memo,l.debit_cents-l.credit_cents amount
                    FROM journal_lines l JOIN entries e ON e.id=l.entry_id JOIN accounts a ON a.id=l.account_id
                    WHERE a.kind='asset' AND NOT EXISTS(SELECT 1 FROM bank_transactions b WHERE b.entry_line_id=l.id)''')]
    return dict(bankRows=bank_rows, bankLines=bank_lines, contacts=contacts, invoices=invoices, profitCents=profit['net_profit_cents'],
                accounts=[dict(code=r['code'], name=r['name'], kind=r['kind'], balanceCents=r['normal_balance_cents']) for r in accounts],
                ledgerRows=[dict(account=r['account_code'], date=r['date'], memo=r['memo'], name=r['name'],
                                 type=r['type'], debitCents=r['debit_cents'], creditCents=r['credit_cents'],
                                 balanceCents=r['running_balance_cents']) for r in journal],
                rows=[dict(code=r['code'], name=r['name'], debitCents=r['debit_cents'], creditCents=r['credit_cents']) for r in trial['rows']])

def dispatch(request_json):
    request = json.loads(request_json)
    _date(request['asOf'])
    action, args = request['action'], request.get('args', {})
    # Dispatch Boundary: The page cannot invoke arbitrary engine methods or Python code.
    if action == 'contact':
        book.create_contact(args['name'], 'customer')
    elif action == 'invoice':
        book.create_invoice(args['date'], args['contactId'],
                            [dict(description=args['description'], amount_cents=args['amountCents'], account='4000')], external_id=args['requestId'])
    elif action == 'payment':
        book.receive_payment(args['date'], args['invoiceId'], args['amountCents'], external_id=args['requestId'])
    elif action == 'bank_import':
        import_bank_export(args['contents'], args['bankAccount'])
    elif action == 'bank_classify':
        if args['account'] in ('1100', '1200', '2000'):
            raise ValueError('Use invoice/bill workflows for receivables/payables and inventory APIs for inventory.')
        book.classify_bank_transaction(args['id'], args['account'])
    elif action == 'bank_match':
        book.match_bank_transaction(args['id'], args['lineId'])
    elif action == 'account':
        book.create_account(args['code'], args['name'], args['kind'])
    elif action != 'snapshot':
        raise ValueError('Unsupported ledger operation.')
    return json.dumps(snapshot(request['asOf']))
