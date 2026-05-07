const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const USERS_DIR = path.join(ROOT, 'data', 'users');

if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true });

const CODES_FILE = path.join(ROOT, 'data', 'codes.json');

function loadCodes() {
  if (!fs.existsSync(CODES_FILE)) {
    const defaults = {
      'WELCOME2024': { coins: 500, desc: '欢迎礼包', usedBy: [] },
      'FISHING666': { coins: 200, desc: '钓鱼大吉', usedBy: [] },
      'GOLDENROD': { coins: 1000, desc: '黄金鱼竿基金', usedBy: [] },
      'LUCKYDAY': { coins: 300, desc: '幸运日', usedBy: [] },
      'VIP888': { coins: 888, desc: 'VIP大礼', usedBy: [] },
    };
    fs.writeFileSync(CODES_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
}

function saveCodes(codes) {
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
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
    diamonds: 0,
    baits: { worm: 5 },
    currentBait: 'worm',
    dex: {}, // fishId -> { count, maxWeight }
    stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0 },
    history: [], // last 50 catches
    lastShareDate: '',
    rodSkin: '',
    dailyStats: { date: '', catches: 0, weight: 0 },
    ownedRods: [],
  };
}

function loadUser(name) {
  const p = userPath(name);
  if (!fs.existsSync(p)) {
    const u = defaultUser(name);
    fs.writeFileSync(p, JSON.stringify(u, null, 2));
    return u;
  }
  const existing = JSON.parse(fs.readFileSync(p, 'utf8'));
  const defaults = defaultUser(name);
  return {
    ...defaults,
    ...existing,
    money: Math.max(0, Math.floor(existing.money ?? defaults.money)),
    diamonds: Math.max(0, Math.floor(existing.diamonds ?? defaults.diamonds)),
    baits: { ...defaults.baits, ...(existing.baits || {}) },
    dex: existing.dex || defaults.dex,
    stats: { ...defaults.stats, ...(existing.stats || {}) },
    history: existing.history || defaults.history,
    dailyStats: existing.dailyStats || defaults.dailyStats,
    ownedRods: existing.ownedRods || defaults.ownedRods,
  };
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
          diamonds: Math.max(0, Math.floor(incoming.diamonds ?? existing.diamonds ?? 0)),
          baits: incoming.baits || existing.baits,
          currentBait: incoming.currentBait || existing.currentBait,
          dex: incoming.dex || existing.dex,
          stats: incoming.stats || existing.stats,
          history: (incoming.history || existing.history).slice(-50),
          lastShareDate: incoming.lastShareDate || existing.lastShareDate || '',
          rodSkin: incoming.rodSkin || existing.rodSkin || '',
          dailyStats: incoming.dailyStats || existing.dailyStats || { date: '', catches: 0, weight: 0 },
          ownedRods: incoming.ownedRods || existing.ownedRods || [],
        };
        saveUser(merged);
        return json(res, 200, merged);
      }
      if (req.url === '/api/gacha') {
        const count = body.count === 10 ? 10 : 1;
        const currency = body.currency === 'diamonds' ? 'diamonds' : 'coins';
        const cost = currency === 'diamonds'
          ? (count === 1 ? 10 : 90)
          : (count === 1 ? 1000 : 9000);
        const u = loadUser(name);
        u.diamonds = Math.max(0, Math.floor(u.diamonds || 0));
        if (currency === 'diamonds') {
          if (u.diamonds < cost) return json(res, 400, { error: '钻石不足' });
          u.diamonds -= cost;
        } else {
          if ((u.money || 0) < cost) return json(res, 400, { error: '金币不足' });
          u.money -= cost;
        }
        if (!u.ownedRods) u.ownedRods = [];
        const results = [];
        for (let i = 0; i < count; i++) {
          const roll = Math.random() * 100;
          if (currency === 'diamonds') {
            if (roll < 1) {
              results.push({ type: 'rod', id: 'firekirin' });
              if (!u.ownedRods.includes('firekirin')) u.ownedRods.push('firekirin');
            } else if (roll < 2) {
              results.push({ type: 'rod', id: 'greenxuanwu' });
              if (!u.ownedRods.includes('greenxuanwu')) u.ownedRods.push('greenxuanwu');
            } else if (roll < 10) {
              results.push({ type: 'diamonds', diamonds: 10 });
              u.diamonds += 10;
            } else {
              results.push({ type: 'coins', coins: 1000 });
              u.money += 1000;
            }
          } else if (roll < 10) {
            if (roll < 0.1) {
              results.push({ type: 'rod', id: 'nightmyst' });
              if (!u.ownedRods.includes('nightmyst')) u.ownedRods.push('nightmyst');
            } else if (roll < 1.1) {
              results.push({ type: 'rod', id: 'panda' });
              if (!u.ownedRods.includes('panda')) u.ownedRods.push('panda');
            } else {
              results.push({ type: 'coins', coins: 1000 });
              u.money += 1000;
            }
          } else {
            results.push({ type: 'coins', coins: 1 });
            u.money += 1;
          }
        }
        saveUser(u);
        return json(res, 200, { results, user: u });
      }
      if (req.url === '/api/redeem') {
        const code = String(body.code || '').trim().toUpperCase();
        if (!code) return json(res, 400, { error: '请输入兑换码' });
        const codes = loadCodes();
        const entry = codes[code];
        if (!entry) return json(res, 400, { error: '兑换码不存在' });
        if (entry.usedBy.includes(name)) return json(res, 400, { error: '你已经使用过这个兑换码了' });
        entry.usedBy.push(name);
        saveCodes(codes);
        const u = loadUser(name);
        u.money = (u.money || 0) + entry.coins;
        saveUser(u);
        return json(res, 200, { success: true, coins: entry.coins, desc: entry.desc, user: u });
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
