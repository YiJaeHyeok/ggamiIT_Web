// 공개할 정적 파일만 public에 복사합니다. API는 Vercel이 루트 api/에서 처리합니다.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'public');
const files = [
  'index.html', 'style.css', 'labs.css', 'contact.css', 'learning-plus.css',
  'sessions.css', 'gallery-theme.css', 'app.js', 'contact.js', 'learning-plus.js',
  'lab-catalog-systems.js', 'lab-catalog-ai.js', 'session-icons.js',
  'carousel-math.js', 'sessions.js', 'session-gallery.js', 'assets/contours.svg',
  'particle-model.js', 'photo-particles.js', 'photo-particles.css'
];

for (const file of files) {
  if (!fs.lstatSync(path.join(root, file)).isFile()) throw new Error('정적 파일이 아닙니다: ' + file);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css|svg|png))(?:\?[^\"]*)?"/g)) {
  if (!/^https?:/.test(match[1]) && !files.includes(match[1])) {
    throw new Error('공개 파일 목록에 참조 자산을 추가하세요: ' + match[1]);
  }
}
// 삭제 대상이 프로젝트 바로 아래 public인지 확인하고 심볼릭 링크는 거부합니다.
if (path.dirname(output) !== root || path.basename(output) !== 'public') throw new Error('잘못된 출력 경로');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink()) throw new Error('public은 심볼릭 링크일 수 없습니다.');
  fs.rmSync(output, { recursive: true, force: true });
}
for (const file of files) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}
console.log(`Prepared ${files.length} public files. Server source, credentials, tests and documentation stay outside public/.`);
