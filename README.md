# 까미 IT Playground

10개 세션과 50개 실습으로 IT 개념을 배우는 개인 학습용 웹사이트입니다.

- 사이트: https://ggami.vercel.app/
- 저장소: https://github.com/YiJaeHyeok/ggamiIT_Web
- 프런트엔드: HTML, CSS, JavaScript
- 문의 API: Vercel Node.js Function
- 문의 저장: Supabase
- 운영자 이메일 알림: Google Apps Script

## 로컬 실행

Node.js 24를 사용합니다. 외부 npm 의존성은 없습니다.

```sh
npm run dev
```

http://localhost:4178 을 엽니다. 로컬 문의 연동이 필요하면 `.env.example`을 `.env.local`로 복사하고 본인의 설정값을 입력합니다. 설정이 없으면 문의 전송은 오류를 표시하고 입력 내용을 유지합니다.

## 테스트와 빌드

```sh
npm test
npm run build
```

빌드는 테스트를 실행하고, CSS/JS의 캐시 버전을 갱신한 뒤 웹 공개 파일 17개만 `public/`에 복사합니다. `public/`은 생성 결과이며 Git에는 올리지 않습니다. 문서, 테스트, Google 스크립트, SQL, 인증 파일은 웹 공개 폴더에 들어가지 않습니다.

Vercel은 루트 `api/inquiries.js`를 별도의 서버 함수로 처리합니다. `vercel.json`에 빌드 명령과 공개 폴더, 함수 설정이 있습니다.

## 파일 안내

- `index.html`: 페이지, 문의 폼, 접수 완료 팝업
- `gallery-theme.css`, `sessions.css`, `session-gallery.js`: 슬라이드 디자인과 탐색
- `sessions.js`, `session-icons.js`, `carousel-math.js`: 세션과 아이콘, 배치 계산
- `app.js`, `learning-plus.js`, `lab-catalog-*.js`: 실습 동작과 교육용 모형
- `contact.js`, `contact.css`, `api/inquiries.js`: 문의 접수
- `scripts/`: 공개 파일 빌드와 캐시 버전 생성
- `test/`: 서버·실습 모형 테스트와 브라우저 검증 스니펫
- `database/inquiries.sql`: 문의 테이블과 등록 전용 접근 정책
- `google-apps-script/`: 서명 검증 후 운영자에게 메일을 보내는 수신기 소스
- `docs/deployment.md`: GitHub와 기존 Vercel 프로젝트 연결 및 배포 방법
- `docs/notifications-ko.md`: 이메일 알림 설정

SQL 인젝션·드로퍼·AI 체험 등은 브라우저 안의 교육용 모형입니다. 실제 공격이나 외부 AI 호출을 수행하지 않습니다. 문의 폼만 동의한 내용을 서버에 저장합니다.

## 환경변수

실제 값은 Vercel 프로젝트 설정에 보관합니다. GitHub에는 변수 이름만 들어 있습니다.

| 이름 | 용도 |
| --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 주소 |
| `SUPABASE_PUBLISHABLE_KEY` | 등록 전용 RLS 정책을 적용받는 공개 API 키 |
| `INQUIRY_NOTIFICATION_URL` | Google Apps Script 웹 앱의 `/exec` 주소 |
| `NOVA_NOTIFICATION_SECRET` | Vercel과 Apps Script가 공유하는 서명용 비밀값 |

`NOVA_NOTIFICATION_SECRET`은 기존 운영 연결과 호환되는 설정 이름입니다. 실제 비밀값과 `.env.local`, `.vercel/`은 커밋하지 않습니다.

## 문의 처리

방문자 → Vercel API 검증 → Supabase 저장 성공 → 서명된 Apps Script 요청 → 운영자 Gmail 알림 순서입니다. 저장 성공 후에만 폼을 비우고 팝업을 표시합니다. 이메일 알림 실패는 저장된 문의를 취소하지 않습니다. 중복 접수 번호는 다시 저장하거나 알림 요청을 보내지 않습니다.

Google Apps Script는 별도로 배포하는 서비스입니다. GitHub에 소스를 올리거나 Vercel에 배포해도 Google의 스크립트 배포가 자동 갱신되지는 않습니다.