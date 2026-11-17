(() => {
  'use strict';
  // Pure, deliberately small teaching models. No API, DOM, storage or file access.
  const select = (key, label, value, pairs) => ({ key, label, type: 'select', value, options: pairs.map(([value, label]) => ({ value, label })) });
  const range = (key, label, value, min, max, step = 1) => ({ key, label, type: 'range', value, min, max, step });
  const check = (key, label, value) => ({ key, label, type: 'checkbox', value });
  const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const fact = (label, value) => ({ label, value: String(value) });
  const item = (label, state = 'active', value) => value === undefined ? { label, state } : { label, state, value };
  const output = (headline, explanation, facts, kind, items, code) => ({ headline, explanation, facts, visual: { kind, items }, ...(code === undefined ? {} : { code }) });

  const defs = [
    {
      id: 'lab-tokens', session: 'ai-basics', title: '토큰: 문장을 조각으로 읽기',
      intro: 'AI는 문장을 작은 조각인 토큰으로 다룹니다. 이 실습에서는 미리 나눈 교육용 조각으로 입력 예산을 확인합니다.',
      goal: '조각 예산을 줄여 어떤 입력이 빠지는지 확인하세요.',
      controls: [select('sample', '예시 문장', 'short', [['short', '짧은 문장: AI는 도구입니다.'], ['long', '긴 문장: AI에게 근거와 예시를 요청하기']]), range('budget', '입력 조각 예산', 8, 0, 24)],
      evaluate(v) {
        const chunks = v.sample === 'long' ? ['AI', '에게', ' ', '답변', '의', ' ', '근거', '와', ' ', '예시', '를', ' ', '요청', '해요', '.'] : ['AI', '는', ' ', '도구입니다', '.'];
        const used = Math.min(chunks.length, Math.floor(number(v.budget, 0, 24, 8)));
        return output(used === chunks.length ? '예시 문장이 모두 들어왔어요' : `${chunks.length - used}개 조각이 예산 밖에 있어요`, '표시된 순서대로 조각을 담았습니다. 같은 문장도 실제 모델의 토크나이저에 따라 다르게 나뉩니다.', [fact('사용한 조각', `${used} / ${chunks.length}`), fact('남은 조각', chunks.length - used)], 'tokens', chunks.map((s, i) => item(s === ' ' ? '공백' : s, i < used ? 'active' : 'blocked')));
      },
      note: '고정된 교육용 분할이며 정확한 토큰 수 계산기가 아닙니다. 실제 서비스의 토큰 한도나 요금을 계산하지 않습니다.'
    },
    {
      id: 'lab-temperature', session: 'ai-basics', title: '온도: 다음 답변의 확률 바꾸기',
      intro: '온도는 다음 조각을 고를 때 확률 분포가 얼마나 퍼질지 조절합니다. 가상 후보 세 개로 낮은 온도와 높은 온도를 비교해 보세요.',
      goal: '온도를 올렸을 때 작은 확률의 후보가 어떻게 변하는지 관찰하세요.',
      controls: [range('temperature', '온도', 0.7, 0, 2, 0.1), select('task', '가상 답변 상황', 'reply', [['reply', '인사말 고르기'], ['route', '가상 경로 고르기']])],
      evaluate(v) {
        const t = number(v.temperature, 0, 2, 0.7);
        const scores = v.task === 'route' ? [3, 2.5, 1] : [3, 2, 0.5];
        const labels = v.task === 'route' ? ['경로 A', '경로 B', '경로 C'] : ['안녕하세요', '반가워요', '좋은 하루예요'];
        const weights = t === 0 ? [1, 0, 0] : scores.map(s => Math.exp((s - scores[0]) / t));
        const total = weights.reduce((a, b) => a + b, 0);
        const probabilities = weights.map(w => Math.round(w / total * 10000) / 100);
        return output(t === 0 ? '가장 높은 점수의 후보만 선택해요' : '후보마다 선택될 확률이 생겨요', '막대는 가상 점수에 온도를 적용한 확률입니다. 실제 답변을 생성하거나 무작위로 뽑지 않고 분포만 보여 줍니다.', [fact('온도', t.toFixed(1)), fact('가장 높은 후보 확률', `${probabilities[0]}%`)], 'bars', labels.map((label, i) => item(label, probabilities[i] ? 'active' : 'muted', probabilities[i])));
      },
      note: '교육용 softmax 분포입니다. 높은 온도가 정확성이나 창의성을 보장하지 않으며 실제 모델 설정은 서로 다릅니다.'
    },
    {
      id: 'lab-context', session: 'ai-basics', title: '컨텍스트 창: 기억할 대화의 한도',
      intro: '컨텍스트 창은 한 번에 참고할 입력과 출력의 공간입니다. 질문과 답변 자리를 먼저 남기면 이전 대화가 들어갈 자리가 줄어듭니다.',
      goal: '창 크기와 질문 길이를 바꿔 사라지는 이전 대화를 확인하세요.',
      controls: [range('window', '창 크기 (교육용 조각)', 24, 8, 40), select('detail', '질문 길이', 'short', [['short', '짧은 질문: 4조각'], ['long', '긴 질문: 12조각']])],
      evaluate(v) {
        const size = Math.floor(number(v.window, 8, 40, 24));
        const question = v.detail === 'long' ? 12 : 4;
        const reserve = 4 + question + 4; // System instruction + question + answer.
        let budget = Math.max(0, size - reserve);
        const history = [{ label: '가장 오래된 대화: 취향', cost: 4 }, { label: '이전 대화: 요구 조건', cost: 6 }, { label: '최근 대화: 작업 내용', cost: 8 }];
        const kept = new Set();
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].cost > budget) break;
          kept.add(i); budget -= history[i].cost;
        }
        const lost = history.length - kept.size;
        return output(size < reserve ? '질문과 답변 자리부터 부족해요' : lost ? '오래된 대화 일부를 제외했어요' : '모든 예시 대화가 들어왔어요', '이 모형은 최신 대화부터 통째로 보존합니다. 제외된 대화의 취향이나 요구 조건은 이번 답변에서 참고할 수 없다고 가정합니다.', [fact('빠진 이전 대화', `${lost}개`), fact('남은 대화 예산', `${Math.max(0, size - reserve)}조각`), fact('기본 예약', `지시 4 + 질문 ${question} + 답변 4 = ${reserve}`)], 'flow', [item('시스템 지시 4조각', size < reserve ? 'blocked' : 'active'), ...history.map((h, i) => item(`${h.label} (${h.cost})`, kept.has(i) ? 'success' : 'muted')), item('현재 질문과 답변 자리', size < reserve ? 'blocked' : 'active')]);
      },
      note: '실제 모델의 기억을 재현하지 않는 예산 모형입니다. 실제 제품은 요약·검색·오류 반환 등 다른 초과 처리 방식을 사용할 수 있습니다.'
    },
    {
      id: 'lab-embeddings', session: 'ai-basics', title: '임베딩: 숫자 좌표로 비슷함 비교하기',
      intro: '임베딩은 내용을 숫자 벡터로 표현하는 방법입니다. 여기서는 의미를 직접 정한 2차원 좌표 세 개를 비교합니다.',
      goal: '방향을 보는 코사인 유사도와 거리를 보는 유클리드 거리를 비교하세요.',
      controls: [select('query', '검색할 가상 좌표', 'fruit', [['fruit', '과일 쪽 [1, 0]'], ['pet', '동물 쪽 [0, 1]'], ['zero', '영벡터 [0, 0]']]), select('metric', '비교 방식', 'cosine', [['cosine', '코사인 유사도'], ['distance', '유클리드 거리']])],
      evaluate(v) {
        const q = v.query === 'zero' ? [0, 0] : v.query === 'pet' ? [0, 1] : [1, 0];
        const candidates = [{ label: '사과', vector: [1, 0] }, { label: '강아지', vector: [0, 1] }, { label: '혼합 예시', vector: [0.7, 0.7] }];
        const norm = Math.hypot(...q), cosine = v.metric !== 'distance';
        if (cosine && norm === 0) return output('영벡터의 방향은 정할 수 없어요', '길이가 0인 벡터로 나누지 않고 계산을 보류합니다. 코사인 유사도에는 방향이 있는 입력이 필요합니다.', [fact('가장 가까운 예시', '계산 보류'), fact('입력 좌표', '[0, 0]')], 'list', [item('분모가 0이므로 코사인 계산 중단', 'blocked')]);
        const values = candidates.map(c => cosine ? (q[0] * c.vector[0] + q[1] * c.vector[1]) / (norm * Math.hypot(...c.vector)) : Math.hypot(q[0] - c.vector[0], q[1] - c.vector[1]));
        const best = values.indexOf(cosine ? Math.max(...values) : Math.min(...values));
        return output(`${candidates[best].label} 좌표가 가장 가까워요`, cosine ? '방향이 같을수록 코사인 유사도가 1에 가깝습니다. 막대는 0~1 유사도를 0~100으로 표시합니다.' : '두 좌표 사이의 직선 거리가 짧을수록 가깝습니다. 거리는 아래 숫자로 비교하세요.', [fact('가장 가까운 예시', candidates[best].label), fact('입력 좌표', `[${q.join(', ')}]`)], cosine ? 'bars' : 'list', candidates.map((c, i) => item(`${c.label}: ${values[i].toFixed(3)}`, i === best ? 'success' : 'muted', cosine ? Math.min(100, Math.max(0, values[i] * 100)) : undefined)));
      },
      note: '좌표는 사람이 만든 합성 값이며 실제 임베딩 모델의 출력이 아닙니다. 단어의 실제 의미·검색 품질을 측정하지 않습니다.'
    },
    {
      id: 'lab-skills', session: 'ai-tools', title: '스킬: 필요한 작업 지침만 펼쳐 읽기',
      intro: '스킬은 반복 작업을 돕는 지침과 자료 묶음입니다. 이름과 설명을 먼저 살펴보고 현재 작업에 필요한 본문을 골라 읽을 수 있습니다.',
      goal: '작업과 읽기 방식을 바꿔 관련 지침과 읽기 비용을 비교하세요.',
      controls: [select('task', '할 작업', 'review', [['review', '코드 변경 검토'], ['writing', '안내문 작성']]), select('loading', '본문 읽기 방식', 'match', [['names', '이름과 설명만'], ['match', '일치하는 스킬만 펼치기'], ['all', '모든 본문 펼치기']])],
      evaluate(v) {
        const target = v.task === 'writing' ? 1 : 0;
        const names = ['코드 검토', '글쓰기'], cost = [80, 50];
        const loaded = v.loading === 'all' ? [0, 1] : v.loading === 'names' ? [] : [target];
        const ready = loaded.includes(target);
        return output(ready ? `${names[target]} 지침을 참고할 준비가 됐어요` : '설명만 읽어서 작업 절차는 아직 몰라요', '두 설명을 읽는 비용은 10단위입니다. 관련 본문을 펼치면 그 작업의 절차를 볼 수 있지만, 읽었다고 작업 성공이 보장되지는 않습니다.', [fact('읽은 본문', loaded.length ? loaded.map(i => names[i]).join(', ') : '없음'), fact('교육용 읽기 비용', `${10 + loaded.reduce((sum, i) => sum + cost[i], 0)}단위`)], 'flow', [item('두 스킬의 이름·설명 확인', 'success'), ...names.map((name, i) => item(`${name} 본문 (${cost[i]}단위)`, loaded.includes(i) ? i === target ? 'active' : 'muted' : 'blocked')), item('현재 작업에 필요한 절차', ready ? 'success' : 'blocked')]);
      },
      note: '스킬의 단계적 읽기를 설명하는 모형입니다. 실제 파일을 읽거나 에이전트를 실행하지 않으며 비용 숫자는 임의 단위입니다.'
    },
    {
      id: 'lab-workflow', session: 'ai-tools', title: '워크플로: 테스트와 구현의 순서',
      intro: '워크플로는 작업의 순서와 다음 단계로 가는 조건입니다. 실패 테스트 관찰, 구현, 재검증이라는 작은 흐름을 만들어 보세요.',
      goal: '검증 실패나 생략이 전달 단계에 미치는 영향을 확인하세요.',
      controls: [select('order', '시작 순서', 'test-first', [['test-first', '실패 테스트 관찰 → 구현'], ['code-first', '구현 → 테스트 작성']]), check('testsPass', '구현 후 테스트가 통과함', true)],
      evaluate(v) {
        const observed = v.order !== 'code-first', pass = v.testsPass === true, deliver = observed && pass;
        return output(deliver ? '검증 조건을 충족해 전달할 수 있어요' : '다음 단계 전에 확인할 조건이 남았어요', !observed ? '이 교육용 흐름에서는 구현 전에 테스트가 실패하는지 관찰해야 합니다. 나중에 통과한 테스트만으로는 빠진 동작을 잡는 테스트인지 확인할 수 없습니다.' : !pass ? '구현 후 테스트가 실패했으므로 원인을 확인하고 고친 뒤 다시 검증합니다.' : '실패를 먼저 확인하고 구현 후 통과를 확인했습니다. 실제 프로젝트에는 별도의 검토가 더 필요할 수 있습니다.', [fact('실패 테스트 관찰', observed ? '완료' : '건너뜀'), fact('전달 가능', deliver ? '예' : '아니요')], 'flow', [item('실패 테스트 관찰', observed ? 'success' : 'blocked'), item('구현', 'active'), item('재검증', pass ? 'success' : 'blocked'), item('전달', deliver ? 'success' : 'blocked')]);
      },
      note: '테스트 우선 학습을 위한 상태 모형입니다. 실제 테스트나 코드는 실행되지 않으며 테스트 통과가 모든 결함의 부재를 뜻하지 않습니다.'
    },
    {
      id: 'lab-permissions', session: 'ai-tools', title: '권한 범위: 읽기와 쓰기 나누기',
      intro: '도구가 연결되어 있어도 모든 작업을 할 수 있는 것은 아닙니다. 읽기만 가능한 공간에서 쓰기를 요청하면 권한 검사가 멈춰야 합니다.',
      goal: '동작과 쓰기 권한을 조합해 허용·차단 경계를 확인하세요.',
      controls: [select('action', '요청할 동작', 'write', [['read', '예시 문서 읽기'], ['write', '예시 문서 수정']]), check('writeAllowed', '문서 쓰기 범위 허용', false)],
      evaluate(v) {
        const write = v.action === 'write', allow = !write || v.writeAllowed === true;
        return output(allow ? '요청이 예시 권한 범위 안에 있어요' : '쓰기 범위가 없어 차단했어요', '이 모형은 읽기 권한을 항상 부여하고 쓰기 권한을 별도로 검사합니다. 권한이 없으면 대상을 바꾸거나 우회하지 않고 필요한 범위를 확인합니다.', [fact('요청 범위', write ? 'document:write' : 'document:read'), fact('모의 실행', allow ? '허용' : '차단')], 'flow', [item(write ? '문서 수정 요청' : '문서 읽기 요청'), item('범위 확인', allow ? 'success' : 'blocked'), item('예시 문서 단계', allow ? 'success' : 'blocked')], `scope = ${write ? 'document:write' : 'document:read'}\nresult = ${allow ? 'ALLOW' : 'DENY'}`);
      },
      note: '단순화한 접근 제어 예시입니다. 실제 파일·계정 권한을 바꾸지 않으며 보안 경계의 완전성을 보장하지 않습니다.'
    },
    {
      id: 'lab-hallucination', session: 'ai-safety', title: '환각: 근거 없는 단정 피하기',
      intro: 'AI의 문장이 자연스럽다고 사실인 것은 아닙니다. 가상 운영 시간 질문에 근거가 얼마나 있는지 보고 답변 범위를 정해 보세요.',
      goal: '근거가 없거나 일부만 있을 때 보류와 단정의 차이를 확인하세요.',
      controls: [select('evidence', '제공된 가상 자료', 'none', [['none', '자료 없음'], ['partial', '평일 시간만 있는 안내문'], ['verified', '평일·주말 시간이 있는 확인된 예시표']]), check('abstain', '근거가 부족하면 확인 보류', true)],
      evaluate(v) {
        const verified = v.evidence === 'verified', partial = v.evidence === 'partial', careful = v.abstain === true;
        const state = verified ? '근거 범위 안에서 답변' : careful ? '확인 보류' : '근거 없는 단정';
        const answer = verified ? '가상 안내표의 주말 운영 시간은 10~14시입니다.' : careful ? partial ? '평일 시간만 확인됩니다. 주말 시간은 추가 자료가 필요합니다.' : '제공된 자료가 없어 운영 시간을 확인할 수 없습니다.' : '주말은 9~18시입니다. ← 자료에 없는 내용을 단정한 나쁜 예시';
        return output(state, answer, [fact('답변 상태', state), fact('주말 근거', verified ? '예시표에 있음' : '없음')], 'flow', [item('주말 운영 시간 질문'), item(partial ? '평일 근거만 있음' : verified ? '주말 근거 있음' : '근거 없음', verified ? 'success' : 'muted'), item(state, verified ? 'success' : careful ? 'active' : 'blocked')]);
      },
      note: '운영 시간과 자료는 모두 가상입니다. 근거를 제공해도 실제 모델의 환각을 완전히 막지는 못하며 자료의 최신성과 신뢰성 확인이 필요합니다.'
    },
    {
      id: 'lab-privacy', session: 'ai-safety', title: '개인정보: 보내기 전 예시 값 가리기',
      intro: '프롬프트나 로그에 개인정보와 인증 값이 섞일 수 있습니다. 고정된 가짜 이메일과 토큰을 각각 가리고 남은 항목을 확인해 보세요.',
      goal: '두 가림 옵션을 따로 조절해 일부만 가렸을 때의 위험을 확인하세요.',
      controls: [check('redactEmail', '예시 이메일 가리기', true), check('redactToken', '예시 인증 토큰 가리기', true)],
      evaluate(v) {
        const email = v.redactEmail === true, token = v.redactToken === true, left = Number(!email) + Number(!token);
        return output(left ? `${left}개 예시 항목이 그대로 남았어요` : '지정한 두 예시 항목을 가렸어요', '전송 전 미리보기만 만듭니다. 이메일만 가려도 인증 토큰이 남을 수 있으므로 어떤 종류의 정보가 포함되는지 함께 살펴보세요.', [fact('남은 예시 민감 항목', `${left}개`), fact('외부 전송', '없음')], 'list', [item('이메일', email ? 'success' : 'blocked'), item('인증 토큰', token ? 'success' : 'blocked')], `문의자: ${email ? '[EMAIL]' : 'learner@example.test'}\n인증: ${token ? '[TOKEN]' : 'DEMO_TOKEN_123'}\n문의: 로그인 오류를 확인해 주세요.`);
      },
      note: '고정된 가짜 값만 바꾸는 로컬 모형이며 개인정보 탐지 도구가 아닙니다. 실제 개인정보나 비밀을 입력하지 마세요. 가림이 완전한 익명화나 보안을 보장하지 않습니다.'
    },
    {
      id: 'lab-approval', session: 'ai-safety', title: '승인: 외부 영향 직전에 멈추기',
      intro: '초안을 쓰는 일과 다른 사람에게 보내는 일은 영향이 다릅니다. 외부 전송 전에 명시적 승인을 확인하는 단계를 살펴보세요.',
      goal: '승인이 필요한 지점과 승인 대기 상태를 구분하세요.',
      controls: [select('action', '가상 작업', 'send', [['draft', '메시지 초안 만들기'], ['send', '외부로 메시지 보내기']]), check('approved', '이 전송 작업을 명시적으로 승인함', false)],
      evaluate(v) {
        const external = v.action === 'send', allowed = !external || v.approved === true;
        return output(allowed ? '가상 흐름의 다음 단계로 갈 수 있어요' : '외부 전송 직전, 승인을 기다려요', external ? '승인은 이 예시 메시지 전송에만 적용된다고 가정합니다. 대상과 내용을 검토한 뒤 승인해야 하며 화면에서는 실제 메시지를 보내지 않습니다.' : '초안은 검토할 결과물을 준비하는 단계입니다. 이후 외부 전송을 선택하면 별도의 승인 조건을 확인합니다.', [fact('모의 상태', allowed ? '진행 가능' : '승인 대기'), fact('외부 영향', external ? '전송 단계 (모형)' : '없음')], 'flow', [item('내용 준비', 'success'), item('검토 가능한 초안', 'success'), item(external ? '전송 승인 확인' : '초안 완료', allowed ? 'success' : 'blocked'), item(external ? '가상 전송 단계' : '사용자 검토', allowed ? 'active' : 'muted')]);
      },
      note: '승인 경계를 보여 주는 모형입니다. 체크박스는 실제 서비스에 권한을 부여하지 않으며 이메일·메시지·네트워크 요청이 발생하지 않습니다.'
    },
    {
      id: 'lab-evaluation', session: 'ai-safety', title: '평가: 정밀도와 재현율 계산하기',
      intro: '분류기의 점수가 기준 이상이면 양성으로 판단해 봅니다. 가상 사례의 정답과 비교하면 정밀도와 재현율이 서로 다르게 움직입니다.',
      goal: '임계값을 바꿔 놓친 양성과 잘못 고른 양성을 비교하세요.',
      controls: [range('threshold', '양성 판정 임계값', 50, 0, 100), select('dataset', '가상 정답 묶음', 'mixed', [['mixed', '양성 2개·음성 2개'], ['none', '양성이 없는 묶음']])],
      evaluate(v) {
        const threshold = number(v.threshold, 0, 100, 50), noPositive = v.dataset === 'none';
        const cases = [{ score: 90, positive: !noPositive }, { score: 70, positive: false }, { score: 40, positive: !noPositive }, { score: 10, positive: false }];
        let tp = 0, fp = 0, fn = 0, tn = 0;
        cases.forEach(c => { const prediction = c.score >= threshold; if (prediction && c.positive) tp++; else if (prediction) fp++; else if (c.positive) fn++; else tn++; });
        const precision = tp + fp ? `${(tp / (tp + fp) * 100).toFixed(1)}%` : '계산 불가 (예측 양성 0)';
        const recall = tp + fn ? `${(tp / (tp + fn) * 100).toFixed(1)}%` : '계산 불가 (실제 양성 0)';
        return output(`정답 양성 ${tp}개를 찾고 ${fn}개를 놓쳤어요`, '정밀도는 양성으로 고른 것 중 맞은 비율이고, 재현율은 실제 양성 중 찾은 비율입니다. 분모가 0이면 100%로 취급하지 않고 계산 불가로 표시합니다.', [fact('정밀도', precision), fact('재현율', recall), fact('혼동 행렬', `TP ${tp} · FP ${fp} · FN ${fn} · TN ${tn}`)], 'list', cases.map((c, i) => item(`사례 ${i + 1}: 점수 ${c.score} · 정답 ${c.positive ? '양성' : '음성'} · 예측 ${c.score >= threshold ? '양성' : '음성'}`, (c.score >= threshold) === c.positive ? 'success' : 'blocked')));
      },
      note: '네 개 합성 사례의 이진 분류 계산입니다. 실제 AI 품질을 대표하지 않으며 작은 표본의 점수로 서비스 안전성을 판단할 수 없습니다.'
    },
    {
      id: 'lab-logs', session: 'operations', title: '로그: 요청 ID로 오류 경로 찾기',
      intro: '여러 서비스가 처리한 한 요청을 같은 ID로 묶으면 흐름을 따라가기 쉽습니다. 요청 ID와 심각도 필터로 가상 로그를 좁혀 보세요.',
      goal: '오류만 볼 때 앞뒤 맥락이 빠지는 차이를 확인하세요.',
      controls: [select('request', '상관관계 요청 ID', 'req-A', [['req-A', 'req-A: DB 오류 요청'], ['req-B', 'req-B: 정상 요청']]), select('level', '표시 수준', 'all', [['all', '전체 수준'], ['error', '오류만']])],
      evaluate(v) {
        const id = v.request === 'req-B' ? 'req-B' : 'req-A';
        const entries = [{ id: 'req-A', service: 'gateway', level: 'INFO', message: '요청 수신' }, { id: 'req-B', service: 'gateway', level: 'INFO', message: '요청 수신' }, { id: 'req-A', service: 'api', level: 'INFO', message: 'DB 조회 시작' }, { id: 'req-A', service: 'database', level: 'ERROR', message: '조회 시간 초과' }, { id: 'req-B', service: 'api', level: 'INFO', message: '응답 200 완료' }];
        const selected = entries.filter(e => e.id === id && (v.level !== 'error' || e.level === 'ERROR'));
        return output(selected.length ? `${id}의 로그 ${selected.length}개를 찾았어요` : '필터와 일치하는 로그가 없어요', v.level === 'error' ? '오류만 보면 빠르게 좁힐 수 있지만 시작·중간 단계가 가려집니다. 오류가 없다는 사실만으로 정상 동작을 증명할 수는 없습니다.' : '같은 ID의 이벤트를 모아 서비스 사이의 경로를 봅니다. 이 표에서는 고정된 순서로 로그가 기록되었다고 가정합니다.', [fact('표시 로그', `${selected.length}개`), fact('요청 ID', id)], 'list', selected.length ? selected.map(e => item(`${e.service} · ${e.message}`, e.level === 'ERROR' ? 'blocked' : 'success')) : [item('일치하는 로그 없음', 'muted')], selected.map(e => `[${e.level}] ${e.id} ${e.service}: ${e.message}`).join('\n') || '(일치하는 로그 없음)');
      },
      note: '합성 로그를 필터링하는 모형입니다. 실제 시스템이나 서버의 로그에 접근하지 않으며 타임스탬프·분산 추적의 세부 사항은 생략했습니다.'
    },
    {
      id: 'lab-metrics', session: 'operations', title: '메트릭: 지연 시간과 오류 예산',
      intro: '메트릭은 많은 요청을 숫자로 요약합니다. 합성 요청 수와 오류율을 바꾸며 예상 오류 수와 99% 성공 목표의 예산을 계산해 보세요.',
      goal: '트래픽이 없을 때와 오류 예산을 넘을 때를 구분하세요.',
      controls: [range('requests', '관측 요청 수', 500, 0, 1000, 50), range('errorRate', '합성 오류율 (%)', 2, 0, 20, 0.5)],
      evaluate(v) {
        const requests = Math.round(number(v.requests, 0, 1000, 500)), rate = number(v.errorRate, 0, 20, 2);
        const errors = requests * rate / 100, budget = requests * 0.01;
        const latency = requests ? 80 + Math.max(0, requests - 500) * 0.4 : 0;
        return output(!requests ? '요청이 없어 오류율을 관측할 수 없어요' : rate > 1 ? '이 구간의 1% 오류 예산을 넘었어요' : '이 구간의 오류 예산 안에 있어요', '목표 성공률 99%라면 같은 관측 구간의 요청 1%를 오류 예산으로 둡니다. 소진 배율은 오류 수 ÷ 오류 예산입니다. 지연 시간은 트래픽만으로 만든 예시 함수입니다.', [fact('오류 요청', `${Number(errors.toFixed(2))}건`), fact('관측 오류율', requests ? `${rate.toFixed(1)}%` : '계산 불가 (요청 0)'), fact('오류 예산 소진 배율', requests ? `${(errors / budget).toFixed(1)}배` : '계산 불가 (요청 0)'), fact('합성 지연 시간', requests ? `${latency.toFixed(0)}ms` : '관측 없음')], 'bars', [item('오류율 (%)', rate > 1 ? 'blocked' : 'success', requests ? rate : 0), item('성공률 (%)', 'active', requests ? 100 - rate : 0)]);
      },
      note: '합성 기대값이므로 오류 수가 소수일 수 있습니다. 실제 백분위 지연 시간이나 월간 SLA를 계산하지 않으며 운영 보장을 제공하지 않습니다.'
    },
    {
      id: 'lab-incident', session: 'operations', title: '장애 대응: 병목에 맞는 완화 선택',
      intro: '느려진 원인이 웹 서버인지 데이터베이스인지에 따라 도움이 되는 대응이 달라집니다. 가상 시스템에 초당 100개 요청이 들어오는 상황입니다.',
      goal: '병목과 완화 조합에 따라 처리 용량이 어떻게 달라지는지 확인하세요.',
      controls: [select('bottleneck', '현재 병목', 'database', [['database', '데이터베이스 조회'], ['web', '웹 서버 처리']]), select('mitigation', '선택한 완화', 'none', [['none', '아직 대응 안 함'], ['cache', '반복 조회 캐시'], ['scale', '웹 서버 증설']])],
      evaluate(v) {
        const database = v.bottleneck !== 'web';
        const webCapacity = v.mitigation === 'scale' ? 120 : database ? 100 : 40;
        const dbCapacity = v.mitigation === 'cache' ? database ? 80 : 110 : database ? 30 : 90;
        const capacity = Math.min(webCapacity, dbCapacity), missing = Math.max(0, 100 - capacity);
        const helped = database ? v.mitigation === 'cache' : v.mitigation === 'scale';
        return output(helped ? '현재 병목의 처리 용량이 늘었어요' : '현재 병목은 그대로 남아 있어요', `웹 ${webCapacity}요청/초와 DB ${dbCapacity}요청/초 중 작은 쪽이 전체 용량입니다. ${helped ? '대응 후에도 남은 병목과 실제 지표를 다시 확인해야 합니다.' : '다른 구간을 개선해도 가장 느린 구간이 전체 처리를 제한합니다.'}`, [fact('처리 용량', `${capacity}요청/초`), fact('초당 미처리 요청', `${missing}개`)], 'bars', [item(`웹 (${webCapacity}/초)`, webCapacity <= dbCapacity ? 'blocked' : 'success', Math.min(100, webCapacity)), item(`DB (${dbCapacity}/초)`, dbCapacity <= webCapacity ? 'blocked' : 'success', Math.min(100, dbCapacity))]);
      },
      note: '고정 처리 용량의 합성 병목 모형입니다. 실제 증설·캐시 설정·장애 복구는 실행하지 않으며 비용, 일관성, 큐와 재시도는 생략했습니다.'
    },
    {
      id: 'lab-secrets', session: 'operations', title: '비밀 관리: 클라이언트 번들과 서버 환경',
      intro: '브라우저로 전달하는 코드에 비밀 값을 넣으면 사용자가 볼 수 있습니다. 서버 환경에서 참조해도 로그에 출력하면 다른 노출 경로가 생깁니다.',
      goal: '저장 위치와 로그 가림을 따로 바꿔 두 노출 경로를 확인하세요.',
      controls: [select('location', '가짜 비밀 값 사용 위치', 'server', [['server', '서버 환경 변수 참조'], ['client', '클라이언트 번들에 포함']]), check('maskLog', '로그에서 가짜 값 가리기', true)],
      evaluate(v) {
        const client = v.location === 'client', mask = v.maskLog === true;
        return output(client ? '브라우저에 포함한 값은 감출 수 없어요' : !mask ? '서버 값도 로그로 새어 나갈 수 있어요' : '이 예시의 두 노출 경로를 줄였어요', '클라이언트로 내보내는 환경 변수는 비밀 저장소가 아닙니다. 서버에서만 참조하고 로그를 가리는 것은 서로 다른 조치이며 실제 설정·접근 제어도 별도로 필요합니다.', [fact('브라우저 노출', client ? '노출됨' : '이 예시에는 없음'), fact('로그 노출', mask ? '가림' : '예시 값 노출')], 'flow', [item(client ? '클라이언트 번들' : '서버 환경 참조', client ? 'blocked' : 'success'), item('브라우저 전달', client ? 'blocked' : 'muted'), item('로그 기록', mask ? 'success' : 'blocked')], `${client ? 'browserBundle = "DEMO_NOT_A_REAL_SECRET"' : 'serverValue = serverEnvironment["DEMO_SECRET"]'}\nlog = "${mask ? '[REDACTED]' : 'DEMO_NOT_A_REAL_SECRET'}"`);
      },
      note: '모든 문자열은 가짜이며 실제 키를 입력받지 않습니다. 서버 환경 변수만으로 비밀이 안전해지는 것은 아니며 실제 보안 진단이나 보장을 제공하지 않습니다.'
    },
    {
      id: 'lab-backup', session: 'operations', title: '백업: RPO·RTO와 복원 확인',
      intro: 'RPO는 허용할 데이터 손실 시간, RTO는 복구 완료까지의 목표 시간입니다. 백업이 있어도 복원 검증을 하지 않았다면 복구 가능 여부는 아직 모릅니다.',
      goal: '백업 나이와 복원 검증을 바꿔 데이터 손실 범위와 복구 신뢰도를 확인하세요.',
      controls: [range('age', '마지막 백업 후 지난 시간', 6, 0, 24), check('restored', '가상 복원·무결성 검증 통과', false)],
      evaluate(v) {
        const age = number(v.age, 0, 24, 6), verified = v.restored === true;
        const recovery = verified ? 30 : 90;
        return output(!verified ? '백업 파일이 있어도 복원은 미검증이에요' : age > 4 ? '복원 검증은 통과했지만 손실 목표를 넘었어요' : '예시 복원과 손실 시간 목표를 충족했어요', `지금 장애가 나면 마지막 백업 이후 최대 ${age}시간의 변경을 잃는다고 가정합니다. 복원 검증을 마친 경우 30분, 미검증이면 90분이 걸린다는 합성 추정치를 RTO 60분과 비교합니다.`, [fact('가능한 데이터 손실', `최대 ${age}시간`), fact('RPO 목표 4시간', age <= 4 ? '충족' : '초과'), fact('복구 확인', verified ? '예시 복원 검증 통과' : '미검증'), fact('RTO 목표 60분', `${recovery}분 추정 · ${recovery <= 60 ? '목표 안' : '목표 초과'}`)], 'flow', [item(`백업 나이 ${age}시간`, age <= 4 ? 'success' : 'blocked'), item('복원과 무결성 확인', verified ? 'success' : 'blocked'), item(`복구 ${recovery}분 추정`, verified ? 'success' : 'muted')]);
      },
      note: '백업·복원·삭제를 실행하지 않는 합성 시간 모형입니다. 복원 시간은 임의 가정이며 실제 RPO/RTO 달성 여부는 복구 훈련과 데이터 검증으로 확인해야 합니다.'
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = defs;
  else globalThis.NOVA_NEW_LABS = (globalThis.NOVA_NEW_LABS || []).concat(defs);
})();
