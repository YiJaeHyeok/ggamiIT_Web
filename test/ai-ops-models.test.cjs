const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '../lab-catalog-ai.js');
const defs = fs.existsSync(file) ? require(file) : [];
function model(id) { const found = defs.find(d => d.id === `lab-${id}`); assert.ok(found, `${id} model exists`); return found; }
function defaults(d) { return Object.fromEntries(d.controls.map(c => [c.key, c.value])); }
function run(id, values = {}) { const d = model(id); return d.evaluate({ ...defaults(d), ...values }); }
function fact(result, label) { const found = result.facts.find(f => f.label === label); assert.ok(found, `${label} fact exists`); return found.value; }

test('catalog exposes sixteen finite, deterministic, resettable local teaching models', () => {
  assert.equal(defs.length, 16);
  assert.equal(new Set(defs.map(d => d.id)).size, 16);
  for (const d of defs) {
    assert.match(d.title, /[가-힣]/); assert.ok(d.intro && d.goal && d.note);
    assert.ok(d.controls.length >= 2);
    const initial = defaults(d), before = JSON.stringify(initial), first = d.evaluate(initial);
    assert.equal(JSON.stringify(initial), before, `${d.id} does not mutate input`);
    assert.deepEqual(d.evaluate(defaults(d)), first, `${d.id} resets without hidden state`);
    for (const c of d.controls) {
      for (const value of c.type === 'range' ? [c.min, c.max] : c.type === 'select' ? c.options.map(o => o.value) : c.type === 'checkbox' ? [false, true] : ['']) {
        const output = d.evaluate({ ...initial, [c.key]: value });
        assert.ok(output.headline && output.explanation && output.facts.length && output.visual.items.length);
        assert.doesNotMatch(JSON.stringify(output), /NaN|Infinity|undefined/);
        if (output.visual.kind === 'bars') for (const item of output.visual.items) assert.ok(Number.isFinite(item.value) && item.value >= 0 && item.value <= 100);
      }
    }
  }
});

test('tokens caps the illustrative segmentation at the selected budget', () => {
  assert.equal(fact(run('tokens', { sample: 'short', budget: 0 }), '사용한 조각'), '0 / 5');
  assert.equal(fact(run('tokens', { sample: 'short', budget: 24 }), '사용한 조각'), '5 / 5');
  assert.ok(run('tokens', { budget: 0 }).visual.items.every(i => i.state === 'blocked'));
});
test('temperature zero picks the top fictional candidate and heat spreads probability', () => {
  const cold = run('temperature', { temperature: 0 });
  assert.deepEqual(cold.visual.items.map(i => i.value), [100, 0, 0]);
  const warm = run('temperature', { temperature: 2 });
  assert.ok(warm.visual.items[0].value < 100 && warm.visual.items[2].value > 0);
  assert.ok(Math.abs(warm.visual.items.reduce((sum, i) => sum + i.value, 0) - 100) < 0.02);
});
test('context reserves question and answer space and exposes lost history', () => {
  assert.equal(fact(run('context', { window: 40, detail: 'short' }), '빠진 이전 대화'), '0개');
  assert.equal(fact(run('context', { window: 8, detail: 'long' }), '남은 대화 예산'), '0조각');
  assert.ok(run('context', { window: 8, detail: 'long' }).visual.items.some(i => i.state === 'blocked'));
});
test('embeddings uses synthetic vector geometry and guards a zero vector', () => {
  assert.equal(fact(run('embeddings', { query: 'fruit', metric: 'cosine' }), '가장 가까운 예시'), '사과');
  assert.equal(fact(run('embeddings', { query: 'pet', metric: 'distance' }), '가장 가까운 예시'), '강아지');
  assert.equal(fact(run('embeddings', { query: 'zero', metric: 'cosine' }), '가장 가까운 예시'), '계산 보류');
});
test('skills loads only a matching instruction body when chosen', () => {
  assert.equal(fact(run('skills', { task: 'review', loading: 'match' }), '읽은 본문'), '코드 검토');
  assert.equal(fact(run('skills', { task: 'writing', loading: 'names' }), '읽은 본문'), '없음');
  assert.equal(fact(run('skills', { loading: 'all' }), '읽은 본문'), '코드 검토, 글쓰기');
});
test('workflow holds delivery for failed tests or missing test-first observation', () => {
  assert.equal(fact(run('workflow', { order: 'test-first', testsPass: true }), '전달 가능'), '예');
  assert.equal(fact(run('workflow', { order: 'test-first', testsPass: false }), '전달 가능'), '아니요');
  assert.equal(fact(run('workflow', { order: 'code-first', testsPass: true }), '실패 테스트 관찰'), '건너뜀');
});
test('permissions blocks disabled write permission while allowing reads', () => {
  assert.equal(fact(run('permissions', { action: 'write', writeAllowed: false }), '모의 실행'), '차단');
  assert.equal(fact(run('permissions', { action: 'read', writeAllowed: false }), '모의 실행'), '허용');
  assert.equal(fact(run('permissions', { action: 'write', writeAllowed: true }), '모의 실행'), '허용');
});
test('hallucination abstains with missing evidence and flags unsupported confident output', () => {
  assert.equal(fact(run('hallucination', { evidence: 'none', abstain: true }), '답변 상태'), '확인 보류');
  assert.equal(fact(run('hallucination', { evidence: 'none', abstain: false }), '답변 상태'), '근거 없는 단정');
  assert.equal(fact(run('hallucination', { evidence: 'verified' }), '답변 상태'), '근거 범위 안에서 답변');
});
test('privacy redacts each synthetic sensitive field independently', () => {
  const masked = run('privacy', { redactEmail: true, redactToken: true });
  assert.doesNotMatch(masked.code, /learner@example\.test|DEMO_TOKEN_123/);
  assert.match(run('privacy', { redactEmail: false, redactToken: true }).code, /learner@example\.test/);
  assert.equal(fact(masked, '남은 예시 민감 항목'), '0개');
});
test('approval pauses external side effects until approval but lets a draft proceed', () => {
  assert.equal(fact(run('approval', { action: 'send', approved: false }), '모의 상태'), '승인 대기');
  assert.equal(fact(run('approval', { action: 'send', approved: true }), '모의 상태'), '진행 가능');
  assert.equal(fact(run('approval', { action: 'draft', approved: false }), '모의 상태'), '진행 가능');
});
test('evaluation computes literal fixture precision/recall and guards zero denominators', () => {
  const result = run('evaluation', { threshold: 50, dataset: 'mixed' });
  assert.equal(fact(result, '정밀도'), '50.0%'); assert.equal(fact(result, '재현율'), '50.0%');
  assert.equal(fact(run('evaluation', { threshold: 100, dataset: 'mixed' }), '정밀도'), '계산 불가 (예측 양성 0)');
  assert.equal(fact(run('evaluation', { threshold: 50, dataset: 'none' }), '재현율'), '계산 불가 (실제 양성 0)');
});
test('logs correlates a request across services and filters error level', () => {
  assert.equal(fact(run('logs', { request: 'req-A', level: 'all' }), '표시 로그'), '3개');
  const filtered = run('logs', { request: 'req-A', level: 'error' });
  assert.equal(fact(filtered, '표시 로그'), '1개'); assert.match(filtered.code, /database/); assert.doesNotMatch(filtered.code, /req-B/);
  assert.equal(fact(run('logs', { request: 'req-B', level: 'error' }), '표시 로그'), '0개');
});
test('metrics calculates request weighted errors and zero traffic without division by zero', () => {
  assert.equal(fact(run('metrics', { requests: 1000, errorRate: 2 }), '오류 요청'), '20건');
  assert.equal(fact(run('metrics', { requests: 1000, errorRate: 2 }), '오류 예산 소진 배율'), '2.0배');
  assert.equal(fact(run('metrics', { requests: 0, errorRate: 20 }), '관측 오류율'), '계산 불가 (요청 0)');
});
test('incident mitigation addresses only its matching bottleneck', () => {
  assert.equal(fact(run('incident', { bottleneck: 'database', mitigation: 'cache' }), '처리 용량'), '80요청/초');
  assert.equal(fact(run('incident', { bottleneck: 'database', mitigation: 'scale' }), '처리 용량'), '30요청/초');
  assert.equal(fact(run('incident', { bottleneck: 'web', mitigation: 'scale' }), '처리 용량'), '90요청/초');
});
test('secrets separates a browser bundle from server-side sample references', () => {
  assert.equal(fact(run('secrets', { location: 'client', maskLog: true }), '브라우저 노출'), '노출됨');
  assert.equal(fact(run('secrets', { location: 'server', maskLog: true }), '브라우저 노출'), '이 예시에는 없음');
  assert.equal(fact(run('secrets', { location: 'server', maskLog: false }), '로그 노출'), '예시 값 노출');
});
test('backup exposes RPO risk and does not treat an untested restore as verified', () => {
  assert.equal(fact(run('backup', { age: 24, restored: false }), 'RPO 목표 4시간'), '초과');
  assert.equal(fact(run('backup', { age: 0, restored: true }), '복구 확인'), '예시 복원 검증 통과');
  assert.equal(fact(run('backup', { age: 0, restored: false }), '복구 확인'), '미검증');
});
test('plain browser script appends definitions without a module or DOM', () => {
  assert.ok(fs.existsSync(file), 'browser catalog exists');
  const sandbox = { NOVA_NEW_LABS: [{ id: 'existing' }] };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  assert.equal(sandbox.NOVA_NEW_LABS.length, 17);
  assert.equal(sandbox.NOVA_NEW_LABS[0].id, 'existing');
});
