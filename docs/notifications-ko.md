# 문의 이메일 알림 설정

현재 운영 사이트는 Supabase 저장 후 Google Apps Script를 호출하는 방식으로 이메일 알림을 사용합니다. 기존 Vercel·Google 설정은 GitHub로 복사하지 않습니다.

## 동작

문의 폼 → `/api/inquiries` → 새 문의의 DB 저장 성공 → HMAC-SHA256 서명 요청 → Apps Script의 서명·시간·접수 번호 검증 → 설정된 운영자에게 일반 텍스트 메일 발송.

외부 요청의 `to` 값으로 수신자를 정하지 않습니다. 수신 주소는 Google 프로젝트의 Script Properties에만 설정합니다. 같은 접수 번호의 성공 기록은 30일 보관해 재발송을 억제합니다. 알림 오류가 나도 이미 저장한 문의는 유지됩니다. 자동 재시도 큐는 없습니다.

## Google Apps Script를 새로 구성할 때

1. 본인의 https://script.google.com/ 에서 프로젝트를 만듭니다.
2. `google-apps-script/Code.gs`를 코드 편집기에 넣고 저장합니다.
3. 프로젝트 설정 → 스크립트 속성에 `NOVA_NOTIFICATION_TO`를 추가하고 실제 알림 수신 주소를 값으로 저장합니다.
4. `configureNovaNotifications`를 실행하고 본인이 메일 발송 권한을 승인합니다. 이 함수는 수신 주소를 덮어쓰지 않으며, 비밀값이 없을 때 `NOVA_NOTIFICATION_SECRET`을 생성합니다. 설정 확인 자체는 메일을 보내지 않습니다.
5. 웹 앱으로 배포합니다. 실행 사용자는 소유자이며, Vercel이 로그인 없이 호출할 수 있는 접근 설정이 필요합니다. 수신기는 올바른 서명을 확인한 요청만 처리합니다.
6. 발급된 `/exec` 주소를 Vercel의 `INQUIRY_NOTIFICATION_URL`에 저장합니다.
7. Google Script Properties의 `NOVA_NOTIFICATION_SECRET`과 같은 값을 Vercel의 서버용 Secret `NOVA_NOTIFICATION_SECRET`에 저장합니다. 실제 비밀값은 코드에 넣지 않습니다.
8. Vercel을 새로 배포하고, 본인이 테스트 문의를 보내 DB 기록과 실제 받은편지함을 확인합니다.

매니페스트 예시는 `google-apps-script/appsscript.json`에 있으며 메일 발송 권한 `script.send_mail`만 선언합니다. Google 프로젝트나 공유 비밀값을 공개하지 않습니다.

기존 Google 프로젝트의 수신 주소와 비밀값을 다시 만들 필요는 없습니다. 저장소의 Apps Script 소스를 변경해도 실제 Google 배포는 자동으로 바뀌지 않습니다. Google 코드 변경을 적용할 때는 Apps Script에서 별도로 버전을 배포합니다.

## 한도와 장애

일반 Gmail 계정의 Apps Script 메일 한도는 하루 수신자 100명분이며 같은 발송 계정의 스크립트들이 공유합니다. 한도를 소진하거나 발송이 실패해도 DB 문의 기록은 남습니다. 휴대폰 Gmail 앱과 OS의 알림을 켜야 휴대폰 알림을 받을 수 있습니다.

공식 자료:

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/guides/services/quotas