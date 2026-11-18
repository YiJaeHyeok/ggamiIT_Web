// CSS/JS 내용에 맞는 URL을 만들어 이전 브라우저 캐시와 새 배포가 섞이지 않게 합니다.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
let count = 0;
for (const page of ['index.html','pixels.html','starcraft.html','zephyrus.html','earth.html']) {
const file = path.join(root, page);
const html = fs.readFileSync(file, 'utf8').replace(/(src|href)="([^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g, (match, attr, asset) => {
  const hash = createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
  count++;
  return `${attr}="${asset}?v=${hash}"`;
});
fs.writeFileSync(file, html);
}
console.log(`Versioned ${count} local CSS/JS assets by their content.`);
