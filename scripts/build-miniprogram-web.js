#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const miniRoot = path.join(root, 'miniprogram');
const outDir = path.join(root, 'build/miniprogram-web');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function toWebCss(wxss) {
  return wxss
    .replace(/\/assets\//g, 'assets/')
    .replace(/(\d+(?:\.\d+)?)rpx/g, (_, value) => `${Number(value) / 2}px`)
    .replace(/\bpage\b/g, 'body');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  fs.writeFileSync(path.join(outDir, file), content, 'utf8');
}

function stableJson(value) {
  return JSON.stringify(value, (key, item) => (typeof item === 'function' ? undefined : item), 2);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyDir(path.join(miniRoot, 'assets'), path.join(outDir, 'assets'));

const gameData = require(path.join(miniRoot, 'utils/game-data'));
const versionData = require(path.join(miniRoot, 'utils/version'));
const codes = require(path.join(miniRoot, 'utils/codes'));
const css = toWebCss(read('miniprogram/pages/index/index.wxss'));

write('style.css', `${css}

html, body {
  margin: 0;
  min-height: 100%;
  background: #111827;
  font-family: "Courier New", "Microsoft YaHei", monospace;
}

body {
  display: flex;
  justify-content: center;
}

.mini-shell {
  width: min(430px, 100vw);
  min-height: 100vh;
  background: #0d1421;
  position: relative;
  overflow-x: hidden;
}

button, input, select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

.hidden {
  display: none !important;
}

.game-canvas {
  width: var(--canvas-width, 340px);
  height: var(--canvas-height, 191px);
}

.browser-note {
  position: fixed;
  right: 10px;
  bottom: 10px;
  z-index: 20;
  padding: 6px 8px;
  background: rgba(0, 0, 0, .7);
  border: 1px solid #ffd700;
  color: #ffd700;
  font-size: 12px;
}
`);

write('data-bundle.js', `window.MINIPROGRAM_DATA = ${stableJson({
  BAITS: gameData.BAITS,
  RARITY_COLOR: gameData.RARITY_COLOR,
  RARITY_NAME: gameData.RARITY_NAME,
  ROD_SKINS: gameData.ROD_SKINS,
  GACHA_RODS: gameData.GACHA_RODS,
  ALL_RODS: gameData.ALL_RODS,
  PETS: gameData.PETS,
  CHARACTERS: gameData.CHARACTERS,
  ACCESSORIES: gameData.ACCESSORIES,
  VERSION_DATA: versionData,
  CODES: codes,
})};\n`);

write('index.html', `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>像素钓鱼小程序浏览版</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="mini-shell">
    <section id="login-screen" class="login-screen">
      <div class="login-box">
        <img class="app-icon" src="assets/app-icon-144.png" alt="像素钓鱼" />
        <div class="login-title">像素钓鱼</div>
        <div class="login-copy">输入用户名开始游戏</div>
        <input id="username-input" class="login-input" maxlength="24" placeholder="用户名" />
        <button id="login-btn" class="primary login-btn">开始钓鱼</button>
        <div class="login-hint">浏览版模拟微信小程序界面和交互</div>
        <div id="login-error" class="error-msg"></div>
      </div>
    </section>

    <section id="game-screen" class="game-screen hidden">
      <div class="topbar">
        <div class="user-info">
          <span id="player-name" class="player-name">玩家</span>
          <span id="player-money" class="money">金币 0</span>
          <span id="player-diamonds" class="diamonds">钻石 0</span>
          <button id="version-tag" class="version-tag">v${versionData.version || 'dev'}</button>
        </div>
        <div id="actions" class="actions"></div>
      </div>

      <canvas id="game-canvas" class="game-canvas" width="340" height="191"></canvas>

      <div class="gamebar">
        <div id="sync-status" class="sync-status"></div>
        <div class="bait-info">
          <span>当前鱼饵</span>
          <select id="bait-select" class="picker-value"></select>
          <span id="bait-count" class="bait-count"></span>
        </div>
        <div id="rod-info" class="rod-info"></div>
        <button id="cast-btn" class="primary cast-btn">抛竿钓鱼</button>
        <div id="status" class="status">准备好后选择鱼饵抛竿</div>
      </div>

      <button id="mobile-action-btn" class="mobile-action-btn">抛竿</button>

      <div id="hitbar-overlay" class="hitbar-overlay hidden">
        <div class="hitbar-info">
          <div id="hitbar-msg" class="hitbar-msg">鱼上钩了！点击红色区域</div>
          <div id="hitbar-progress" class="hitbar-progress">0 / 0 命中</div>
          <div id="hitbar-timer" class="hitbar-timer">12.0s</div>
        </div>
        <div class="hitbar">
          <div id="hitbar-zone" class="hitbar-zone"></div>
          <div id="hitbar-cursor" class="hitbar-cursor"></div>
        </div>
        <button id="hit-btn" class="primary big">击 中</button>
      </div>

      <div id="overlay" class="overlay hidden">
        <div id="modal" class="modal wide">
          <button id="close-modal" class="close-x">×</button>
          <div id="modal-content"></div>
        </div>
      </div>
    </section>
  </main>
  <div class="browser-note">小程序浏览版</div>
  <script src="data-bundle.js"></script>
  <script src="preview.js"></script>
</body>
</html>
`);

write('preview.js', `(function () {
  const DATA = window.MINIPROGRAM_DATA;
  const API_BASE = 'https://fish.wakaka007.cn';
  const $ = (id) => document.getElementById(id);
  const LS_USER = 'fishing-mini-web-user:';
  const LS_NAME = 'fishing-mini-web-username';
  const menuButtons = [
    ['shop', '商店'], ['dex', '图鉴'], ['rod', '鱼竿'], ['character', '角色'],
    ['accessory', '首饰'], ['pet', '宠物'], ['rank', '排行'], ['gacha', '抽奖'],
    ['redeem', '兑换'], ['share', '分享'],
  ];
  let user = null;
  let phase = 'idle';
  let biteTimer = null;
  let hitTimer = null;
  let renderTimer = null;
  let hooked = null;
  let hb = null;
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  function safeName(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  }

  function request(path, data, method = 'POST') {
    return fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(data || {}),
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
      return body;
    });
  }

  function defaultUser(name) {
    return {
      username: name,
      vip: false,
      money: 100,
      diamonds: 0,
      baits: { worm: 5, black_silk: 0, divine: 0, jb: 0 },
      currentBait: 'worm',
      dex: {},
      stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0, totalWeight: 0 },
      history: [],
      dailyStats: { date: '', catches: 0, weight: 0 },
      rodSkin: '',
      ownedRods: [],
      ownedPets: [],
      activePet: null,
      ownedCharacters: ['fishing_master'],
      activeCharacter: 'fishing_master',
      characterFragments: {},
      accessories: [],
      equippedAccessory: null,
    };
  }

  function mergeUser(name, source) {
    const base = defaultUser(name);
    source = source || {};
    return {
      ...base,
      ...source,
      username: name,
      baits: { ...base.baits, ...(source.baits || {}) },
      stats: { ...base.stats, ...(source.stats || {}) },
      dailyStats: source.dailyStats || base.dailyStats,
      ownedRods: source.ownedRods || [],
      ownedPets: source.ownedPets || [],
      ownedCharacters: Array.isArray(source.ownedCharacters) ? source.ownedCharacters : base.ownedCharacters,
      characterFragments: source.characterFragments || {},
      accessories: Array.isArray(source.accessories) ? source.accessories : [],
    };
  }

  function saveLocal() {
    if (!user) return;
    localStorage.setItem(LS_NAME, user.username);
    localStorage.setItem(LS_USER + user.username, JSON.stringify(user));
  }

  let saveTimer = null;
  function saveRemote() {
    saveLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      request('/api/save', { username: user.username, state: user })
        .then((saved) => {
          user = mergeUser(user.username, saved);
          saveLocal();
          $('sync-status').textContent = '已同步';
          refresh();
        })
        .catch(() => { $('sync-status').textContent = '本地已保存，稍后同步'; });
    }, 450);
  }

  function todayCN() {
    return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  }

  async function login() {
    const name = safeName($('username-input').value);
    if (!name) {
      $('login-error').textContent = '请输入有效用户名';
      return;
    }
    let source = null;
    try {
      source = await request('/api/session/login', { username: name });
      $('sync-status').textContent = '已连接线上存档';
    } catch (_) {
      const raw = localStorage.getItem(LS_USER + name);
      source = raw ? JSON.parse(raw) : null;
      $('sync-status').textContent = '离线浏览，本地存档';
    }
    user = mergeUser(name, source);
    saveLocal();
    $('login-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    refresh();
    startRender();
  }

  function refresh() {
    if (!user) return;
    $('player-name').textContent = user.username;
    $('player-money').textContent = '金币 ' + Math.floor(user.money || 0);
    $('player-diamonds').textContent = '钻石 ' + Math.floor(user.diamonds || 0);
    const select = $('bait-select');
    select.innerHTML = '';
    Object.keys(DATA.BAITS).forEach((id) => {
      const bait = DATA.BAITS[id];
      const option = document.createElement('option');
      option.value = id;
      option.textContent = bait.name;
      if (id === user.currentBait) option.selected = true;
      select.appendChild(option);
    });
    const bait = DATA.BAITS[user.currentBait] || DATA.BAITS.worm;
    $('bait-count').textContent = '剩余 ' + (user.baits[user.currentBait] || 0);
    $('cast-btn').disabled = phase !== 'idle' || (user.baits[user.currentBait] || 0) <= 0;
    $('rod-info').textContent = '当前鱼竿：' + getRodName();
    if (phase === 'idle') $('status').textContent = '准备好后选择鱼饵抛竿';
    if (phase === 'waiting') $('status').textContent = '已抛竿，等待鱼上钩...';
    if (phase === 'hooked') $('status').textContent = '鱼上钩了，点击命中区域';
  }

  function getRodName() {
    const owned = user.ownedRods || [];
    const rod = DATA.ALL_RODS.find((item) => item.id === user.rodSkin)
      || DATA.ALL_RODS.find((item) => owned.includes(item.id))
      || DATA.ALL_RODS[0];
    return rod ? rod.name : '新手竿';
  }

  function startCast() {
    if (!user || phase !== 'idle') return;
    const baitId = user.currentBait || 'worm';
    if ((user.baits[baitId] || 0) <= 0) return;
    user.baits[baitId] -= 1;
    phase = 'waiting';
    refresh();
    saveRemote();
    clearTimeout(biteTimer);
    biteTimer = setTimeout(() => startHitbar(rollCatch(baitId)), 900 + Math.random() * 1300);
  }

  function rollCatch(baitId) {
    const bait = DATA.BAITS[baitId] || DATA.BAITS.worm;
    const fishes = bait.fishes || [];
    const roll = Math.random();
    if (roll < 0.14) return { kind: 'trash', item: { name: '破靴子', icon: '🥾', rarity: 'trash' }, value: 0, weight: 0 };
    if (roll < 0.17) return { kind: 'treasure', item: { name: '金币宝箱', icon: '💰', rarity: 'treasure' }, value: 120, weight: 0 };
    const fish = fishes[Math.floor(Math.random() * fishes.length)] || { id: 'fish', name: '小鱼', icon: '🐟', rarity: 'common', minW: 0.1, maxW: 1, price: 10 };
    const weight = +(fish.minW + Math.random() * ((fish.maxW || 1) - (fish.minW || 0.1))).toFixed(2);
    return { kind: 'fish', item: fish, weight, value: Math.round(weight * (fish.price || 10)) };
  }

  function startHitbar(catchResult) {
    hooked = catchResult;
    phase = 'hooked';
    hb = {
      hits: 0,
      needed: Math.max(1, ({ common: 1, rare: 2, legendary: 3, hidden: 4, limited: 3 }[catchResult.item.rarity] || 1)),
      cursor: 0,
      dir: 1,
      zone: 35 + Math.random() * 25,
      width: 18,
      time: 12,
    };
    $('hitbar-overlay').classList.remove('hidden');
    $('hitbar-msg').textContent = (DATA.RARITY_NAME[catchResult.item.rarity] || '目标') + '上钩了！';
    $('hitbar-msg').style.color = DATA.RARITY_COLOR[catchResult.item.rarity] || '#ffae42';
    clearInterval(hitTimer);
    hitTimer = setInterval(tickHitbar, 50);
    refresh();
  }

  function tickHitbar() {
    if (!hb) return;
    hb.cursor += hb.dir * 1.8;
    if (hb.cursor >= 100 || hb.cursor <= 0) hb.dir *= -1;
    hb.cursor = Math.max(0, Math.min(100, hb.cursor));
    hb.time -= 0.05;
    $('hitbar-zone').style.left = hb.zone + '%';
    $('hitbar-zone').style.width = hb.width + '%';
    $('hitbar-cursor').style.left = hb.cursor + '%';
    $('hitbar-progress').textContent = hb.hits + ' / ' + hb.needed + ' 命中';
    $('hitbar-timer').textContent = Math.max(0, hb.time).toFixed(1) + 's';
    if (hb.time <= 0) finishCatch(false);
  }

  function hitbarTap() {
    if (!hb) return;
    if (hb.cursor >= hb.zone && hb.cursor <= hb.zone + hb.width) {
      hb.hits += 1;
      if (hb.hits >= hb.needed) finishCatch(true);
    } else {
      hb.hits = 0;
    }
  }

  function finishCatch(success) {
    clearInterval(hitTimer);
    $('hitbar-overlay').classList.add('hidden');
    if (!success) {
      phase = 'idle';
      openResult({ miss: true, title: '鱼跑了', icon: '💨', lines: ['下次再试试手感'] });
      refresh();
      return;
    }
    const c = hooked;
    if (c.kind === 'fish') {
      user.money += c.value;
      user.stats.totalCatches = (user.stats.totalCatches || 0) + 1;
      user.stats.totalEarned = (user.stats.totalEarned || 0) + c.value;
      user.stats.totalWeight = (user.stats.totalWeight || 0) + c.weight;
      const day = todayCN();
      if (!user.dailyStats || user.dailyStats.date !== day) user.dailyStats = { date: day, catches: 0, weight: 0 };
      user.dailyStats.catches += 1;
      user.dailyStats.weight += c.weight;
      const dex = user.dex[c.item.id] || { count: 0, maxWeight: 0 };
      dex.count += 1;
      dex.maxWeight = Math.max(dex.maxWeight || 0, c.weight);
      user.dex[c.item.id] = dex;
      openResult({ title: c.item.name, icon: c.item.icon, color: DATA.RARITY_COLOR[c.item.rarity], lines: [c.weight + ' kg', '+' + c.value + ' 金币'] });
    } else if (c.kind === 'treasure') {
      user.money += c.value;
      openResult({ title: c.item.name, icon: c.item.icon, lines: ['+' + c.value + ' 金币'] });
    } else {
      openResult({ title: c.item.name, icon: c.item.icon, lines: ['没有收益'] });
    }
    phase = 'idle';
    saveRemote();
    refresh();
  }

  function openResult(result) {
    openModal('<div class="result-fish ' + (result.miss ? 'miss' : '') + '">' +
      '<div class="result-icon">' + result.icon + '</div>' +
      '<div class="result-name" style="color:' + (result.color || '#ffd700') + '">' + result.title + '</div>' +
      (result.lines || []).map((line) => '<div class="result-line">' + line + '</div>').join('') +
      '<button class="result-bottom-close" data-close="1">关闭</button>' +
      '</div>');
  }

  function openModal(html) {
    $('modal-content').innerHTML = html;
    $('overlay').classList.remove('hidden');
  }

  function closeModal() {
    $('overlay').classList.add('hidden');
    $('modal-content').innerHTML = '';
  }

  function openMenu(menu) {
    if (menu === 'shop') return openShop();
    if (menu === 'dex') return openDex();
    if (menu === 'rank') return openRank();
    if (menu === 'redeem') return openRedeem();
    if (menu === 'share') return openShare();
    if (menu === 'announce') return openAnnouncement();
    openModal('<div class="modal-title">' + menuButtons.find((m) => m[0] === menu)[1] + '</div><div class="rank-reward-banner">浏览版预览中，完整功能请在微信开发者工具或小程序内体验。</div>');
  }

  function openShop() {
    const items = Object.keys(DATA.BAITS).map((id) => {
      const bait = DATA.BAITS[id];
      return '<div class="shop-item"><div class="shop-head" style="color:' + bait.color + '">' + bait.name + '</div><div class="desc">' + bait.desc + '</div><div class="row"><span>' + (bait.price || 0) + ' 金币 / 个</span><span>已有 ' + (user.baits[id] || 0) + '</span></div><div class="row"><button data-buy="' + id + '" data-n="1">买 ×1</button><button data-buy="' + id + '" data-n="10">买 ×10</button></div></div>';
    }).join('');
    openModal('<div class="modal-title">鱼饵商店</div><div class="shop-list">' + items + '</div>');
  }

  function openDex() {
    const baitId = user.currentBait || 'worm';
    const fishes = (DATA.BAITS[baitId] && DATA.BAITS[baitId].fishes) || [];
    const html = fishes.map((fish) => {
      const unlocked = !!user.dex[fish.id];
      return '<div class="dex-item ' + (unlocked ? 'unlocked' : 'locked') + '" style="border-color:' + (DATA.RARITY_COLOR[fish.rarity] || '#555') + '"><div class="dex-icon">' + (unlocked ? fish.icon : '❓') + '</div><div class="dex-name">' + (unlocked ? fish.name : '未发现') + '</div><div class="dex-info">' + (DATA.RARITY_NAME[fish.rarity] || fish.rarity) + '</div></div>';
    }).join('');
    openModal('<div class="modal-title">钓鱼图鉴</div><div class="dex-list">' + html + '</div>');
  }

  function openRank() {
    openModal('<div class="modal-title">排行榜</div><div class="rank-list"><div class="rank-row"><span>今日钓鱼数</span><span>' + ((user.dailyStats && user.dailyStats.catches) || 0) + ' 次</span></div><div class="rank-row"><span>累计钓鱼数</span><span>' + (user.stats.totalCatches || 0) + ' 次</span></div><div class="rank-row"><span>累计总重量</span><span>' + (user.stats.totalWeight || 0).toFixed(2) + ' kg</span></div></div>');
  }

  function openRedeem() {
    openModal('<div class="modal-title">兑换码</div><div class="redeem-content"><input id="redeem-input" class="redeem-input" placeholder="输入兑换码" /><button id="redeem-submit" class="primary">兑换</button><div id="redeem-status" class="redeem-status"></div></div>');
    setTimeout(() => $('redeem-input') && $('redeem-input').focus(), 0);
  }

  function redeem() {
    const input = $('redeem-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    request('/api/redeem/claim', { username: user.username, code }).then((data) => {
      Object.assign(user, data.patch || data.user || {});
      saveLocal();
      refresh();
      $('redeem-status').textContent = '兑换成功！';
      $('redeem-status').className = 'redeem-status success';
    }).catch((err) => {
      $('redeem-status').textContent = err.message || '兑换失败';
      $('redeem-status').className = 'redeem-status error';
    });
  }

  function openShare() {
    openModal('<div class="modal-title">分享</div><div class="share-content"><div>分享给好友，每日首次分享可获得 10 金币。</div><img class="share-qr" src="assets/group_qr_code.jpg" alt="群二维码" /></div>');
  }

  function openAnnouncement() {
    const entries = (DATA.VERSION_DATA.changelog || []).slice(0, 8).map((entry) =>
      '<div class="announce-entry"><div class="announce-version">v' + entry.version + ' <span>' + entry.date + '</span></div>' +
      (entry.changes || []).map((change) => '<div class="announce-line">• ' + change + '</div>').join('') + '</div>'
    ).join('');
    openModal('<div class="modal-title">更新公告</div><div class="announce-content">' + entries + '</div>');
  }

  function buyBait(id, n) {
    const bait = DATA.BAITS[id];
    const cost = (bait.price || 0) * n;
    if (user.money < cost) return;
    user.money -= cost;
    user.baits[id] = (user.baits[id] || 0) + n;
    saveRemote();
    refresh();
    openShop();
  }

  function draw() {
    const t = Date.now() / 1000;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87ceeb');
    sky.addColorStop(.48, '#87ceeb');
    sky.addColorStop(.49, '#2f9fd0');
    sky.addColorStop(1, '#1d5f9f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8d86a';
    ctx.fillRect(16, 18, 26, 26);
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, H * .48, W, 12);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(42, H * .48 - 4, 70, 12);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * .48, H * .45);
    ctx.lineTo(W * .70, H * .58 + Math.sin(t * 2) * 3);
    ctx.stroke();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * .70, H * .58 + Math.sin(t * 2) * 3);
    ctx.lineTo(W * .70, H * .83);
    ctx.stroke();
    ctx.fillStyle = '#263238';
    ctx.fillRect(W * .40, H * .39, 18, 32);
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(W * .40 + 3, H * .32, 13, 13);
    ctx.fillStyle = '#1976d2';
    ctx.fillRect(W * .37, H * .49, 32, 10);
    if (phase === 'waiting' || phase === 'hooked') {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(W * .68, H * .82 + Math.sin(t * 8) * 4, 6, 6);
    }
  }

  function startRender() {
    cancelAnimationFrame(renderTimer);
    function loop() {
      draw();
      renderTimer = requestAnimationFrame(loop);
    }
    loop();
  }

  function setup() {
    $('actions').innerHTML = menuButtons.map(([key, label]) => '<button class="tool-btn" data-menu="' + key + '">' + label + '</button>').join('') + '<button class="tool-btn logout" data-logout="1">退出</button>';
    $('login-btn').onclick = login;
    $('username-input').onkeydown = (event) => { if (event.key === 'Enter') login(); };
    $('bait-select').onchange = () => { user.currentBait = $('bait-select').value; saveRemote(); refresh(); };
    $('cast-btn').onclick = startCast;
    $('mobile-action-btn').onclick = () => phase === 'hooked' ? hitbarTap() : startCast();
    $('hit-btn').onclick = hitbarTap;
    $('close-modal').onclick = closeModal;
    $('version-tag').onclick = openAnnouncement;
    $('actions').onclick = (event) => {
      const btn = event.target.closest('button');
      if (!btn) return;
      if (btn.dataset.logout) {
        user = null;
        localStorage.removeItem(LS_NAME);
        $('game-screen').classList.add('hidden');
        $('login-screen').classList.remove('hidden');
        return;
      }
      if (btn.dataset.menu) openMenu(btn.dataset.menu);
    };
    $('modal-content').onclick = (event) => {
      const buy = event.target.closest('[data-buy]');
      if (buy) buyBait(buy.dataset.buy, Number(buy.dataset.n || 1));
      if (event.target.closest('[data-close]')) closeModal();
      if (event.target.id === 'redeem-submit') redeem();
    };
    const saved = localStorage.getItem(LS_NAME);
    if (saved) $('username-input').value = saved;
    draw();
  }

  setup();
}());
`);

write('README.md', `# 微信小程序浏览版

这个目录由 \`npm run build:miniprogram-web\` 生成，用于在浏览器中快速预览微信小程序版界面。

## 运行

\`\`\`bash
npm run serve:miniprogram-web
\`\`\`

访问 <http://localhost:4173>。

说明：这是浏览器预览版，不等同于微信运行时。正式小程序请导入 \`miniprogram/\`。
`);

console.log(`Miniprogram web preview generated: ${path.relative(root, outDir)}`);
