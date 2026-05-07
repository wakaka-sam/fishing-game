const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const USERS_DIR = path.join(ROOT, 'data', 'users');

if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sanitize(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 24);
}

function userPath(name) {
  return path.join(USERS_DIR, sanitize(name) + '.json');
}

function defaultUser(name) {
  return {
    username: name,
    money: 100,
    baits: { worm: 5 },
    currentBait: 'worm',
    dex: {}, // fishId -> { count, maxWeight }
    stats: { totalCatches: 0, totalEarned: 0 },
    history: [], // last 50 catches
    lastShareDate: '',
    rodSkin: '',
    dailyStats: { date: '', catches: 0, weight: 0 },
  };
}

function loadUser(name) {
  const p = userPath(name);
  if (!fs.existsSync(p)) {
    const u = defaultUser(name);
    fs.writeFileSync(p, JSON.stringify(u, null, 2));
    return u;
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveUser(user) {
  fs.writeFileSync(userPath(user.username), JSON.stringify(user, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; if (buf.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function getLeaderboard() {
  const today = new Date().toISOString().slice(0, 10);
  const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json'));
  const entries = [];
  for (const f of files) {
    try {
      const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf8'));
      const daily = (u.dailyStats && u.dailyStats.date === today) ? u.dailyStats : { catches: 0, weight: 0 };
      entries.push({
        username: u.username,
        todayCatches: daily.catches || 0,
        todayWeight: +(daily.weight || 0).toFixed(2),
        totalCatches: (u.stats && u.stats.totalCatches) || 0,
        totalWeight: +((u.stats && u.stats.totalWeight) || 0).toFixed(2),
      });
    } catch (_) {}
  }
  return entries;
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    try {
      if (req.url === '/api/leaderboard') {
        return json(res, 200, getLeaderboard());
      }

      const body = req.method === 'POST' ? await readBody(req) : {};
      const name = sanitize(body.username || '');
      if (!name) return json(res, 400, { error: '用户名无效' });

      if (req.url === '/api/login') {
        const user = loadUser(name);
        return json(res, 200, user);
      }
      if (req.url === '/api/save') {
        // 客户端发送整个 user state，做最小校验
        const existing = loadUser(name);
        const incoming = body.state || {};
        // 服务器是权威——但简化：信任客户端，仅做基本字段保护
        const merged = {
          ...existing,
          money: Math.max(0, Math.floor(incoming.money ?? existing.money)),
          baits: incoming.baits || existing.baits,
          currentBait: incoming.currentBait || existing.currentBait,
          dex: incoming.dex || existing.dex,
          stats: incoming.stats || existing.stats,
          history: (incoming.history || existing.history).slice(-50),
          lastShareDate: incoming.lastShareDate || existing.lastShareDate || '',
          rodSkin: incoming.rodSkin || existing.rodSkin || '',
          dailyStats: incoming.dailyStats || existing.dailyStats || { date: '', catches: 0, weight: 0 },
        };
        saveUser(merged);
        return json(res, 200, merged);
      }
      return json(res, 404, { error: 'unknown api' });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Fishing game running at http://localhost:${PORT}`);
});
