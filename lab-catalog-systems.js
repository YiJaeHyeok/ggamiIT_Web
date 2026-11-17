(function () {
  'use strict';
  const limit = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  };
  const select = (key, label, value, options) => ({ key, label, type: 'select', value, options: options.map(([value, label]) => ({ value, label })) });
  const check = (key, label, value) => ({ key, label, type: 'checkbox', value });
  const range = (key, label, value, min, max) => ({ key, label, type: 'range', value, min, max, step: 1 });
  const fact = (label, value) => ({ label, value: String(value) });
  const item = (label, state = 'active') => ({ label: String(label), state });
  const bar = (label, value, state = 'active') => ({ label: String(label), value: Math.max(0, Math.min(100, value)), state });
  const result = (headline, explanation, facts, kind, items, code) => ({ headline, explanation, facts, visual: { kind, items }, ...(code === undefined ? {} : { code }) });
  const text = (value, fallback = '') => String(value === undefined ? fallback : value).slice(0, 180);
  const defs = [
    {
      id: 'lab-routing', session: 'network', title: '라우팅 · 끊긴 길을 돌아가기',
      intro: '라우팅은 목적지까지 보낼 길을 고르는 일입니다. 두 경로 중 사용할 수 있는 더 짧은 길을 골라 봅니다.',
      goal: '기본 경로를 끄고 우회 경로와 지연이 어떻게 바뀌는지 보세요. 두 경로를 모두 꺼 보세요.',
      controls: [check('primary', '기본 경로 연결', true), check('backup', '우회 경로 연결', true)],
      evaluate(v = {}) {
        const primary = v.primary !== false, backup = v.backup !== false;
        const route = primary ? '기본 경로' : backup ? '우회 경로' : '도달 불가';
        return result(route, primary ? '연결된 경로 중 비용이 작은 기본 경로를 선택했습니다.' : backup ? '기본 경로가 끊겨 우회 경로로 보냅니다.' : '목적지까지 이어진 경로가 없어 전달할 수 없습니다.',
          [fact('선택 경로', route), fact('예상 지연', primary ? '20 ms' : backup ? '50 ms' : '전달 실패')], 'flow',
          [item('내 기기'), item('기본 라우터 · 20 ms', primary ? 'success' : 'blocked'), item('우회 라우터 · 50 ms', !primary && backup ? 'success' : backup ? 'muted' : 'blocked'), item('목적지', primary || backup ? 'success' : 'blocked')]);
      },
      note: '가상 경로와 지연입니다. 실제 라우팅은 프로토콜의 비용·정책·수렴 시간 등에 따라 달라집니다.'
    },
    {
      id: 'lab-subnet', session: 'network', title: '서브넷 · 같은 동네인지 판단하기',
      intro: '서브넷 마스크는 IP 주소에서 네트워크 부분의 길이를 정합니다. 내 주소는 192.168.1.10입니다.',
      goal: '목적지와 접두사 길이를 바꿔 직접 보낼지 게이트웨이를 거칠지 비교하세요.',
      controls: [range('prefix', '네트워크 접두사 길이 /16~30', 24, 16, 30), select('target', '목적지 IP', '192.168.1.200', [['192.168.1.200', '192.168.1.200'], ['192.168.2.20', '192.168.2.20']])],
      evaluate(v = {}) {
        const prefix = limit(v.prefix, 16, 30, 24), target = v.target === '192.168.2.20' ? '192.168.2.20' : '192.168.1.200';
        const number = ip => ip.split('.').reduce((n, part) => n * 256 + Number(part), 0);
        const block = 2 ** (32 - prefix), sourceNetwork = Math.floor(number('192.168.1.10') / block) * block, targetNetwork = Math.floor(number(target) / block) * block;
        const address = n => [24, 16, 8, 0].map(bits => Math.floor(n / 2 ** bits) % 256).join('.');
        const local = sourceNetwork === targetNetwork;
        return result(local ? '같은 서브넷입니다' : '다른 서브넷입니다', `앞 ${prefix}비트의 네트워크 주소를 비교합니다. ${local ? '같으면 로컬 네트워크로 보냅니다.' : '다르면 설정된 게이트웨이로 보냅니다.'}`,
          [fact('전송 방법', local ? '같은 서브넷에서 전송' : '게이트웨이로 전송'), fact('내 네트워크', `${address(sourceNetwork)}/${prefix}`), fact('목적지 네트워크', `${address(targetNetwork)}/${prefix}`)], 'flow',
          [item('192.168.1.10'), item(local ? '로컬 네트워크' : '게이트웨이', local ? 'success' : 'active'), item(target, 'success')]);
      },
      note: 'IPv4 주소의 네트워크 비교만 모델링합니다. 실제 연결에는 ARP, 경로, 방화벽과 유효한 호스트 주소도 필요합니다.'
    },
    {
      id: 'lab-xss', session: 'security', title: 'XSS · 입력을 문자로 표시하기',
      intro: 'XSS는 신뢰하지 않는 입력이 웹 페이지의 코드처럼 해석될 때 생길 수 있습니다. 여기서는 입력을 실행하지 않고 해석 방식만 비교합니다.',
      goal: '태그가 있는 입력을 넣고 문자 표시와 HTML 해석을 전환해 위험 신호를 확인하세요.',
      controls: [select('mode', '앱의 표시 방식', 'text', [['text', '문자 그대로 표시'], ['html', 'HTML로 해석한다고 가정']]), { key: 'payload', label: '가상 사용자 입력 (최대 180자)', type: 'text', value: '<b>안녕하세요</b>' }],
      evaluate(v = {}) {
        const payload = text(v.payload, '<b>안녕하세요</b>'), tag = /[<>]/.test(payload), html = v.mode === 'html', risky = html && tag;
        const method = !html ? '문자 그대로' : risky ? 'HTML 해석 위험' : '일반 텍스트';
        return result(method, risky ? 'HTML 해석 지점에 태그 신호가 있습니다. 실제 앱에서는 실행 가능한 콘텐츠가 섞일 위험이 있으므로 안전한 텍스트 표시나 검증된 문맥별 방어가 필요합니다.' : '입력 내용은 이 실습에서 언제나 실행되지 않는 문자열입니다. 문자 표시 방식은 입력을 HTML 구조로 만들지 않습니다.',
          [fact('표시 방식', method), fact('입력 길이', `${payload.length} 자`), fact('태그 신호', tag ? '있음' : '없음')], 'flow',
          [item('사용자 입력'), item(html ? '가상 HTML 해석 지점' : '텍스트 표시 지점', risky ? 'blocked' : 'success'), item('이 실습: 문자열만 표시', 'success')], payload);
      },
      note: '태그 신호는 위험을 설명하기 위한 단순 검사이며 XSS 탐지기나 소독기가 아닙니다. 모든 미리보기는 실행되지 않는 텍스트입니다.'
    },
    {
      id: 'lab-phishing', session: 'security', title: '피싱 · 진짜 도메인 비교하기',
      intro: '피싱은 익숙한 이름을 흉내 내 정보를 요구할 수 있습니다. 이름 일부가 아니라 전체 호스트 이름을 비교해 봅니다.',
      goal: 'nova.example 뒤에 다른 도메인을 붙이거나 숫자 0을 섞어 일치 여부를 보세요.',
      controls: [select('expected', '미리 확인한 공식 호스트', 'nova.example', [['nova.example', 'nova.example'], ['accounts.nova.example', 'accounts.nova.example']]), { key: 'host', label: '받은 호스트 이름 (URL 전체 제외)', type: 'text', value: 'nova.example.evil.example' }],
      evaluate(v = {}) {
        const expected = v.expected === 'accounts.nova.example' ? 'accounts.nova.example' : 'nova.example';
        const host = text(v.host, 'nova.example.evil.example').trim().toLowerCase().replace(/\.$/, '');
        const exact = host === expected;
        return result(exact ? '확인한 호스트와 일치합니다' : '확인한 호스트와 다릅니다', exact ? '주소 비교는 통과했습니다. 도메인 일치만으로 메시지나 로그인 요청의 안전을 보장하지는 않습니다.' : '익숙한 글자가 들어 있어도 공식 호스트와 다릅니다. 받은 링크 대신 직접 확인한 경로로 접속하세요.',
          [fact('도메인 일치', exact ? '일치' : '불일치'), fact('공식 호스트', expected), fact('비교한 호스트', host || '(비어 있음)')], 'list',
          [item(`공식: ${expected}`, 'success'), item(`받은 주소: ${host || '(없음)'}`, exact ? 'success' : 'blocked')]);
      },
      note: '.example은 설명용 예약 도메인입니다. 이 비교는 실제 평판·인증서·유니코드 유사 문자·메시지 진위를 검사하지 않습니다.'
    },
    {
      id: 'lab-scheduler', session: 'process', title: '스케줄러 · CPU 차례 나누기',
      intro: 'CPU 스케줄러는 기다리는 작업에 실행 시간을 나눠 줍니다. A는 6틱, B는 2틱, C는 1틱이 필요하며 동시에 도착합니다.',
      goal: '선입선출과 라운드 로빈을 바꾸고 C의 첫 실행 시간과 실행 순서를 비교하세요.',
      controls: [select('algorithm', '스케줄링 방식', 'fifo', [['fifo', '선입선출 FIFO'], ['rr', '라운드 로빈']]), range('quantum', '라운드 로빈 시간 조각', 1, 1, 4)],
      evaluate(v = {}) {
        const rr = v.algorithm === 'rr', q = limit(v.quantum, 1, 4, 1), remaining = [6, 2, 1], first = [-1, -1, -1], slots = [];
        while (remaining.some(n => n > 0)) {
          for (let i = 0; i < remaining.length; i++) {
            if (!remaining[i]) continue;
            if (first[i] < 0) first[i] = slots.length;
            const slice = rr ? Math.min(q, remaining[i]) : remaining[i];
            for (let j = 0; j < slice; j++) slots.push(String.fromCharCode(65 + i));
            remaining[i] -= slice;
          }
        }
        return result(rr ? `시간을 ${q}틱씩 나눕니다` : '먼저 온 작업부터 끝냅니다', rr ? '짧은 작업도 첫 바퀴에 CPU를 받습니다. 시간 조각을 키우면 다른 작업이 더 오래 기다릴 수 있습니다.' : 'A가 끝나야 B와 C가 시작합니다. 시간 조각 설정은 FIFO에는 적용되지 않습니다.',
          [fact('C 첫 실행', `${first[2]} 틱`), fact('평균 첫 응답', `${(first.reduce((a, b) => a + b, 0) / 3).toFixed(2)} 틱`), fact('전체 작업량', '9 틱')], 'tokens',
          slots.map((job, i) => item(`${i}~${i + 1}: ${job}`, job === 'C' ? 'success' : 'active')));
      },
      note: '동시 도착한 CPU 작업 3개와 전환 비용 0을 가정합니다. 실제 운영체제의 우선순위·입출력·문맥 전환 비용은 생략했습니다.'
    },
    {
      id: 'lab-race', session: 'process', title: '경쟁 상태 · 사라진 증가 찾기',
      intro: '두 작업이 같은 값을 읽고 각각 덮어쓰면 증가 하나가 사라질 수 있습니다. 원자적 증가는 읽기와 쓰기를 하나의 연산으로 다룹니다.',
      goal: '원자적 증가를 켜고 반복 횟수를 바꿔 기대값과 최종값을 비교하세요.',
      controls: [check('atomic', '원자적 증가 사용', false), range('rounds', '두 작업이 증가하는 횟수', 3, 1, 10)],
      evaluate(v = {}) {
        const rounds = limit(v.rounds, 1, 10, 3), atomic = v.atomic === true, expected = rounds * 2, actual = atomic ? expected : rounds;
        return result(atomic ? '모든 증가가 반영됩니다' : '증가가 덮어써집니다', atomic ? '각 증가가 분리되지 않는 연산이라 두 작업의 결과가 모두 남습니다.' : '매 회 두 작업이 같은 이전 값을 읽는 순서를 가정합니다. 둘 다 같은 다음 값을 쓰므로 한 번의 증가가 사라집니다.',
          [fact('기대 카운터', expected), fact('최종 카운터', actual), fact('손실된 증가', expected - actual)], 'flow',
          atomic ? [item('A: 원자적으로 +1', 'success'), item('B: 원자적으로 +1', 'success'), item(`${rounds}회 → ${actual}`, 'success')] : [item('A와 B: 같은 값 읽기'), item('A: 다음 값 쓰기'), item('B: 같은 다음 값 덮어쓰기', 'blocked'), item(`${rounds}회 → ${actual}`, 'blocked')]);
      },
      note: '경쟁이 발생하는 한 가지 실행 순서를 고정한 모형입니다. 실제 실행마다 항상 같은 손실이 생기지는 않으며 실제 스레드를 만들지 않습니다.'
    },
    {
      id: 'lab-storage', session: 'web', title: '브라우저 저장소 · 값의 수명 비교하기',
      intro: '메모리, sessionStorage, localStorage는 값이 남는 범위가 다릅니다. 같은 출처에 학습 메모를 저장했다고 가정합니다.',
      goal: '저장 위치와 페이지 동작을 바꿔 메모가 남는지 확인하세요.',
      controls: [select('store', '가상 저장 위치', 'session', [['memory', '페이지 메모리'], ['session', 'sessionStorage'], ['local', 'localStorage']]), select('event', '다음 동작', 'reload', [['reload', '현재 탭 새로고침'], ['newtab', '독립적인 새 탭 열기']])],
      evaluate(v = {}) {
        const store = ['memory', 'session', 'local'].includes(v.store) ? v.store : 'session', event = v.event === 'newtab' ? 'newtab' : 'reload';
        const survives = store === 'local' || store === 'session' && event === 'reload';
        const names = { memory: '페이지 메모리', session: 'sessionStorage', local: 'localStorage' };
        return result(survives ? '메모가 남습니다' : '새 페이지에는 메모가 없습니다', store === 'memory' ? '페이지를 다시 만들면 자바스크립트 메모리는 초기화됩니다.' : store === 'session' ? 'sessionStorage는 같은 탭의 새로고침을 견디지만 독립적으로 연 새 탭과는 분리됩니다.' : 'localStorage는 같은 출처의 탭이 공유하고 새로고침 뒤에도 남을 수 있습니다.',
          [fact('저장 위치', names[store]), fact('남은 값', survives ? '학습 메모' : '없음'), fact('출처', 'https://learn.nova.example')], 'flow',
          [item('가상 메모 저장'), item(event === 'reload' ? '새로고침' : '독립 새 탭'), item(survives ? '학습 메모' : '값 없음', survives ? 'success' : 'muted')]);
      },
      note: '실제 저장소를 읽거나 쓰지 않습니다. 새 탭은 opener 없는 독립 탭입니다. 복제 탭·opener 복사·비공개 모드·삭제·차단 정책은 생략했습니다.'
    },
    {
      id: 'lab-cors', session: 'web', title: 'CORS · 다른 출처의 응답 읽기',
      intro: 'CORS는 다른 출처에서 받은 응답을 브라우저 코드가 읽어도 되는지 정합니다. 요청 출처는 https://learn.nova.example입니다.',
      goal: '서버가 허용하는 출처와 자격 증명 사용을 바꿔 와일드카드의 제한을 확인하세요.',
      controls: [select('origin', '서버 Access-Control-Allow-Origin', '*', [['*', '* (모든 출처)'], ['https://learn.nova.example', 'https://learn.nova.example'], ['https://other.example', 'https://other.example']]), check('credentials', '쿠키 등 자격 증명 포함', false)],
      evaluate(v = {}) {
        const origin = ['*', 'https://learn.nova.example', 'https://other.example'].includes(v.origin) ? v.origin : '*', credentials = v.credentials === true;
        const allowed = origin === 'https://learn.nova.example' || origin === '*' && !credentials;
        return result(allowed ? '브라우저 코드가 응답을 읽습니다' : '브라우저가 응답 읽기를 막습니다', credentials && origin === '*' ? '자격 증명을 포함한 교차 출처 응답에는 * 대신 정확한 출처가 필요합니다.' : allowed ? '응답의 허용 출처가 요청 출처 조건을 만족합니다.' : '서버가 허용한 출처가 요청 출처와 다릅니다.',
          [fact('응답 읽기', allowed ? '허용' : '차단'), fact('자격 증명', credentials ? '포함' : '미포함'), fact('서버 허용 출처', origin)], 'flow',
          [item('브라우저 요청'), item('서버 응답 수신'), item('자바스크립트가 읽기', allowed ? 'success' : 'blocked')], `Access-Control-Allow-Origin: ${origin}\nAccess-Control-Allow-Credentials: true (이 모형의 고정 조건)`);
      },
      note: '서버의 Allow-Credentials: true와 단순 요청을 가정합니다. 사전 요청은 생략하며 CORS는 인증·CSRF 방어가 아니고 모든 요청 전송을 막는 장치도 아닙니다.'
    },
    {
      id: 'lab-transaction', session: 'data', title: '트랜잭션 · 송금을 함께 반영하기',
      intro: '송금은 한 계좌에서 빼고 다른 계좌에 더하는 두 단계입니다. 트랜잭션의 원자성은 두 단계를 함께 성공하거나 되돌리게 합니다.',
      goal: '받는 단계의 실패와 원자성을 바꿔 전체 코인이 보존되는지 보세요.',
      controls: [check('atomic', '트랜잭션으로 묶기', true), check('fail', '받는 계좌 반영 단계 실패', true)],
      evaluate(v = {}) {
        const atomic = v.atomic !== false, fail = v.fail !== false, rollback = atomic && fail;
        const sender = rollback ? 100 : 70, recipient = fail ? 50 : 80;
        return result(rollback ? '전체 작업을 되돌렸습니다' : fail ? '일부만 반영되었습니다' : '송금이 완료되었습니다', rollback ? '두 번째 단계가 실패하여 출금도 취소했습니다.' : fail ? '출금 30코인은 반영됐지만 입금이 실패해 합계가 줄었습니다.' : '보내는 계좌의 30코인이 받는 계좌로 옮겨졌습니다.',
          [fact('보내는 계좌', `${sender} 코인`), fact('받는 계좌', `${recipient} 코인`), fact('잔액 합계', `${sender + recipient} 코인`)], 'flow',
          [item('출금 30', rollback ? 'muted' : 'success'), item('입금 30', fail ? 'blocked' : 'success'), item(rollback ? 'ROLLBACK · 모두 취소' : fail ? '불완전한 상태' : 'COMMIT · 모두 반영', rollback ? 'success' : fail ? 'blocked' : 'success')]);
      },
      note: '100코인과 50코인 계좌에서 30코인을 옮기는 가상 모형입니다. 실제 DB 연결·동시성·격리 수준·복구 로그는 다루지 않습니다.'
    },
    {
      id: 'lab-index', session: 'data', title: '인덱스 · 찾을 범위를 줄이기',
      intro: '인덱스는 모든 행을 훑지 않고 후보를 줄이는 데 도움을 줍니다. 정렬된 고유 키에서 이진 탐색하는 예시를 비교합니다.',
      goal: '행 수와 인덱스 사용을 바꿔 찾기에 필요한 비교 횟수 상한을 보세요.',
      controls: [range('rows', '가상 행 수', 1024, 1, 1024), check('indexed', '정렬 인덱스로 이진 탐색', true)],
      evaluate(v = {}) {
        const rows = limit(v.rows, 1, 1024, 1024), indexed = v.indexed !== false, work = indexed ? Math.floor(Math.log2(rows)) + 1 : rows;
        return result(indexed ? '매번 후보 범위를 절반으로 줄입니다' : '최악에는 모든 행을 비교합니다', indexed ? '이 모형은 이진 탐색의 최악 비교 횟수를 셉니다. 실제 데이터베이스 인덱스 비용이나 시간을 측정한 값은 아닙니다.' : '순차 탐색은 원하는 행이 끝에 있거나 없으면 모든 행을 확인해야 합니다.',
          [fact('행 수', `${rows} 행`), fact('비교 횟수 상한', `${work} 회`), fact('계산 모형', indexed ? 'floor(log₂ N) + 1' : 'N')], 'bars',
          [bar(`전체 탐색: ${rows}회`, 100, indexed ? 'muted' : 'active'), bar(`선택한 방식: ${work}회`, work / rows * 100, 'success')]);
      },
      note: '설명용 이진 탐색 모형입니다. 실제 DB는 B-tree 등 다른 구조와 캐시·선택도·쓰기 비용·실행 계획을 고려합니다. 막대는 비교 횟수 비율입니다.'
    },
    {
      id: 'lab-cdn', session: 'cloud', title: 'CDN · 가까운 복사본에서 받기',
      intro: 'CDN은 여러 지역에 콘텐츠 복사본을 둡니다. 캐시가 비어 있으면 원본에서 가져오는 단계가 더해집니다.',
      goal: '엣지 위치와 캐시 상태를 바꿔 원본 요청 횟수와 예상 지연을 비교하세요.',
      controls: [select('region', '선택된 엣지 위치', 'near', [['near', '사용자와 가까움'], ['far', '사용자와 멂']]), check('warm', '유효한 캐시 복사본 있음', true)],
      evaluate(v = {}) {
        const far = v.region === 'far', warm = v.warm !== false, edge = far ? 90 : 20, origin = warm ? 0 : 120;
        return result(warm ? '엣지 캐시에서 바로 받습니다' : '원본까지 다녀옵니다', warm ? '유효한 복사본이 있어 이번 요청은 원본 서버에 가지 않습니다.' : '캐시가 비어 있어 원본에서 콘텐츠를 가져온 뒤 전달합니다.',
          [fact('원본 요청', warm ? '0 회' : '1 회'), fact('예상 지연', `${edge + origin} ms`), fact('엣지 왕복', `${edge} ms`)], 'flow',
          [item('사용자'), item(`엣지 · ${edge} ms`, 'success'), item(warm ? '원본 생략' : '원본 추가 · 120 ms', warm ? 'muted' : 'active')]);
      },
      note: '캐시 가능한 동일 파일 한 개와 가상 왕복 시간을 가정합니다. 만료·캐시 키·실제 거리·전송량·CDN 비용은 생략했습니다.'
    },
    {
      id: 'lab-autoscale', session: 'cloud', title: '오토스케일 · 수요만큼 서버 늘리기',
      intro: '오토스케일은 수요에 맞춰 실행 인스턴스 수를 조절합니다. 이 모형에서 한 대는 초당 100요청을 처리합니다.',
      goal: '수요를 최대 용량보다 높였다가 최대 인스턴스 수를 늘려 보세요.',
      controls: [range('demand', '수요 · 요청/초', 250, 0, 1000), range('max', '최대 인스턴스 수', 3, 1, 10)],
      evaluate(v = {}) {
        const demand = limit(v.demand, 0, 1000, 250), max = limit(v.max, 1, 10, 3), needed = Math.ceil(demand / 100), running = Math.min(needed, max), capacity = running * 100, missed = Math.max(0, demand - capacity);
        return result(missed ? '최대 용량을 넘었습니다' : demand ? '수요에 맞는 용량입니다' : '수요가 없어 0대로 줄었습니다', missed ? '한도를 늘리거나 요청을 줄여야 합니다. 이 모형은 처리하지 못한 요청을 즉시 표시합니다.' : '필요 대수를 올림 계산하고 최대 대수 안에서 실행합니다.',
          [fact('필요 인스턴스', `${needed} 대`), fact('실행 인스턴스', `${running} 대`), fact('처리하지 못한 요청', `${missed} 요청/초`)], 'bars',
          [bar(`수요 ${demand}/초`, demand / 10, missed ? 'blocked' : 'active'), bar(`처리 용량 ${capacity}/초`, capacity / 10, 'success')]);
      },
      note: '대당 100요청/초인 합성 수치이며 즉시 확장과 0대로 축소를 가정합니다. 실제 서비스의 지연·최소 대수·큐·비용·병목은 생략했습니다.'
    },
    {
      id: 'lab-container', session: 'cloud', title: '컨테이너 · 실행 환경 맞추기',
      intro: '컨테이너 이미지는 앱과 실행에 필요한 사용자 공간 환경을 묶습니다. 실행 설정은 이미지와 별도로 맞춰야 할 수 있습니다.',
      goal: '환경이 다른 서버와 동일 이미지 실행을 비교하고 필수 설정도 꺼 보세요.',
      controls: [select('environment', '실행 환경', 'mismatch', [['mismatch', '서버에 다른 런타임 설치'], ['image', '개발과 같은 컨테이너 이미지']]), check('config', '필수 환경 설정 제공', true)],
      evaluate(v = {}) {
        const image = v.environment === 'image', config = v.config !== false;
        const status = !image ? '런타임 불일치' : !config ? '설정 누락' : '실행 가능';
        return result(status, !image ? '앱이 필요한 런타임 버전과 서버 버전이 달라 실행 조건을 만족하지 못했습니다.' : !config ? '이미지 속 런타임은 맞지만 실행에 필요한 설정이 없습니다.' : '가정한 런타임과 설정 조건을 모두 만족했습니다.',
          [fact('실행 결과', status), fact('런타임', image ? '앱 요구 버전과 일치' : '앱 요구 버전과 다름'), fact('필수 설정', config ? '제공됨' : '없음')], 'flow',
          [item('앱'), item(image ? '같은 이미지의 런타임' : '다른 서버 런타임', image ? 'success' : 'blocked'), item('실행 설정', config ? 'success' : 'blocked'), item('프로세스 시작', image && config ? 'success' : 'blocked')]);
      },
      note: '런타임과 설정 두 조건만 비교합니다. 컨테이너는 호스트 커널을 공유하며 CPU 구조·권한·네트워크·볼륨 호환성도 실제 실행에 영향을 줍니다.'
    }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = defs;
  else globalThis.NOVA_NEW_LABS = (globalThis.NOVA_NEW_LABS || []).concat(defs);
}());
