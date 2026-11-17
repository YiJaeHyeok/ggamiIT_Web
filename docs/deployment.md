# GitHub → Vercel 배포

대상 저장소: https://github.com/YiJaeHyeok/ggamiIT_Web
기존 Vercel 프로젝트: Web_Jae / ggami
운영 주소: https://ggami.vercel.app/

## 기존 프로젝트에 연결

Vercel의 기존 `ggami` 프로젝트에서 Settings → Git → Connect Git Repository를 열고 `YiJaeHyeok/ggamiIT_Web`을 연결합니다. Production Branch는 `main`으로 지정합니다. 새 프로젝트를 만들 필요는 없습니다.

Vercel CLI를 사용할 때는 이 폴더에서 `vercel link`로 기존 `web-jae/ggami` 프로젝트를 선택한 뒤, `vercel git connect https://github.com/YiJaeHyeok/ggamiIT_Web.git`를 실행합니다. GitHub App의 저장소 접근 승인이 필요하면 소유자가 직접 승인합니다.

복구 과정에서 자동 운영 도메인 반영이 중지되어 있다면, 운영 배포를 다시 시작하도록 설정해야 `main`의 새 커밋이 실제 사이트에 반영됩니다.

## 빌드 설정

설정은 `vercel.json`에 기록되어 있습니다.

- Framework: Other
- Node.js: 24.x
- Install Command: `npm ci --ignore-scripts --no-audit --no-fund`
- Build Command: `npm run build`
- Output Directory: `public`

빌드 중 실제 문의나 이메일은 보내지 않습니다. 테스트는 외부 통신을 모의 응답으로 대체합니다. 테스트가 실패하면 빌드가 중단됩니다.

`public/`에는 정적 웹 파일만 복사됩니다. 서버 API는 루트 `api/`에서 별도로 배포됩니다. `.vercelignore`는 CLI 업로드 목록이며, Git 연동 배포에서는 `public/` 출력 폴더가 공개 범위를 결정합니다.

## 환경변수

기존 Vercel 프로젝트의 Production 환경변수를 그대로 사용합니다.

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `INQUIRY_NOTIFICATION_URL`
- `NOVA_NOTIFICATION_SECRET`

실제 값은 저장소·커밋 메시지·이슈에 적지 않습니다. 필요한 변수 이름과 로컬 예시는 `.env.example`에 있습니다.

새 Supabase 프로젝트로 재구성할 때만 `database/inquiries.sql`을 실행합니다. 이미 테이블이 있는 운영 DB에는 같은 생성 SQL을 반복 실행하지 않습니다. DB 스키마 변경은 Git push만으로 자동 실행되지 않습니다.

## 수정 후 배포

1. 파일을 수정합니다.
2. `npm run build`로 테스트와 공개 파일 생성을 확인합니다.
3. `git status`와 `git diff`로 변경을 확인합니다.
4. `git add`와 `git commit`으로 기록하고 `git push origin main`으로 업로드합니다.
5. Vercel의 배포 완료 후 실제 화면과 문의 기능을 확인합니다.

작업 브랜치는 Preview 배포로 검토하고, 운영 반영할 변경을 `main`으로 합칠 수 있습니다. 빌드 단계와 Google Apps Script 배포는 서로 별개입니다.