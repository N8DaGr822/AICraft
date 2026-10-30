"""In-memory HTTP transport for the pinned Ledger UI; no server or network listener."""
import base64
import io
import json
from pathlib import Path
from types import SimpleNamespace
import threading
from urllib.parse import urlparse
import ledger_server as server
import ledger_bridge
from ledger import Ledger
from ledger_bridge import import_bank_export

BOOKS = {'company': Path('/ledger.sqlite'), 'demo': Path('/ledger-demo.sqlite')}


def open_book(company, books=None):
    # Shared Company: Reuse the quick adapter's connection rather than changing journal mode under an open connection.
    if company == 'company':
        return ledger_bridge.book
    book = Ledger((books or BOOKS)[company])
    # Durable Snapshot: Each company must fit in one SQLite file before IndexedDB acknowledges a request.
    book.conn.execute('PRAGMA journal_mode=DELETE')
    return book


server.open_book = open_book


def close_book(book):
    if book is not ledger_bridge.book:
        book.close()


server.close_book = close_book


class BrowserHandler(server.Handler):
    def send_payload(self, code, body, content_type, filename=None):
        self.result = dict(status=code, body=base64.b64encode(body).decode(), contentType=content_type, filename=filename)

    def log_message(self, *args):
        pass


def suite_dispatch(request_json):
    args = json.loads(request_json)['args']
    path, method, body = args['path'], args.get('method', 'GET'), args.get('body') or ''
    parsed = urlparse(path)
    if parsed.scheme or parsed.netloc or parsed.path not in ('/api/state', '/api/report', '/api/export', '/api/backup', '/api/action'):
        raise ValueError('Unsupported Ledger API path.')
    if method not in ('GET', 'POST') or len(body.encode()) > server.MAX_BODY:
        raise ValueError('Unsupported request method or size.')
    handler = BrowserHandler.__new__(BrowserHandler)
    handler.server = SimpleNamespace(server_port=8780, books=BOOKS, book_locks={key: threading.RLock() for key in BOOKS})
    handler.path = path
    handler.headers = {'Host': 'localhost:8780', 'Origin': 'http://localhost:8780', 'Content-Type': 'application/json', 'Content-Length': str(len(body.encode()))}
    handler.rfile = io.BytesIO(body.encode())
    # Bank File Adapter: Keep the upstream CSV workflow and add the validated AICraft export format.
    if method == 'POST' and parsed.path == '/api/action':
        data = json.loads(body)
        payload = data.get('payload', {}) if isinstance(data, dict) else {}
        if isinstance(data, dict) and isinstance(payload, dict) and data.get('action') == 'import_bank_csv' and str(payload.get('contents', '')).lstrip().startswith('{'):
            if set(data) != {'action', 'payload'} or set(payload) != {'contents', 'bank_account'}:
                raise ValueError('Invalid bank import fields.')
            _, params, company = handler.parse_query()
            if params:
                raise ValueError('Unexpected bank import query.')
            book = open_book(company)
            try:
                result = import_bank_export(payload['contents'], payload['bank_account'], book)
                handler.send_json(200, dict(ok=True, result=result))
            finally:
                close_book(book)
            return json.dumps(handler.result)
    if method == 'GET':
        handler.do_GET()
    else:
        handler.do_POST()
    return json.dumps(handler.result)
