const { createHash, createHmac } = require('node:crypto');

const MAX_BYTES = 32_768;
const WINDOW_MS = 10 * 60_000;
const buckets = new Map();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) throw { status: 413 };
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BYTES) throw { status: 413 };
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BYTES) throw { status: 413 };
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const request_id = body.request_id;
  if (name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (subject.length < 2 || subject.length > 120 || message.length < 10 || message.length > 5000) return null;
  if (body.consent !== true || typeof request_id !== 'string' || !uuid.test(request_id)) return null;
  if ([name, email, subject, message].some(value => value.includes('\0'))) return null;
  return { name, email, subject, message, consent: true, request_id };
}

// 서버 인스턴스 단위의 기본 제한입니다. 영구적인 전역 제한을 대체하지 않습니다.
function allowRequest(req) {
  const raw = req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ip = Array.isArray(raw) ? raw[0] : raw;
  const key = createHash('sha256').update(ip).digest('hex');
  const now = Date.now();
  if (buckets.size > 5000) for (const [id, entry] of buckets) if (entry.expires <= now) buckets.delete(id);
  let entry = buckets.get(key);
  if (!entry || entry.expires <= now) { entry = { count: 0, expires: now + WINDOW_MS }; buckets.set(key, entry); }
  entry.count++;
  return entry.count <= 10;
}

// Optional email bridge. A failed notification must never undo a saved inquiry.
async function notifyInquiry(data, { env = process.env, fetcher = global.fetch } = {}) {
  const endpoint = env.INQUIRY_NOTIFICATION_URL;
  const secret = env.NOVA_NOTIFICATION_SECRET || env.INQUIRY_NOTIFICATION_SECRET;
  if (!endpoint || !secret) return { status: 'disabled' };
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) || secret.length < 32) {
    console.warn('Inquiry email: invalid configuration');
    return { status: 'invalid-config' };
  }
  const payload = JSON.stringify({
    request_id: data.request_id, name: data.name, email: data.email,
    subject: data.subject, message: data.message
  });
  const timestamp = Date.now();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  try {
    const response = await fetcher(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp, payload, signature }),
      signal: AbortSignal.timeout(8_000)
    });
    const result = response.ok ? await response.json().catch(() => null) : null;
    if (result?.ok === true) return { status: result.duplicate ? 'duplicate' : 'sent' };
  } catch { /* No inquiry data, endpoint or credentials in logs. */ }
  console.warn('Inquiry email: delivery not confirmed; inquiry remains saved');
  return { status: 'failed' };
}

async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, { error: '문의는 보내기 버튼으로 접수해주세요.' }); }
  const allowed = new Set(['https://ggami.vercel.app', 'https://ggami-web-jae.vercel.app', 'https://nova-it-study.vercel.app', 'https://nova-it-study-web-jae.vercel.app']);
  for (const key of ['VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) if (process.env[key]) allowed.add('https://' + process.env[key]);
  if (process.env.NODE_ENV !== 'production') allowed.add('http://localhost:4178');
  if (req.headers.origin && !allowed.has(req.headers.origin)) return reply(res, 403, { error: '이 사이트의 문의 폼에서 보내주세요.' });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(res, 415, { error: '요청 형식을 확인해주세요.' });
  let body;
  try { body = await readBody(req); }
  catch (error) { return reply(res, error.status === 413 ? 413 : 400, { error: error.status === 413 ? '문의 내용이 너무 깁니다.' : '입력 내용을 확인해주세요.' }); }
  if (body && typeof body.website === 'string' && body.website.trim()) return reply(res, 400, { error: '문의 내용을 확인한 뒤 다시 보내주세요.' });
  const data = validate(body);
  if (!data) return reply(res, 400, { error: '이메일, 제목(2~120자), 내용(10~5,000자), 저장 동의를 확인해주세요.' });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) return reply(res, 503, { error: '문의 접수를 준비 중입니다. 잠시 후 다시 시도해주세요.' });
  if (!allowRequest(req)) { res.setHeader('Retry-After', '600'); return reply(res, 429, { error: '문의가 너무 자주 전송됐습니다. 10분 뒤 다시 시도해주세요.' }); }
  try {
    const response = await fetch(url.replace(/\/$/, '') + '/rest/v1/inquiries', {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) {
      // 응답을 받지 못한 같은 문의를 재시도해도 중복 저장하지 않습니다.
      if (response.status === 409) {
        const failure = await response.json().catch(() => ({}));
        if (failure.code === '23505' && typeof failure.message === 'string' && failure.message.includes('inquiries_request_id_key')) {
          // This key does not grant SELECT access. The retried body may differ
          // from the stored row, so never email it as a new saved inquiry.
          return reply(res, 201, { ok: true, receipt: data.request_id });
        }
      }
      console.warn('Inquiry storage returned status', response.status);
      return reply(res, 503, { error: '문의 저장을 완료하지 못했습니다. 입력 내용은 유지되니 잠시 후 다시 보내주세요.' });
    }
    await notifyInquiry(data);
    return reply(res, 201, { ok: true, receipt: data.request_id });
  } catch {
    return reply(res, 503, { error: '연결이 지연되고 있습니다. 입력 내용은 유지되니 잠시 후 다시 보내주세요.' });
  }
}

module.exports = handler;
module.exports.validate = validate;
module.exports.notifyInquiry = notifyInquiry;
