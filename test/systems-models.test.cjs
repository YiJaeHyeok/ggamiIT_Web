const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '..', 'lab-catalog-systems.js');
const defs = fs.existsSync(file) ? require(file) : [];
const get = id => { const model = defs.find(item => item.id === `lab-${id}`); assert.ok(model, `${id} model exists`); return model; };
const run = (id, values = {}) => { const model = get(id); return model.evaluate({ ...Object.fromEntries(model.controls.map(c => [c.key, c.value])), ...values }); };
const fact = (result, label) => { const entry = result.facts.find(f => f.label === label); assert.ok(entry, `fact ${label} exists`); return entry.value; };

test('routing switches to backup and reports a disconnected network', () => {
  assert.equal(fact(run('routing'), '선택 경로'), '기본 경로');
  assert.equal(fact(run('routing', { primary: false }), '예상 지연'), '50 ms');
  assert.equal(fact(run('routing', { primary: false, backup: false }), '선택 경로'), '도달 불가');
});
test('subnet compares masked network addresses across prefix boundaries', () => {
  assert.equal(fact(run('subnet', { prefix: 24, target: '192.168.2.20' }), '전송 방법'), '게이트웨이로 전송');
  assert.equal(fact(run('subnet', { prefix: 16, target: '192.168.2.20' }), '전송 방법'), '같은 서브넷에서 전송');
  assert.equal(fact(run('subnet', { prefix: 25, target: '192.168.1.200' }), '전송 방법'), '게이트웨이로 전송');
});
test('XSS treats payload as inert data and distinguishes HTML interpretation from text', () => {
  const payload = '<img src=x onerror="throw 1">';
  const text = run('xss', { mode: 'text', payload });
  const html = run('xss', { mode: 'html', payload });
  assert.equal(fact(text, '표시 방식'), '문자 그대로');
  assert.equal(fact(html, '표시 방식'), 'HTML 해석 위험');
  assert.ok(text.code.includes(payload));
  assert.equal(fact(run('xss', { mode: 'html', payload: '안녕하세요' }), '표시 방식'), '일반 텍스트');
});
test('phishing checks complete hostnames rather than a trusted-looking substring', () => {
  assert.equal(fact(run('phishing', { host: 'nova.example' }), '도메인 일치'), '일치');
  for (const host of ['nova.example.evil.example', 'n0va.example', 'nova.example@evil.example', '']) {
    assert.equal(fact(run('phishing', { host }), '도메인 일치'), '불일치');
  }
  assert.equal(fact(run('phishing', { expected: 'accounts.nova.example', host: 'nova.example' }), '도메인 일치'), '불일치');
});
test('round robin gives a short job earlier first CPU access than FIFO', () => {
  assert.equal(fact(run('scheduler', { algorithm: 'fifo' }), 'C 첫 실행'), '8 틱');
  assert.equal(fact(run('scheduler', { algorithm: 'rr', quantum: 1 }), 'C 첫 실행'), '2 틱');
  assert.equal(fact(run('scheduler', { algorithm: 'rr', quantum: 4 }), 'C 첫 실행'), '6 틱');
  assert.equal(fact(run('scheduler'), '전체 작업량'), '9 틱');
});
test('atomic increments prevent lost updates in the interleaved schedule', () => {
  assert.equal(fact(run('race', { atomic: false, rounds: 3 }), '최종 카운터'), '3');
  assert.equal(fact(run('race', { atomic: true, rounds: 3 }), '최종 카운터'), '6');
  assert.equal(fact(run('race', { atomic: false, rounds: 1 }), '손실된 증가'), '1');
});
test('storage lifetime distinguishes a reload from an independent new tab', () => {
  assert.equal(fact(run('storage', { store: 'memory', event: 'reload' }), '남은 값'), '없음');
  assert.equal(fact(run('storage', { store: 'session', event: 'reload' }), '남은 값'), '학습 메모');
  assert.equal(fact(run('storage', { store: 'session', event: 'newtab' }), '남은 값'), '없음');
  assert.equal(fact(run('storage', { store: 'local', event: 'newtab' }), '남은 값'), '학습 메모');
});
test('CORS wildcard cannot authorize a credentialed response', () => {
  assert.equal(fact(run('cors', { origin: '*', credentials: false }), '응답 읽기'), '허용');
  assert.equal(fact(run('cors', { origin: '*', credentials: true }), '응답 읽기'), '차단');
  assert.equal(fact(run('cors', { origin: 'https://learn.nova.example', credentials: true }), '응답 읽기'), '허용');
  assert.equal(fact(run('cors', { origin: 'https://other.example', credentials: false }), '응답 읽기'), '차단');
});
test('transaction rolls back a debit if the credit step fails', () => {
  assert.equal(fact(run('transaction', { atomic: true, fail: true }), '잔액 합계'), '150 코인');
  assert.equal(fact(run('transaction', { atomic: false, fail: true }), '잔액 합계'), '120 코인');
  assert.equal(fact(run('transaction', { atomic: false, fail: false }), '받는 계좌'), '80 코인');
});
test('index bounds illustrative lookup work without pretending it is elapsed time', () => {
  assert.equal(fact(run('index', { rows: 1, indexed: true }), '비교 횟수 상한'), '1 회');
  assert.equal(fact(run('index', { rows: 1024, indexed: true }), '비교 횟수 상한'), '11 회');
  assert.equal(fact(run('index', { rows: 1024, indexed: false }), '비교 횟수 상한'), '1024 회');
});
test('CDN warm cache avoids the origin leg and distance changes delivery cost', () => {
  assert.equal(fact(run('cdn', { warm: false, region: 'near' }), '원본 요청'), '1 회');
  assert.equal(fact(run('cdn', { warm: true, region: 'near' }), '원본 요청'), '0 회');
  assert.equal(fact(run('cdn', { warm: true, region: 'near' }), '예상 지연'), '20 ms');
  assert.equal(fact(run('cdn', { warm: true, region: 'far' }), '예상 지연'), '90 ms');
});
test('autoscaling handles zero demand and exposes capacity exhaustion', () => {
  assert.equal(fact(run('autoscale', { demand: 0, max: 2 }), '필요 인스턴스'), '0 대');
  assert.equal(fact(run('autoscale', { demand: 201, max: 2 }), '처리하지 못한 요청'), '1 요청/초');
  assert.equal(fact(run('autoscale', { demand: 201, max: 3 }), '실행 인스턴스'), '3 대');
  assert.equal(fact(run('autoscale', { demand: 100, max: 2 }), '실행 인스턴스'), '1 대');
});
test('container image fixes runtime mismatch but does not invent configuration', () => {
  assert.equal(fact(run('container', { environment: 'mismatch', config: true }), '실행 결과'), '런타임 불일치');
  assert.equal(fact(run('container', { environment: 'image', config: true }), '실행 결과'), '실행 가능');
  assert.equal(fact(run('container', { environment: 'image', config: false }), '실행 결과'), '설정 누락');
});
test('all systems controls produce finite pure data at boundaries and reject API side effects', () => {
  assert.equal(defs.length, 13);
  for (const model of defs) {
    assert.equal(new Set(model.controls.map(c => c.key)).size, model.controls.length);
    const defaults = Object.fromEntries(model.controls.map(c => [c.key, c.value]));
    for (const control of model.controls) {
      const variants = control.type === 'range' ? [control.min, control.max, NaN, Infinity, -9999] : control.type === 'select' ? control.options.map(o => o.value) : control.type === 'checkbox' ? [false, true] : ['', '<script>globalThis.pwned=1</script>'];
      for (const value of variants) {
        const values = Object.freeze({ ...defaults, [control.key]: value });
        const result = model.evaluate(values);
        assert.equal(typeof result.headline, 'string');
        assert.equal(typeof result.explanation, 'string');
        assert.ok(result.facts.length >= 2);
        assert.ok(['flow', 'bars', 'tokens', 'list'].includes(result.visual.kind));
        for (const item of result.visual.items) if (item.value !== undefined) assert.ok(Number.isFinite(item.value) && item.value >= 0 && item.value <= 100);
        assert.deepEqual(result, model.evaluate(values));
      }
    }
  }
  const sandbox = { NOVA_NEW_LABS: [{ id: 'existing' }] };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  assert.equal(sandbox.NOVA_NEW_LABS.length, 14);
  assert.equal(sandbox.NOVA_NEW_LABS[0].id, 'existing');
  for (const model of sandbox.NOVA_NEW_LABS.slice(1)) model.evaluate(Object.fromEntries(model.controls.map(c => [c.key, c.value])));
  assert.equal(sandbox.pwned, undefined);
});
