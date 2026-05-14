const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const BACKEND_API_URL = process.env.FISH_BACKEND_URL || process.env.FISH_API_URL || 'https://fishapi.wakaka007.cn';
const BACKEND_TIMEOUT_MS = Number(process.env.FISH_BACKEND_TIMEOUT_MS || 5000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const CACHEABLE_EXTS = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']);

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function backendUrl(pathname) {
  return new URL(pathname, BACKEND_API_URL.endsWith('/') ? BACKEND_API_URL : BACKEND_API_URL + '/');
}

function proxyApiRequest(req, res) {
  let url;
  try {
    url = backendUrl(req.url);
  } catch (err) {
    console.warn(`[api proxy] invalid FISH_BACKEND_URL: ${err.message}`);
    json(res, 502, { error: '后端代理配置无效' });
    return;
  }

  const transport = url.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: url.host };
  delete headers.connection;

  const proxyReq = transport.request(url, {
    method: req.method,
    timeout: BACKEND_TIMEOUT_MS,
    headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('timeout', () => proxyReq.destroy(new Error('backend request timeout')));
  proxyReq.on('error', (err) => {
    console.warn(`[api proxy] ${req.method} ${req.url} -> ${BACKEND_API_URL} failed: ${err.message}`);
    if (!res.headersSent) {
      return json(res, 502, { error: '后端服务暂时不可用' });
    }
    res.destroy(err);
  });

  req.pipe(proxyReq);
}

function getAssetVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC, 'version.json'), 'utf8')).version || 'dev';
  } catch (_) {
    return 'dev';
  }
}

function getVersionMtimeMs() {
  try {
    return fs.statSync(path.join(PUBLIC, 'version.json')).mtimeMs;
  } catch (_) {
    return 0;
  }
}

function withAssetVersion(pathname, data) {
  if (pathname !== '/index.html') return data;
  const version = encodeURIComponent(getAssetVersion());
  return Buffer.from(data.toString('utf8').replace(/__ASSET_VERSION__/g, version));
}

function staticHeaders(pathname, ext, versioned, mtime, data) {
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Last-Modified': mtime.toUTCString(),
    ETag: '"' + crypto.createHash('sha1').update(data).digest('hex') + '"',
  };

  if (pathname === '/index.html' || pathname === '/version.json') {
    headers['Cache-Control'] = 'no-cache';
  } else if (CACHEABLE_EXTS.has(ext)) {
    headers['Cache-Control'] = versioned
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }

  return headers;
}

function clientHasFreshCopy(req, headers) {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch.split(/\s*,\s*/).includes(headers.ETag)) return true;

  const ifModifiedSince = req.headers['if-modified-since'];
  if (!ifModifiedSince) return false;
  const since = Date.parse(ifModifiedSince);
  const modified = Date.parse(headers['Last-Modified']);
  return Number.isFinite(since) && Number.isFinite(modified) && modified <= since;
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch (_) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(PUBLIC, '.' + pathname);
  const rel = path.relative(PUBLIC, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    res.writeHead(403);
    return res.end();
  }

  fs.stat(file, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(file);
    fs.readFile(file, (err, raw) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }

      const data = withAssetVersion(pathname, raw);
      const mtimeMs = pathname === '/index.html' ? Math.max(stat.mtimeMs, getVersionMtimeMs()) : stat.mtimeMs;
      const headers = staticHeaders(pathname, ext, parsed.searchParams.has('v'), new Date(mtimeMs), data);
      if (clientHasFreshCopy(req, headers)) {
        res.writeHead(304, headers);
        return res.end();
      }

      res.writeHead(200, headers);
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxyApiRequest(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Fishing game frontend running at http://localhost:${PORT}`);
  console.log(`[api proxy] /api/* -> ${BACKEND_API_URL}`);
});
