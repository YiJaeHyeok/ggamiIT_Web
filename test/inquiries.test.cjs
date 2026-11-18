const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const handler = require('../api/inquiries');
const { validate } = handler;

const valid = () => ({ name: '  테스트  ', email: 'Study@EXAMPLE.COM', subject: '연동 문의', message: '이 문의는 기능 검증을 위한 예시입니다.', consent: true, request_id: randomUUID() });
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
}
function request(body = valid(), extra = {}) {
  return { method: 'POST', headers: { origin: 'https://nova-it-study.vercel.app', 'content-type': 'application/json' }, body, socket: { remoteAddress: randomUUID() }, ...extra };
}

test('normalizes email and only permits whitelisted columns', () => {
  const data = validate({ ...valid(), status: 'closed', created_at: '2000-01-01', id: randomUUID() });
  assert.equal(data.email, 'study@example.com');
  assert.equal(data.name, '테스트');
  assert.equal(data.status, undefined);
  assert.equal(data.created_at, undefined);
  assert.equal(data.id, undefined);
});

test('rejects malformed requests, absent consent and length boundaries', () => {
  for (const body of [null, [], { ...valid(), email: 'wrong' }, { ...valid(), consent: false }, { ...valid(), message: '짧음' }, { ...valid(), subject: 'x' }, { ...valid(), message: 'x'.repeat(5001) }, { ...valid(), request_id: 'invalid' }]) assert.equal(validate(body), null);
  assert.ok(validate({ ...valid(), message: 'x'.repeat(5000) }));
});

test('rejects reads, foreign origins, bots and excessive payloads before database access', async () => {
  for (const [req, status] of [
    [request(undefined, { method: 'GET' }), 405],
    [request(undefined, { headers: { origin: 'https://foreign.example', 'content-type': 'application/json' } }), 403],
    [request({ ...valid(), website: 'bot.example' }), 400],
    [request(undefined, { headers: { 'content-type': 'text/plain' } }), 415],
    [request({ ...valid(), message: 'x'.repeat(40_000) }), 413]
  ]) { const res = response(); await handler(req, res); assert.equal(res.statusCode, status); }
});

test('accepts ggami website origins while rejecting lookalike hosts', async () => {
  for (const origin of ['https://ggami.vercel.app', 'https://ggami-web-jae.vercel.app']) {
    const res = response();
    await handler(request({}, { headers: { origin, 'content-type': 'application/json' } }), res);
    assert.equal(res.statusCode, 400, origin + ' should reach validation');
  }
  for (const origin of ['https://ggami.vercel.app.evil.example', 'https://ggami-other.vercel.app']) {
    const res = response();
    await handler(request({}, { headers: { origin, 'content-type': 'application/json' } }), res);
    assert.equal(res.statusCode, 403);
  }
});

test('only reports success after database acceptance, retries idempotently, keeps errors private', async () => {
  const oldFetch = global.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_PUBLISHABLE_KEY, oldNotificationUrl = process.env.INQUIRY_NOTIFICATION_URL;
  process.env.SUPABASE_URL = 'https://exampleproject.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  // Storage-only tests must not inherit a deployed notification endpoint.
  delete process.env.INQUIRY_NOTIFICATION_URL;
  try {
    const body = valid();
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://exampleproject.supabase.co/rest/v1/inquiries');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Prefer, 'return=minimal');
      assert.equal(options.headers.apikey, 'sb_publishable_test');
      assert.equal(JSON.parse(options.body).email, 'study@example.com');
      return { ok: true, status: 201 };
    };
    const saved = response(); await handler(request(body), saved);
    assert.equal(saved.statusCode, 201); assert.equal(saved.body.receipt, body.request_id);
    assert.equal(JSON.stringify(saved.body).includes('study@example.com'), false);
    global.fetch = async () => ({ ok: false, status: 409, json: async () => ({ code: '23505', message: 'duplicate key violates unique constraint "inquiries_request_id_key"' }) });
    const duplicate = response(); await handler(request(body), duplicate); assert.equal(duplicate.statusCode, 201);
    global.fetch = async () => { throw new Error('sensitive database detail'); };
    const failure = response(); await handler(request(body), failure);
    assert.equal(failure.statusCode, 503); assert.equal(JSON.stringify(failure.body).includes('sensitive'), false);
    global.fetch = async () => ({ ok: true, status: 201 });
    const sameClient = request(valid());
    for (let i = 0; i < 10; i++) { const res = response(); await handler(sameClient, res); assert.equal(res.statusCode, 201); }
    const limited = response(); await handler(sameClient, limited); assert.equal(limited.statusCode, 429);
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
    if (oldNotificationUrl === undefined) delete process.env.INQUIRY_NOTIFICATION_URL; else process.env.INQUIRY_NOTIFICATION_URL = oldNotificationUrl;
  }
});
