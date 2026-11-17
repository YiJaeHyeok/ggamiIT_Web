/* 작은 실험마다 상태와 화면 갱신을 분리했습니다. 외부 서버나 계정은 사용하지 않습니다. */
(() => {
  const $ = selector => document.querySelector(selector);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced.matches ? 8 : ms));

  // 세션·검색·딥링크는 sessions.js에서 관리합니다.

  // 1. DNS 응답이 브라우저로 돌아온 다음 브라우저가 서버에 요청합니다.
  const network = [
    ['browser', '브라우저: nova.example의 서버 주소가 필요합니다.'],
    ['dns', 'DNS: 이름에 해당하는 서버의 IP 주소를 찾습니다.'],
    ['browser', '브라우저: DNS에서 받은 서버 주소를 확인했습니다.'],
    ['server', '브라우저가 서버에 요청을 보냅니다. 서버는 요청을 처리합니다.'],
    ['browser', '서버의 응답이 브라우저에 도착했습니다. 화면을 표시할 수 있습니다.']
  ];
  let networkStep = -1;
  function drawNetwork() {
    const stage = $('.network-stage'), nodeName = networkStep < 0 ? 'browser' : network[networkStep][0];
    stage.querySelectorAll('.network-node').forEach(n => n.classList.toggle('is-current', n.dataset.node === nodeName));
    const track = $('.network-track'), node = stage.querySelector('[data-node="' + nodeName + '"]');
    const rect = node.getBoundingClientRect(), parent = track.getBoundingClientRect();
    $('.packet-dot').style.transform = `translate(${rect.left - parent.left + rect.width / 2 - 6}px, 0)`;
    $('#network-next').textContent = networkStep < 0 ? '여행 시작 →' : networkStep === 4 ? '다시 시작 →' : '다음 단계 →';
    $('#network-status').textContent = networkStep < 0 ? '예시: 처음 방문한 사이트의 서버 주소를 아직 모르는 상황입니다.' : (networkStep + 1) + ' / 5 · ' + network[networkStep][1];
  }
  $('#network-next').addEventListener('click', () => { networkStep = (networkStep + 1) % network.length; drawNetwork(); });
  $('#network-reset').addEventListener('click', () => { networkStep = -1; drawNetwork(); });
  new ResizeObserver(drawNetwork).observe($('.network-track')); drawNetwork();

  // 2. 비트 토글로 8비트 정수 계산.
  let binary = 42;
  const bitButtons = [];
  for (let bit = 7; bit >= 0; bit--) {
    const button = document.createElement('button'); button.type = 'button';
    button.innerHTML = '<strong></strong><small>' + 2 ** bit + '</small>';
    button.dataset.bit = bit;
    button.setAttribute('aria-label', '자릿값 ' + 2 ** bit + ' 비트 토글');
    button.addEventListener('click', () => { binary ^= 1 << bit; drawBits(); });
    $('#bit-switches').append(button); bitButtons.push(button);
  }
  function drawBits() {
    bitButtons.forEach(button => { const on = !!(binary & 1 << Number(button.dataset.bit)); button.setAttribute('aria-pressed', String(on)); button.querySelector('strong').textContent = on ? '1' : '0'; });
    $('#binary-value').textContent = binary;
    const values = [128, 64, 32, 16, 8, 4, 2, 1].filter(value => binary & value);
    $('#binary-equation').textContent = (values.length ? values.join(' + ') : '0') + ' = ' + binary;
  }
  drawBits();

  // 3. 예시 API. 실제 네트워크 요청은 하지 않습니다.
  const responses = {menu: {status: '200 OK', body: {items: ['짜장면', '짬뽕']}}, order: {status: '201 Created', body: {orderId: 'DEMO-001', state: 'created'}}, missing: {status: '404 Not Found', body: {error: '이 주소에는 리소스가 없습니다.'}}};
  $('#api-send').addEventListener('click', async () => {
    const button = $('#api-send'), route = $('#api-route').value;
    button.disabled = true; $('#api-route').disabled = true; button.textContent = '응답 기다리는 중…';
    $('#api-response').textContent = '// 브라우저 내 예시 응답 생성 중';
    await wait(320);
    const response = responses[route];
    $('#api-response').textContent = 'HTTP ' + response.status + '\n\n' + JSON.stringify(response.body, null, 2);
    $('#api-response').dataset.status = route === 'missing' ? 'error' : 'ok';
    button.textContent = '요청 보내기 ↗'; button.disabled = false; $('#api-route').disabled = false;
  });

  // 4. 표 필터. SQL 문자열은 설명용이며 실행하지 않습니다.
  const menu = [{name: '짜장면', type: '면류', price: 'RM 18'}, {name: '짬뽕', type: '면류', price: 'RM 22'}, {name: '탕수육', type: '요리', price: 'RM 38'}, {name: '볶음밥', type: '밥류', price: 'RM 20'}];
  function drawDatabase() {
    const value = $('#db-search').value.trim(), rows = menu.filter(item => item.name.includes(value));
    $('#db-query').textContent = value ? "SELECT * FROM menu WHERE name LIKE '%" + value.replaceAll("'", "''") + "%';" : 'SELECT * FROM menu;';
    $('#db-rows').replaceChildren(...rows.map(item => { const tr = document.createElement('tr'); for (const value of [item.name, item.type, item.price]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); } return tr; }));
    if (!rows.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 3; td.textContent = '일치하는 메뉴가 없습니다.'; tr.append(td); $('#db-rows').append(tr); }
    $('#db-status').textContent = rows.length + '개 항목';
  }
  $('#db-search').addEventListener('input', drawDatabase); drawDatabase();

  // 5. 캐시 HIT/MISS. 시간은 가상 비교값입니다.
  let cached = false;
  $('#cache-request').addEventListener('click', async () => {
    const hit = cached, request = $('#cache-request'); request.disabled = true; $('#cache-clear').disabled = true;
    $('.cache-stage').classList.add('is-requesting'); $('#cache-meter-fill').style.width = '0%';
    $('#cache-status').textContent = hit ? 'HIT · 캐시에 저장된 데이터를 사용합니다.' : 'MISS · 캐시가 없어 원본 서버에서 가져옵니다.';
    await wait(30); $('#cache-meter-fill').style.transitionDuration = (reduced.matches ? 0 : hit ? 180 : 900) + 'ms'; $('#cache-meter-fill').style.width = '100%';
    await wait(hit ? 180 : 900); cached = true;
    $('#cache-box').classList.add('has-data'); $('#cache-box small').textContent = '데이터 있음';
    $('#cache-status').textContent = (hit ? 'HIT · 가상 대기 180ms.' : 'MISS · 가상 대기 900ms. 캐시에 데이터를 저장했습니다.') + ' 다시 요청해보세요.';
    request.disabled = false; $('#cache-clear').disabled = false; $('.cache-stage').classList.remove('is-requesting');
  });
  $('#cache-clear').addEventListener('click', () => { cached = false; $('#cache-box').classList.remove('has-data'); $('#cache-box small').textContent = '비어 있음'; $('#cache-meter-fill').style.width = '0%'; $('#cache-status').textContent = '캐시를 비웠습니다. 다음 요청은 MISS입니다.'; });

  // 6. 작동 중인 서버만 대상으로 라운드 로빈.
  const servers = [{online: true, count: 0}, {online: true, count: 0}, {online: true, count: 0}];
  let nextServer = 0;
  const serverElements = servers.map((server, i) => {
    const node = document.createElement('div'); node.className = 'server-node';
    node.innerHTML = '<span>SERVER ' + String(i + 1).padStart(2, '0') + '</span><strong>0</strong><small>요청 처리 수</small><button type="button"></button>';
    node.querySelector('button').addEventListener('click', () => { server.online = !server.online; drawServers(); $('#lb-status').textContent = '서버 ' + (i + 1) + (server.online ? '을 켰습니다.' : '을 껐습니다. 다른 서버가 요청을 나눠 받습니다.'); });
    $('#servers').append(node); return node;
  });
  function drawServers(selected = -1) { serverElements.forEach((node, i) => { const server = servers[i]; node.classList.toggle('is-offline', !server.online); node.classList.toggle('is-chosen', selected === i); node.querySelector('strong').textContent = server.count; const b = node.querySelector('button'); b.textContent = server.online ? '켜짐 · 끄기' : '꺼짐 · 켜기'; b.setAttribute('aria-pressed', String(server.online)); b.setAttribute('aria-label', '서버 ' + (i + 1) + (server.online ? ' 끄기' : ' 켜기')); }); }
  $('#lb-send').addEventListener('click', () => { let found = -1; for (let offset = 0; offset < 3; offset++) { const index = (nextServer + offset) % 3; if (servers[index].online) { found = index; break; } } if (found < 0) { $('#lb-status').textContent = '처리할 서버가 없습니다. 서버를 하나 이상 켜주세요.'; return; } servers[found].count++; nextServer = (found + 1) % 3; drawServers(found); $('#lb-status').textContent = '서버 ' + (found + 1) + '에 요청을 전달했습니다.'; });
  $('#lb-reset').addEventListener('click', () => { servers.forEach(server => { server.count = 0; }); nextServer = 0; drawServers(); $('#lb-status').textContent = '처리 수를 초기화했습니다. 서버의 켜짐 상태는 유지됩니다.'; }); drawServers();

  // 7. 하나의 화면을 역할별 입체 레이어로 분리.
  $('#layers-toggle').addEventListener('click', () => { const on = $('#layers-toggle').getAttribute('aria-pressed') !== 'true'; $('#layers-toggle').setAttribute('aria-pressed', String(on)); $('.layer-view').classList.toggle('is-expanded', on); $('#layers-toggle').textContent = on ? '레이어 합치기 ↙' : '레이어 펼치기 ↗'; });

  // 8. 실제 배포 없는 파이프라인 시뮬레이션.
  $('#deploy-run').addEventListener('click', async () => {
    const button = $('#deploy-run'), fail = $('#deploy-fail').checked, steps = [...document.querySelectorAll('[data-build-step]')];
    button.disabled = true; $('#deploy-fail').disabled = true;
    steps.forEach(step => { step.className = ''; });
    for (let i = 0; i < steps.length; i++) {
      steps[i].className = 'is-running'; $('#deploy-status').textContent = steps[i].textContent + ' 진행 중…';
      await wait(450);
      if (i === 2 && fail) { steps[i].className = 'is-failed'; $('#deploy-status').textContent = '테스트 실패. 오류를 고치고 다시 실행해야 배포로 넘어갑니다.'; break; }
      steps[i].className = 'is-done'; if (i === 3) $('#deploy-status').textContent = '가상 배포 완료. 실제 사이트를 변경하지 않았습니다.';
    }
    button.disabled = false; $('#deploy-fail').disabled = false; button.textContent = '다시 실행';
  });

  // 9. 실제 SHA-256. 입력값은 브라우저 안에서만 사용됩니다.
  let previousHash = null;
  async function drawHash() {
    const button = $('#hash-run'); button.disabled = true;
    try {
      if (!globalThis.crypto?.subtle) throw new Error('이 브라우저에서는 HTTPS 또는 localhost에서 열어주세요.');
      const bytes = new TextEncoder().encode($('#hash-input').value), buffer = await crypto.subtle.digest('SHA-256', bytes);
      const result = [...new Uint8Array(buffer)], hex = result.map(b => b.toString(16).padStart(2, '0')).join('');
      const bits = result.map(b => b.toString(2).padStart(8, '0')).join('');
      $('#hash-pixels').replaceChildren(...[...bits].map(bit => { const span = document.createElement('span'); span.dataset.on = bit; return span; }));
      $('#hash-output').textContent = hex;
      const previousBits = previousHash;
      $('#hash-status').textContent = previousBits ? (bits === previousBits ? '같은 입력 → 같은 256비트 결과입니다.' : [...bits].filter((bit, i) => bit !== previousBits[i]).length + ' / 256비트가 직전 결과와 달라졌습니다.') : 'SHA-256 계산 완료 · 밝은 칸은 1, 어두운 칸은 0입니다.';
      previousHash = bits;
    } catch (e) { $('#hash-status').textContent = e.message; }
    finally { button.disabled = false; }
  }
  $('#hash-run').addEventListener('click', drawHash); drawHash();

  // 10. 이 코드의 실행 순서: 동기 A,D → 마이크로태스크 B → 타이머 태스크 C.
  const loop = [['A', '현재 실행 중인 동기 코드: A를 출력합니다.'], ['D', '현재 동기 코드를 계속 실행해 D를 출력합니다.'], ['B', '동기 코드가 끝났습니다. Promise 마이크로태스크 B를 처리합니다.'], ['C', '그다음 타이머 태스크 C가 실행됩니다. 0ms는 즉시 실행을 보장하지 않습니다.']];
  let loopIndex = 0;
  $('#loop-next').addEventListener('click', () => { if (loopIndex >= loop.length) return; const [letter, text] = loop[loopIndex++]; const span = document.createElement('span'); span.textContent = letter; $('#loop-output').append(span); $('#loop-status').textContent = text; $('#loop-next').disabled = loopIndex === loop.length; });
  $('#loop-reset').addEventListener('click', () => { loopIndex = 0; $('#loop-output').replaceChildren(); $('#loop-next').disabled = false; $('#loop-status').textContent = '먼저 실행되는 글자를 예상해보세요.'; });

  // 11. 인증과 인가. 서버의 실제 권한 검사를 대체하지 않습니다.
  function drawAuth() { const login = $('#auth-login').checked, admin = $('#auth-role').value === 'admin'; $('#auth-door').dataset.access = login && admin ? 'allowed' : 'denied'; $('#auth-result').textContent = !login ? '인증 필요' : !admin ? '권한 부족' : '접근 허용'; $('#auth-status').textContent = !login ? '누구인지 확인되지 않았습니다. 먼저 로그인이 필요합니다.' : !admin ? '인증은 됐지만 관리자 권한이 없습니다.' : '로그인 상태와 관리자 권한을 모두 만족했습니다.'; }
  $('#auth-login').addEventListener('change', drawAuth); $('#auth-role').addEventListener('change', drawAuth); drawAuth();

  // 12. 버블 정렬: 한 번에 두 값만 비교합니다.
  let numbers = [7, 3, 9, 2, 6, 4, 8, 1], sortIndex = 0, sortEnd = 7, comparisons = 0;
  function drawSort(active = []) { $('#sort-bars').replaceChildren(...numbers.map((value, i) => { const bar = document.createElement('div'); bar.className = 'sort-bar' + (active.includes(i) ? ' is-comparing' : '') + (i > sortEnd || sortEnd === 0 ? ' is-sorted' : ''); bar.style.setProperty('--bar-height', (value * 15 + 20) + 'px'); const label = document.createElement('span'); label.textContent = value; bar.append(label); return bar; })); $('#sort-bars').setAttribute('aria-label', '현재 순서: ' + numbers.join(', ')); }
  $('#sort-next').addEventListener('click', () => { if (sortEnd <= 0) return; const a = numbers[sortIndex], b = numbers[sortIndex + 1], swapped = a > b; if (swapped) [numbers[sortIndex], numbers[sortIndex + 1]] = [b, a]; comparisons++; drawSort([sortIndex, sortIndex + 1]); $('#sort-status').textContent = a + '와 ' + b + ' 비교 → ' + (swapped ? '자리 교환.' : '그대로 유지.') + ' 비교 ' + comparisons + '회.'; sortIndex++; if (sortIndex >= sortEnd) { sortEnd--; sortIndex = 0; } if (sortEnd === 0) { drawSort(); $('#sort-next').disabled = true; $('#sort-status').textContent = '정렬 완료: ' + numbers.join(', ') + ' · 비교 ' + comparisons + '회'; } });
  $('#sort-reset').addEventListener('click', () => { numbers = [1, 2, 3, 4, 6, 7, 8, 9]; for (let i = numbers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; } sortIndex = 0; sortEnd = numbers.length - 1; comparisons = 0; $('#sort-next').disabled = false; $('#sort-status').textContent = '새 순서입니다. 이웃한 두 값을 비교해보세요.'; drawSort(); }); drawSort();
})();
