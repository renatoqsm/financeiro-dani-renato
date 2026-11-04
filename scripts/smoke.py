"""Functional checks against the local Wrangler server; creates only local test data."""
import json
import secrets
import urllib.request
import urllib.error
from pathlib import Path

base = 'http://127.0.0.1:8787'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def request(path, method='GET', data=None, cookie=None, origin=True):
    headers = {'Content-Type': 'application/json'}
    if origin:
        headers['Origin'] = base
    if cookie:
        headers['Cookie'] = cookie
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    try:
        response = opener.open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read()
    return response.status, body, response.headers

checks = 0
for path in Path('public').rglob('*'):
    if path.is_file():
        url = '/' if path.name == 'index.html' else '/' + str(path.relative_to('public'))
        status, body, _ = request(url)
        assert status == 200 and body == path.read_bytes(), url
        checks += 1
assert request('/api/health')[:2] == (200, b'{"ok":true}')
assert request('/api/data')[0] == 401
assert request('/api/signup', 'POST', {}, origin=False)[0] == 403
credentials = {'username': 'smoke_' + secrets.token_hex(5), 'password': secrets.token_hex(16)}
status, body, headers = request('/api/signup', 'POST', credentials)
assert status == 200, (status, body)
cookie = headers['Set-Cookie'].split(';')[0]
status, body, _ = request('/api/data', cookie=cookie)
assert status == 200, body
payload = json.loads(body)
status, body, _ = request('/api/data', 'PUT', {'data': payload['data'], 'revision': payload['revision']}, cookie)
assert status == 200, body
assert request('/api/data', 'PUT', {'data': payload['data'], 'revision': payload['revision']}, cookie)[0] == 409
assert request('/api/logout', 'POST', {}, cookie)[0] == 200
assert request('/api/data', cookie=cookie)[0] == 401
status, body, headers = request('/api/login', 'POST', credentials)
assert status == 200, body
cookie = headers['Set-Cookie'].split(';')[0]
assert request('/api/data', cookie=cookie)[0] == 200
assert request('/api/logout', 'POST', {}, cookie)[0] == 200
print(f'PASS: {checks} static files match; health, authentication, CSRF, save, revision conflict, logout and login passed using local D1.')
