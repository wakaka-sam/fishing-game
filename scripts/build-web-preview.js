#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'build/web-preview');
const versionData = JSON.parse(fs.readFileSync(path.join(publicDir, 'version.json'), 'utf8'));
const assetVersion = encodeURIComponent(versionData.version || Date.now());

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
      continue;
    }
    fs.copyFileSync(from, to);
  }
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

fs.rmSync(outDir, { recursive: true, force: true });
copyDir(publicDir, outDir);

const indexFile = path.join(outDir, 'index.html');
let indexHtml = fs.readFileSync(indexFile, 'utf8');
indexHtml = indexHtml
  .replace(/__ASSET_VERSION__/g, assetVersion)
  .replace('<title>像素钓鱼</title>', '<title>像素钓鱼浏览版</title>');
writeText(indexFile, indexHtml);

writeText(path.join(outDir, 'README.md'), `# 像素钓鱼浏览版

这个目录由 \`npm run build:web-preview\` 生成，内容直接复用 \`public/\` 原网页钓鱼 UI。

## 运行

\`\`\`bash
npm run serve:web-preview
\`\`\`

访问 <http://localhost:4173>。

当前版本：v${versionData.version}
`);

console.log(`Web preview generated from public UI: ${path.relative(root, outDir)} (v${versionData.version})`);
