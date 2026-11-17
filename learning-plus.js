/* 모든 새 체험은 브라우저 메모리에서만 동작합니다. 요청·파일·코드를 실행하지 않습니다. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = ms => new Promise(resolve => setTimeout(resolve, reduced.matches ? 8 : ms));
  const products = ['키보드', '마우스', '모니터'];

  // TCP의 순서 복원/재전송과 UDP의 전송 계층 책임을 비교합니다.
  const makePacket = (index, state = 'idle') => {
    const el = document.createElement('div'); el.className = 'packet-unit';
    el.dataset.state = state; el.textContent = index + 1;
    const label = document.createElement('small'); label.textContent = state === 'missing' ? '유실' : '조각'; el.append(label);
    return el;
  };
  function resetPackets() {
    $('#packet-sender').replaceChildren(...[0, 1, 2, 3].map(index => makePacket(index)));
    $('#packet-receiver').replaceChildren(...[0, 1, 2, 3].map(index => {
      const el = makePacket(index, 'missing'); el.querySelector('small').textContent = '대기'; return el;
    }));
  }
  resetPackets();
  for (const control of [$('#transport-mode'), $('#packet-loss')]) control.addEventListener('change', () => {
    resetPackets(); $('#packet-status').textContent = '설정이 바뀌었습니다. 패킷을 다시 보내보세요.';
  });
  $('#packet-send').addEventListener('click', async () => {
    const tcp = $('#transport-mode').value === 'tcp', loss = $('#packet-loss').checked;
    const controls = [$('#packet-send'), $('#transport-mode'), $('#packet-loss')]; controls.forEach(el => { el.disabled = true; });
    resetPackets();
    const received = [];
    $('#packet-receiver').replaceChildren();
    for (const index of [1, 0, 2, 3]) {
      await pause(230);
      const missed = index === 2 && loss;
      $('#packet-sender').children[index].dataset.state = missed ? 'missing' : 'received';
      if (!missed) received.push(index);
      $('#packet-receiver').append(makePacket(index, missed ? 'missing' : 'received'));
      $('#packet-status').textContent = missed ? '3번 패킷이 유실됐습니다.' : (index + 1) + '번 조각 도착 · 도착 순서는 보낸 순서와 다를 수 있습니다.';
    }
    if (tcp) {
      if (loss) {
        $('#packet-status').textContent = 'TCP: 빠진 3번 조각을 감지했습니다. 가상 재전송 중…';
        await pause(550); received.push(2);
      }
      received.sort((a, b) => a - b);
      $('#packet-receiver').replaceChildren(...received.map(index => makePacket(index, loss && index === 2 ? 'retried' : 'received')));
      $('#packet-status').textContent = loss ? 'TCP · 4/4 조각 복원. 유실된 3번을 다시 받고 원래 순서로 전달했습니다.' : 'TCP · 4/4 조각 도착. 애플리케이션에는 원래 순서로 전달합니다.';
    } else {
      $('#packet-status').textContent = loss ? 'UDP · 3/4 조각 도착. UDP 자체는 유실 복구나 순서 복원을 해주지 않습니다.' : 'UDP · 4/4 조각 도착. 모두 도착했어도 순서 보장은 없습니다.';
    }
    controls.forEach(el => { el.disabled = false; });
  });

  // 목적지 TCP 포트만 보는 단순 규칙입니다. 실제 방화벽에는 방향/주소/상태 등도 있습니다.
  function firewall() {
    const port = $('#firewall-target').value, allowed = $('#port-' + port).checked;
    $('#firewall-verdict').dataset.pass = String(allowed);
    $('#firewall-verdict').textContent = port + '번 문 · ' + (allowed ? '통과' : '차단');
    $('#firewall-status').textContent = allowed ? '가상 방화벽이 이 TCP 연결을 허용했습니다. 다음 단계인 서비스 인증은 별도로 필요합니다.' : '이 TCP 포트가 닫혀 있어 연결을 막았습니다. 문을 열고 다시 비교해보세요.';
  }
  $('#firewall-send').addEventListener('click', firewall);
  for (const el of document.querySelectorAll('.port-gates input, #firewall-target')) el.addEventListener('change', firewall);
  $('#firewall-reset').addEventListener('click', () => {
    for (const port of ['443', '22', '5432']) $('#port-' + port).checked = port === '443';
    $('#firewall-target').value = '443'; firewall();
  });

  function tls(on) {
    $('#tls-on').setAttribute('aria-pressed', String(on)); $('#tls-off').setAttribute('aria-pressed', String(!on));
    $('#tls-observer').textContent = on ? '8f 2a c7 91 b4 6d 03 ee / … [암호문을 표현한 모형]' : 'POST /message\n내용: 내 상담 예약은 금요일 오후 3시';
    $('#tls-status').textContent = on ? 'HTTPS: 올바른 인증서 검증과 TLS 연결을 전제로, 중간 관찰자는 요청 내용을 평문으로 읽을 수 없습니다. 서버는 복호화해 처리합니다.' : 'HTTP: 전송 중인 내용이 평문입니다. 경로의 관찰자가 내용을 읽거나 변조할 위험이 있습니다.';
  }
  $('#tls-on').addEventListener('click', () => tls(true)); $('#tls-off').addEventListener('click', () => tls(false)); tls(true);

  // SQL 엔진이 아닙니다. 아래 한 예시만 모델링하며 입력은 textContent로 표시합니다.
  const injectionExample = "' OR 1=1 --";
  function sql() {
    const value = $('#sql-input').value, safe = $('#sql-safe').checked;
    const injection = value.trim() === injectionExample;
    $('#sql-query').textContent = safe ? 'SELECT name FROM products WHERE name = $1;\n-- 명령 구조는 고정' : "SELECT name FROM products WHERE name = '" + value + "';";
    $('#sql-bound').textContent = safe ? '$1 ← ' + JSON.stringify(value) + ' · 값은 SQL 문법으로 해석하지 않음' : '문자열 직접 결합 · 입력이 SQL 문장의 일부가 됨';
    const matches = !safe && injection ? products : products.filter(item => item === value.trim());
    $('#sql-results').replaceChildren(...(matches.length ? matches : ['검색 결과 없음']).map(item => {
      const el = document.createElement('span'); el.textContent = item; return el;
    }));
    $('#sql-status').textContent = injection ? (safe ? '방어 적용 · 입력 전체를 상품 이름으로 취급했습니다. 일치하는 상품이 없어 0건입니다.' : '취약 모형 · OR 1=1이 항상 참인 조건을 만들어 3개 상품이 모두 보입니다. 뒤의 --는 남은 문장을 주석으로 만듭니다.') : (safe ? '매개변수로 ' : '문자열을 붙여 ') + '가상 상품 ' + matches.length + '건을 찾았습니다. 인젝션 예시를 넣어 비교해보세요.';
  }
  $('#sql-search').addEventListener('click', sql); $('#sql-safe').addEventListener('change', sql);
  $('#sql-input').addEventListener('input', sql);
  $('#sql-preset').addEventListener('click', () => { $('#sql-input').value = injectionExample; sql(); });
  $('#sql-reset').addEventListener('click', () => { $('#sql-input').value = '키보드'; sql(); }); sql();

  let dropperStep = -1;
  function resetDropper() {
    dropperStep = -1; $('#dropper-next').disabled = false;
    $('#dropper-chain').querySelectorAll('li').forEach(el => { el.className = ''; });
    $('#dropper-status').textContent = '처음으로 돌아왔습니다. 방어 설정을 고르고 다음 단계로 진행하세요.';
  }
  $('#dropper-next').addEventListener('click', () => {
    dropperStep++;
    const steps = [...$('#dropper-chain').children];
    steps.forEach((el, i) => { el.className = i < dropperStep ? 'is-done' : i === dropperStep ? 'is-active' : ''; });
    if (dropperStep === 1 && $('#dropper-source').checked) {
      steps[1].className = 'is-blocked'; $('#dropper-next').disabled = true;
      $('#dropper-status').textContent = '실행 전 중단 · 출처가 불분명해 실행하지 않았습니다. 이 모형의 감염 흐름이 여기서 멈췄습니다.'; return;
    }
    if (dropperStep === 2 && $('#dropper-protect').checked) {
      steps[2].className = 'is-blocked'; $('#dropper-next').disabled = true;
      $('#dropper-status').textContent = '탐지·차단 모형 · 보안 도구가 이 예시의 추가 악성 파일 설치를 막았다고 가정했습니다.'; return;
    }
    $('#dropper-status').textContent = [
      '1/4 · 정상 프로그램처럼 보이는 파일이 도착했습니다. 이 예시에서는 파일을 받는 것만으로 실행되지는 않습니다.',
      '2/4 · 사용자가 위장 프로그램을 실행했다고 가정합니다. 드로퍼가 동작하기 시작합니다.',
      '3/4 · 드로퍼가 품고 있던 추가 악성 파일을 설치합니다. 외부에서 가져오는 유형도 있습니다.',
      '4/4 · 설치된 악성 프로그램이 동작할 수 있습니다. 출처 확인·최소 권한·보안 도구 같은 여러 방어가 필요한 이유입니다.'
    ][dropperStep];
    if (dropperStep === 3) $('#dropper-next').disabled = true;
  });
  $('#dropper-reset').addEventListener('click', resetDropper);
  for (const id of ['dropper-source', 'dropper-protect']) $('#' + id).addEventListener('change', resetDropper);

  function mcpConnection() {
    const connected = $('#mcp-connected').checked;
    $('#mcp-server').classList.toggle('is-linked', connected);
    const tool = document.createElement('code'); tool.textContent = connected ? '발견한 도구 · calendar.list_events' : '발견한 도구 없음';
    $('#mcp-tools').replaceChildren(tool);
    $('#mcp-log').textContent = connected ? '서버 연결 → 도구 목록 확인\ncalendar.list_events · 일정 조회' : '도구 연결을 기다리는 중입니다.';
    $('#mcp-status').textContent = '설정이 바뀌었습니다. “빈 시간 찾아줘”를 눌러 결과를 비교하세요.';
  }
  $('#mcp-connected').addEventListener('change', mcpConnection); $('#mcp-permission').addEventListener('change', mcpConnection);
  $('#mcp-run').addEventListener('click', () => {
    if (!$('#mcp-connected').checked) {
      $('#mcp-log').textContent = 'AI: 달력 데이터에 접근할 도구가 없습니다.';
      $('#mcp-status').textContent = '연결 없음 · 모델이 내 개인 일정을 스스로 알 수는 없습니다. MCP 서버를 연결해보세요.';
    } else if (!$('#mcp-permission').checked) {
      $('#mcp-log').textContent = '발견: calendar.list_events\n호출 중단: 일정 읽기 권한 없음';
      $('#mcp-status').textContent = '권한 없음 · 도구가 보이는 것과 내 데이터를 읽을 수 있는 것은 다릅니다.';
    } else {
      $('#mcp-log').textContent = '가상 tools/call → calendar.list_events\n서버 결과: 10:00 회의, 14:00 상담\nAI 답변: 이 가상 달력에서는 11:00이 비어 있습니다.';
      $('#mcp-status').textContent = '가상 조회 성공 · 서버가 데이터를 제공하고 AI 앱이 결과를 활용합니다. 일정 생성 권한은 주지 않았습니다.';
    }
  }); mcpConnection();

  let agentStep = 0;
  function resetAgent() {
    agentStep = 0; $('#agent-next').disabled = false;
    $('#agent-steps').querySelectorAll('span').forEach(el => el.classList.remove('is-active'));
    $('#agent-log').textContent = '설정을 고른 뒤 실행해보세요.';
    $('#agent-status').textContent = '목표를 받으면 계획 → 도구 사용 → 확인 → 초안의 순서로 진행합니다.';
  }
  $('#agent-next').addEventListener('click', () => {
    const skilled = $('#agent-skill').checked;
    const stages = [...$('#agent-steps').children]; stages.forEach((el, index) => el.classList.toggle('is-active', index === agentStep));
    if (agentStep === 1 && !$('#agent-tool').checked) {
      $('#agent-log').textContent += '\n도구 사용 중단: 문의 조회 권한 없음.';
      $('#agent-status').textContent = '스킬이 있어도 없는 권한을 만들어주지는 않습니다. 도구를 허용하면 흐름이 초기화됩니다.';
      $('#agent-next').disabled = true; return;
    }
    const texts = skilled ? [
      '계획: 응대 SKILL.md의 “요약 → 초안 → 사람 검토” 지침을 읽습니다.',
      '도구: 가상 문의 조회 → “모바일에서 실험을 쓸 수 있나요?”',
      '확인: 문의를 “모바일 지원 여부”로 요약합니다. 제공된 학습 페이지 안내와 대조합니다.',
      '초안: “안녕하세요. 이 학습 페이지는 모바일 화면도 지원합니다.”\n상태: 사람의 검토 대기 · 발송하지 않음'
    ] : [
      '계획: 문의를 읽고 답장 초안을 작성하겠습니다.',
      '도구: 가상 문의 조회 → “모바일에서 실험을 쓸 수 있나요?”',
      '확인: 문의 조회 결과를 확인했습니다. 별도의 응대 절차는 로드하지 않았습니다.',
      '초안: “모바일 이용에 관한 문의를 확인했습니다. 자세한 안내를 준비하겠습니다.”\n상태: 초안만 작성 · 발송하지 않음'
    ];
    if (agentStep === 0) $('#agent-log').textContent = texts[agentStep];
    else $('#agent-log').textContent += '\n' + texts[agentStep];
    $('#agent-status').textContent = agentStep === 3 ? (skilled ? '스킬 적용 완료 · 정해둔 응대 형식과 검토 절차를 반영했습니다.' : '일반 흐름 완료 · 스킬을 켜고 지침이 어떻게 달라지는지 비교하세요.') : (agentStep + 1) + '/4 · ' + stages[agentStep].textContent + ' 단계를 마쳤습니다.';
    agentStep++; if (agentStep === 4) $('#agent-next').disabled = true;
  });
  $('#agent-reset').addEventListener('click', resetAgent);
  for (const id of ['agent-skill', 'agent-tool']) $('#' + id).addEventListener('change', resetAgent);

  function resetRag() {
    $('#rag-docs').querySelectorAll('p').forEach(el => el.classList.remove('is-match'));
    $('#rag-answer').textContent = '질문이나 설정이 바뀌었습니다. 자료 찾아 답하기를 눌러보세요.';
    $('#rag-status').textContent = '문서에서 근거를 찾은 경우에만 구체적으로 답하는 모형입니다.';
  }
  for (const id of ['rag-question', 'rag-enabled']) $('#' + id).addEventListener('change', resetRag);
  $('#rag-run').addEventListener('click', () => {
    const question = $('#rag-question').value, enabled = $('#rag-enabled').checked;
    $('#rag-docs').querySelectorAll('p').forEach(el => el.classList.toggle('is-match', enabled && el.dataset.doc === question));
    $('#rag-answer').textContent = !enabled ? '답변에 참고 자료가 없습니다. 이 가상 서비스의 정확한 안내를 확인할 수 없습니다.' : question === 'hours' ? '평일 10:00~18:00입니다. [문서 A]' : question === 'price' ? '학습 실험은 무료입니다. [문서 B]' : '제공된 문서에는 주차 정보가 없습니다. 운영자에게 확인해야 합니다.';
    $('#rag-status').textContent = !enabled ? '자료 제공 꺼짐 · 근거가 없으므로 추측하지 않습니다.' : question === 'parking' ? '검색 결과 없음 · RAG를 켜도 문서에 없는 사실은 알 수 없습니다.' : '검색 → 관련 문서를 문맥에 추가 → 출처와 함께 답변. 이 과정은 모델 재학습이 아닙니다.';
  });

  function resetPrompt() {
    $('#prompt-trick').hidden = !$('#prompt-malicious').checked;
    $('#prompt-output').textContent = '설정이 바뀌었습니다. 보증 기간 요약하기를 눌러보세요.';
    $('#prompt-status').textContent = '사용자의 요청은 “보증 기간 요약”입니다. 문서 속 별도 지시를 따르는지 비교합니다.';
  }
  for (const id of ['prompt-malicious', 'prompt-boundary']) $('#' + id).addEventListener('change', resetPrompt);
  $('#prompt-run').addEventListener('click', () => {
    const malicious = $('#prompt-malicious').checked, boundary = $('#prompt-boundary').checked;
    $('#prompt-output').textContent = malicious && !boundary ? '바나나' : '제품의 보증 기간은 1년입니다.';
    $('#prompt-status').textContent = malicious ? (boundary ? '경계 적용 모형 · 외부 문서의 지시를 따르지 않고 사실만 요약했습니다.' : '경계 실패 모형 · 문서의 지시가 원래 목표를 바꾸었습니다. 외부 자료를 신뢰된 명령처럼 다룬 것이 문제입니다.') : '일반 문서 · 보증 기간을 정상적으로 요약했습니다.';
  });
})();
