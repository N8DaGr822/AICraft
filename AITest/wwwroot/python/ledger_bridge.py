"""AICraft's narrow browser adapter; upstream ledger.py remains unmodified."""
import json
from ledger import Ledger, _date

book = Ledger('/ledger.sqlite')
# Browser Storage: Use one file so each IndexedDB snapshot includes committed changes.
book.conn.execute('PRAGMA journal_mode=DELETE')

def snapshot(as_of):
    trial = book.trial_balance(as_of)
    profit = book.profit_loss(as_of[:4] + '-01-01', as_of)
    contacts = [dict(id=r['id'], name=r['name']) for r in book.conn.execute("SELECT id,name FROM contacts WHERE kind IN ('customer','both') ORDER BY id")]
    invoices = []
    for row in book.conn.execute("SELECT id FROM documents WHERE type='invoice' ORDER BY id DESC"):
        doc = book.get_invoice(row['id'])
        invoices.append(dict(id=doc['id'], date=doc['date'], totalCents=doc['total_cents'], outstandingCents=doc['outstanding_cents']))
    return dict(contacts=contacts, invoices=invoices, profitCents=profit['net_profit_cents'],
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
    elif action != 'snapshot':
        raise ValueError('Unsupported ledger operation.')
    return json.dumps(snapshot(request['asOf']))
