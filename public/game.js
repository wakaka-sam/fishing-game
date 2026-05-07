if (!window.GAME_DATA) {
  document.body.innerHTML = '<div style="color:#ff5722;padding:40px;font-family:monospace;font-size:16px">' +
    '错误：data.js 未加载。<br>请通过 <b>http://localhost:3456</b> 访问，而不是直接打开 HTML 文件。' +
    '</div>';
  throw new Error('GAME_DATA missing');
}
// HITS_BY_RARITY / RARITY_COLOR / RARITY_NAME / BAITS / rollCatch 由 data.js 顶层声明，已在脚本作用域可见

// ====== 状态 ======
let user = null;
const state = {
  phase: 'idle', // idle | casting | waiting | hooked | reeling
  castStart: 0,
  biteAt: 0,
  rodAngle: 0,
  castBait: null,
};

// ====== DOM ======
const $ = (id) => document.getElementById(id);
const loginScreen = $('login-screen');
const gameScreen = $('game-screen');
const usernameInput = $('username-input');
const playerNameEl = $('player-name');
const playerMoneyEl = $('player-money');
const playerDiamondsEl = $('player-diamonds');
const baitSelect = $('bait-select');
const baitCountEl = $('bait-count');
const castBtn = $('cast-btn');
const statusEl = $('status');

const DIAMOND_JACKPOT_CHANCE = 0.01;
const BLACK_SILK_BAIT_ID = 'black_silk';
const BLACK_SILK_BAIT_DROP_CHANCE = 0.10;
const BLACK_SILK_ROD_ID = 'black_silk_rod';

// ====== 登录 ======
$('login-btn').onclick = login;
usernameInput.onkeydown = (e) => { if (e.key === 'Enter') login(); };

async function login() {
  const errEl = $('login-error');
  errEl.textContent = '';
  const name = usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  if (!name) { errEl.textContent = '请输入有效用户名（字母数字下划线）'; return; }
  if (location.protocol === 'file:') {
    errEl.innerHTML = '检测到 file:// 协议。<br>请通过 <b>http://localhost:3456</b> 访问';
    return;
  }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    user = await res.json();
    try { localStorage.setItem('fishing_username', name); } catch (_) {}
    enterGame();
  } catch (e) {
    errEl.textContent = '登录失败: ' + e.message + '（请确认服务器已启动）';
    console.error(e);
  }
}

$('logout-btn').onclick = () => {
  user = null;
  try { localStorage.removeItem('fishing_username'); } catch (_) {}
  loginScreen.classList.add('active');
  gameScreen.classList.remove('active');
};

// 自动登录
(async () => {
  try {
    const saved = localStorage.getItem('fishing_username');
    if (saved && location.protocol !== 'file:') {
      usernameInput.value = saved;
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: saved }),
      });
      if (res.ok) {
        user = await res.json();
        enterGame();
      }
    }
  } catch (_) {}
})();

async function saveUser() {
  if (!user) return;
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, state: user }),
    });
    user = await res.json();
    ensureUserDefaults();
  } catch (e) { console.warn('save failed', e); }
}

function enterGame() {
  ensureUserDefaults();
  loginScreen.classList.remove('active');
  gameScreen.classList.add('active');
  refreshUI();
}

function ensureUserDefaults() {
  if (!user) return;
  user.money = Math.max(0, Math.floor(user.money || 0));
  user.diamonds = Math.max(0, Math.floor(user.diamonds || 0));
  user.baits = user.baits || {};
  user.baits.worm = Math.max(0, Math.floor(user.baits.worm || 0));
  user.baits[BLACK_SILK_BAIT_ID] = Math.max(0, Math.floor(user.baits[BLACK_SILK_BAIT_ID] || 0));
  user.dex = user.dex || {};
  user.stats = user.stats || {};
  user.history = user.history || [];
  user.ownedRods = user.ownedRods || [];
  unlockBlackSilkRodIfComplete();
}

function refreshUI() {
  playerNameEl.textContent = user.username;
  playerMoneyEl.textContent = '💰 ' + user.money;
  playerDiamondsEl.textContent = '💎 ' + user.diamonds;
  if (typeof updateRodInfo === 'function') updateRodInfo();
  if (typeof updateMobileBtn === 'function') updateMobileBtn();
  // 鱼饵下拉
  baitSelect.innerHTML = '';
  for (const id of Object.keys(BAITS)) {
    const owned = user.baits[id] || 0;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${BAITS[id].name} (×${owned})`;
    if (owned <= 0) opt.disabled = true;
    baitSelect.appendChild(opt);
  }
  const selectedBait = state.castBait || user.currentBait;
  if (state.castBait || user.baits[selectedBait] > 0) {
    baitSelect.value = selectedBait;
  } else {
    const avail = Object.keys(user.baits).find((k) => user.baits[k] > 0);
    if (avail) { user.currentBait = avail; baitSelect.value = avail; }
  }
  updateBaitCount();
}

function updateBaitCount() {
  const id = baitSelect.value;
  const n = user.baits[id] || 0;
  baitCountEl.textContent = n > 0 ? `剩余 ${n} 个` : '没有鱼饵';
  castBtn.disabled = !(n > 0 && state.phase === 'idle');
  baitSelect.disabled = state.phase !== 'idle';
}

baitSelect.onchange = () => {
  user.currentBait = baitSelect.value;
  updateBaitCount();
  saveUser();
};

// ====== 画布渲染（第一视角） ======
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w, h);
}

let hookX = W / 2;
let hookY = H * 0.55;
let lineSlack = 0;

function render() {
  const t = Date.now() / 1000;

  // 天空渐变
  const skyH = H * 0.4;
  for (let i = 0; i < skyH; i += 4) {
    const r = 135 + (255 - 135) * (i / skyH) * 0.1;
    const g = 206 + (200 - 206) * (i / skyH) * 0.1;
    const b = 235 - (235 - 180) * (i / skyH) * 0.3;
    px(0, i, W, 4, `rgb(${r|0},${g|0},${b|0})`);
  }

  // 远山
  ctx.fillStyle = '#3d5a73';
  ctx.beginPath();
  ctx.moveTo(0, skyH);
  for (let x = 0; x <= W; x += 20) {
    const h = 30 + Math.sin(x * 0.02) * 15 + Math.sin(x * 0.05) * 8;
    ctx.lineTo(x, skyH - h);
  }
  ctx.lineTo(W, skyH);
  ctx.fill();

  // 水面
  px(0, skyH, W, H - skyH, '#1e6091');
  // 波纹
  for (let y = skyH; y < H; y += 6) {
    const wave = Math.sin(t * 2 + y * 0.1) * 2;
    const shade = 30 + (y - skyH) / (H - skyH) * 60;
    px(0, y + wave, W, 2, `rgb(${20+shade*0.3|0},${60+shade*0.5|0},${120+shade*0.4|0})`);
  }
  // 高光
  for (let i = 0; i < 30; i++) {
    const x = (i * 47 + t * 30) % W;
    const y = skyH + ((i * 31) % (H - skyH));
    px(x, y, 3, 1, 'rgba(255,255,255,0.5)');
  }

  // 太阳
  px(W - 80, 40, 24, 24, '#ffeb3b');
  px(W - 84, 48, 32, 8, '#ffeb3b');
  px(W - 80, 36, 24, 4, '#ffeb3b');

  // 钓竿（第一视角，从右下伸出）— 使用当前鱼竿皮肤
  const rodSkin = user ? GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods) : GAME_DATA.ROD_SKINS[0];
  const rodTipX = W * 0.45 + Math.sin(t * 1.5) * 4;
  const rodTipY = H * 0.35;
  const rodBaseX = W * 0.95;
  const rodBaseY = H + 10;
  // 暗夜竿特效：发光光晕
  if (rodSkin.fx === 'night') {
    ctx.save();
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 12 + Math.sin(t * 3) * 6;
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(rodBaseX, rodBaseY);
    ctx.lineTo(rodTipX, rodTipY);
    ctx.stroke();
    ctx.restore();
    // 粒子特效
    for (let i = 0; i < 6; i++) {
      const frac = (i + t * 0.5) % 1;
      const px2 = rodBaseX + (rodTipX - rodBaseX) * frac;
      const py2 = rodBaseY + (rodTipY - rodBaseY) * frac + Math.sin(t * 4 + i * 2) * 4;
      const alpha = 0.4 + Math.sin(t * 5 + i) * 0.3;
      px(px2 - 2, py2 - 2, 4, 4, `rgba(139,92,246,${alpha})`);
    }
  }
  ctx.strokeStyle = rodSkin.rodColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(rodBaseX, rodBaseY);
  ctx.lineTo(rodTipX, rodTipY);
  ctx.stroke();
  ctx.strokeStyle = rodSkin.rodHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodBaseX, rodBaseY);
  ctx.lineTo(rodTipX, rodTipY);
  ctx.stroke();

  // 钓鱼线
  if (state.phase !== 'idle' || hookY > rodTipY + 10) {
    ctx.strokeStyle = rodSkin.lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rodTipX, rodTipY);
    // 线弯曲
    const midX = (rodTipX + hookX) / 2;
    const midY = (rodTipY + hookY) / 2 + 10 + Math.sin(t * 3) * 2;
    ctx.quadraticCurveTo(midX, midY, hookX, hookY);
    ctx.stroke();

    // 浮标
    const bobX = hookX;
    const bobY = hookY + Math.sin(t * 4) * (state.phase === 'hooked' ? 5 : 1);
    px(bobX - 4, bobY - 8, 8, 8, '#ff5722');
    px(bobX - 2, bobY - 8, 4, 4, '#fff');
    px(bobX - 1, bobY, 2, 6, '#3e2723');
  }

  // 第一视角的手（角落）
  px(W * 0.78, H - 30, 30, 30, '#fdbcb4');
  px(W * 0.78, H - 30, 30, 6, '#d99086');
  px(W * 0.85, H - 24, 18, 18, '#fdbcb4');

  // 状态消息
  if (state.phase === 'waiting') {
    drawText('等待鱼上钩...', W / 2, H - 24, '#fff', 12);
  } else if (state.phase === 'hooked') {
    drawText('!!! 鱼上钩了 !!!', W / 2, H - 24, '#ff5722', 16);
  }
}

function drawText(txt, x, y, color, size) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 100, y - size, 200, size + 4);
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px "Courier New"`;
  ctx.textAlign = 'center';
  ctx.fillText(txt, x, y);
}

function loop() {
  if (user) render();
  requestAnimationFrame(loop);
}
loop();

// ====== 钓鱼流程 ======
let waitTimer = null;

castBtn.onclick = startCast;

function startCast() {
  if (state.phase !== 'idle') return;
  const baitId = baitSelect.value || user.currentBait;
  if (!user.baits[baitId] || user.baits[baitId] <= 0) {
    alert('没有鱼饵了，去商店买点吧！');
    return;
  }
  user.currentBait = baitId;
  state.castBait = baitId;
  // 消耗鱼饵
  user.baits[baitId]--;
  state.phase = 'waiting';
  hookX = W / 2 + (Math.random() - 0.5) * 100;
  hookY = H * 0.55 + Math.random() * 30;
  statusEl.textContent = '已抛竿，等待鱼上钩...';
  refreshUI();
  saveUser();

  // 随机 2-7 秒后上钩
  const wait = 2000 + Math.random() * 5000;
  waitTimer = setTimeout(() => {
    state.phase = 'hooked';
    statusEl.textContent = '鱼上钩了！点击响应';
    if (typeof updateMobileBtn === 'function') updateMobileBtn();
    // 玩家有 3 秒响应时间，否则跑掉
    waitTimer = setTimeout(() => {
      state.phase = 'idle';
      state.castBait = null;
      statusEl.textContent = '反应太慢，鱼跑了 😢';
      refreshUI();
    }, 3000);
  }, wait);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.phase === 'idle') {
      startCast();
    } else if (state.phase === 'hooked') {
      startHitbar();
    } else if (state.phase === 'reeling') {
      hitbarClick();
    }
  }
});
canvas.addEventListener('click', () => {
  if (state.phase === 'hooked') startHitbar();
});

// ====== 命中条小游戏 ======
const hitbarOverlay = $('hitbar-overlay');
const hitbarZoneEl = $('hitbar-zone');
const hitbarCursorEl = $('hitbar-cursor');
const hitsCurrentEl = $('hits-current');
const hitsNeededEl = $('hits-needed');
const hitbarMsg = $('hitbar-msg');
const hitbarTimer = $('hitbar-timer');
const hitBtn = $('hit-btn');

const hb = {
  catch: null,
  hitsNeeded: 0,
  hits: 0,
  cursorPos: 0,
  cursorDir: 1,
  cursorSpeed: 0,
  zoneStart: 0,
  zoneWidth: 0,
  timeLeft: 0,
  timerId: null,
  rafId: null,
  active: false,
};

function startHitbar() {
  if (state.phase !== 'hooked') return;
  if (waitTimer) clearTimeout(waitTimer);
  state.phase = 'reeling';

  // 提前 roll 出钓获结果
  const result = rollCatch(state.castBait || user.currentBait);
  hb.catch = result;
  const rarity = result.kind === 'fish' ? result.item.rarity : result.kind;
  hb.hitsNeeded = HITS_BY_RARITY[rarity] || 2;
  hb.hits = 0;
  hb.cursorPos = 0;
  hb.cursorDir = 1;

  // 难度参数：稀有度越高，光标越快、红区越窄
  const difficulty = {
    trash: { speed: 0.6, zone: 0.25 },
    common: { speed: 0.8, zone: 0.22 },
    rare: { speed: 1.1, zone: 0.18 },
    legendary: { speed: 1.5, zone: 0.13 },
    hidden: { speed: 1.9, zone: 0.10 },
    treasure: { speed: 1.2, zone: 0.16 },
    limited: { speed: 1.3, zone: 0.16 },
  }[rarity];
  hb.cursorSpeed = difficulty.speed;
  hb.zoneWidth = difficulty.zone;
  hb.timeLeft = 12;

  hitbarMsg.textContent = `${RARITY_NAME[rarity]}级鱼上钩了！连续命中红区 ${hb.hitsNeeded} 次！`;
  hitbarMsg.style.color = RARITY_COLOR[rarity];
  hitsNeededEl.textContent = hb.hitsNeeded;
  hitsCurrentEl.textContent = 0;
  hitbarOverlay.classList.remove('hidden');
  hb.active = true;
  randomizeZone();
  hb.timerId = setInterval(tickTimer, 100);
  rafLoop();
}

function randomizeZone() {
  hb.zoneStart = Math.random() * (1 - hb.zoneWidth);
}

function tickTimer() {
  hb.timeLeft -= 0.1;
  hitbarTimer.textContent = hb.timeLeft.toFixed(1) + 's';
  if (hb.timeLeft <= 0) endHitbar(false, '时间到，鱼跑了');
}

function rafLoop() {
  if (!hb.active) return;
  hb.cursorPos += hb.cursorDir * hb.cursorSpeed * 0.012;
  if (hb.cursorPos >= 1) { hb.cursorPos = 1; hb.cursorDir = -1; }
  if (hb.cursorPos <= 0) { hb.cursorPos = 0; hb.cursorDir = 1; }

  const barW = hitbarZoneEl.parentElement.offsetWidth;
  hitbarZoneEl.style.left = (hb.zoneStart * barW) + 'px';
  hitbarZoneEl.style.width = (hb.zoneWidth * barW) + 'px';
  hitbarCursorEl.style.left = (hb.cursorPos * barW) + 'px';
  hb.rafId = requestAnimationFrame(rafLoop);
}

hitBtn.addEventListener('mousedown', (e) => { e.preventDefault(); hitbarClick(); });
hitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); hitbarClick(); }, { passive: false });

function hitbarClick() {
  if (!hb.active) return;
  const inZone = hb.cursorPos >= hb.zoneStart && hb.cursorPos <= hb.zoneStart + hb.zoneWidth;
  if (inZone) {
    hb.hits++;
    hitsCurrentEl.textContent = hb.hits;
    if (hb.hits >= hb.hitsNeeded) {
      endHitbar(true);
    } else {
      randomizeZone();
      // 命中后稍微加速
      hb.cursorSpeed *= 1.05;
    }
  } else {
    // 未中：连续计数清零
    hb.hits = 0;
    hitsCurrentEl.textContent = 0;
    hitbarMsg.textContent = '没中！计数清零，再试';
    randomizeZone();
  }
}

function endHitbar(success, failMsg) {
  hb.active = false;
  if (hb.timerId) clearInterval(hb.timerId);
  if (hb.rafId) cancelAnimationFrame(hb.rafId);
  hitbarOverlay.classList.add('hidden');
  state.phase = 'idle';
  state.castBait = null;

  if (success) {
    applyCatch(hb.catch);
    showResult(hb.catch);
    playCatchRodEffect();
  } else {
    showMiss(failMsg || '操作失败，鱼跑了');
  }
  hb.catch = null;
}

// ====== 应用钓获 ======
function applyCatch(c) {
  const bonusDiamonds = rollDiamondReward();
  const saleDiamonds = c.diamondValue || 0;
  const blackSilkBaitDrop = rollBlackSilkBaitDrop();
  user.money += c.value;
  user.diamonds = (user.diamonds || 0) + saleDiamonds + bonusDiamonds;
  if (blackSilkBaitDrop > 0) {
    user.baits[BLACK_SILK_BAIT_ID] = (user.baits[BLACK_SILK_BAIT_ID] || 0) + blackSilkBaitDrop;
  }
  user.stats.totalCatches = (user.stats.totalCatches || 0) + 1;
  user.stats.totalEarned = (user.stats.totalEarned || 0) + c.value;
  user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + saleDiamonds + bonusDiamonds;
  user.stats.totalWeight = +(((user.stats.totalWeight || 0) + (c.weight || 0)).toFixed(2));
  // 今日统计
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!user.dailyStats || user.dailyStats.date !== todayKey) {
    user.dailyStats = { date: todayKey, catches: 0, weight: 0 };
  }
  user.dailyStats.catches++;
  user.dailyStats.weight = +((user.dailyStats.weight + (c.weight || 0)).toFixed(2));
  if (c.kind === 'fish') {
    const id = c.item.id;
    if (!user.dex[id]) user.dex[id] = { count: 0, maxWeight: 0 };
    user.dex[id].count++;
    if (c.weight > user.dex[id].maxWeight) user.dex[id].maxWeight = c.weight;
  }
  user.history.push({
    t: Date.now(),
    kind: c.kind,
    name: c.item.name,
    rarity: c.kind === 'fish' ? c.item.rarity : c.kind,
    weight: c.weight,
    value: c.value,
    diamondValue: saleDiamonds,
    diamonds: bonusDiamonds,
    baitDrop: blackSilkBaitDrop ? { id: BLACK_SILK_BAIT_ID, count: blackSilkBaitDrop } : null,
  });
  const unlockedBlackSilkRod = unlockBlackSilkRodIfComplete();
  c.diamonds = bonusDiamonds;
  c.baitDrop = blackSilkBaitDrop ? { id: BLACK_SILK_BAIT_ID, count: blackSilkBaitDrop } : null;
  c.unlockedRod = unlockedBlackSilkRod ? BLACK_SILK_ROD_ID : null;
  if (user.history.length > 50) user.history.shift();
  refreshUI();
  saveUser();
}

function rollDiamondReward() {
  if (Math.random() < DIAMOND_JACKPOT_CHANCE) return 100;
  return 1 + Math.floor(Math.random() * 3);
}

function rollBlackSilkBaitDrop() {
  return Math.random() < BLACK_SILK_BAIT_DROP_CHANCE ? 1 : 0;
}

function isBaitDexComplete(baitId) {
  const bait = BAITS[baitId];
  return !!bait && bait.fishes.every((f) => user.dex[f.id] && user.dex[f.id].count > 0);
}

function unlockBlackSilkRodIfComplete() {
  if (!user || !isBaitDexComplete(BLACK_SILK_BAIT_ID)) return false;
  if (user.ownedRods.includes(BLACK_SILK_ROD_ID)) return false;
  user.ownedRods.push(BLACK_SILK_ROD_ID);
  return true;
}

function playCatchRodEffect() {
  const skin = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  if (!skin.catchEmoji) return;

  const layer = document.createElement('div');
  layer.className = 'catch-fx-layer';
  document.body.appendChild(layer);

  for (let i = 0; i < 16; i++) {
    const emoji = document.createElement('span');
    emoji.className = 'catch-fx-emoji';
    emoji.textContent = skin.catchEmoji;
    emoji.style.left = (8 + Math.random() * 84) + 'vw';
    emoji.style.bottom = (4 + Math.random() * 26) + 'vh';
    emoji.style.fontSize = (22 + Math.random() * 24) + 'px';
    emoji.style.animationDelay = (Math.random() * 0.16) + 's';
    emoji.style.setProperty('--drift', ((Math.random() - 0.5) * 90) + 'px');
    emoji.style.setProperty('--rise', -(70 + Math.random() * 110) + 'px');
    layer.appendChild(emoji);
  }

  setTimeout(() => layer.remove(), 700);
}

// ====== 结果弹窗 ======
const resultOverlay = $('result-overlay');
const resultContent = $('result-content');
$('result-close').onclick = () => resultOverlay.classList.add('hidden');

function showResult(c) {
  const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
  const color = RARITY_COLOR[rarity];
  let weightLine = '';
  if (c.kind === 'fish') {
    const priceLine = c.diamondValue
      ? `<div>售价：${c.diamondValue} 钻石</div>`
      : `<div>单价：${c.item.price} 金/kg</div>`;
    weightLine = `<div>重量：${c.weight} kg</div>${priceLine}`;
  }
  const coinLine = c.value ? `<div class="value">+${c.value} 金币</div>` : '';
  const saleDiamondLine = c.diamondValue ? `<div class="diamond-value">+${c.diamondValue} 钻石</div>` : '';
  const diamondLine = c.diamonds ? `<div class="diamond-value">额外 +${c.diamonds} 钻石</div>` : '';
  const baitDropLine = c.baitDrop ? `<div class="bait-drop">获得 ${BAITS[c.baitDrop.id].name} ×${c.baitDrop.count}</div>` : '';
  const rodLine = c.unlockedRod ? '<div class="rod-unlock">解锁 黑丝鱼竿</div>' : '';
  resultContent.innerHTML = `
    <div class="result-fish">
      <span class="icon">${c.item.icon}</span>
      <div class="name" style="color:${color}">${c.item.name}</div>
      <div class="rarity" style="color:${color}">★ ${RARITY_NAME[rarity]} ★</div>
      <div class="stats">${weightLine}</div>
      ${coinLine}
      ${saleDiamondLine}
      ${diamondLine}
      ${baitDropLine}
      ${rodLine}
    </div>
  `;
  resultOverlay.classList.remove('hidden');
  const rewards = [];
  if (c.value) rewards.push(`+${c.value} 金币`);
  if (c.diamondValue) rewards.push(`+${c.diamondValue} 钻石`);
  if (c.diamonds) rewards.push(`额外 +${c.diamonds} 钻石`);
  if (c.baitDrop) rewards.push(`获得 ${BAITS[c.baitDrop.id].name} ×${c.baitDrop.count}`);
  if (c.unlockedRod) rewards.push('解锁黑丝鱼竿');
  statusEl.textContent = `钓到了 ${c.item.name}！${rewards.join('，')}`;
}

function showMiss(msg) {
  resultContent.innerHTML = `
    <div class="result-fish miss">
      <span class="icon">💧</span>
      <div class="name">${msg}</div>
    </div>
  `;
  resultOverlay.classList.remove('hidden');
  statusEl.textContent = msg;
}

// ====== 商店 ======
const shopOverlay = $('shop-overlay');
$('shop-btn').onclick = () => { renderShop(); shopOverlay.classList.remove('hidden'); };

function renderShop() {
  const list = $('shop-list');
  list.innerHTML = '';
  for (const [id, b] of Object.entries(BAITS).filter(([, bait]) => bait.purchasable !== false)) {
    const owned = user.baits[id] || 0;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <h3 style="color:${b.color}">${b.name}</h3>
      <div class="desc">${b.desc}</div>
      <div class="row">
        <span class="price">💰 ${b.price}/个</span>
        <span class="owned">已有 ${owned}</span>
      </div>
      <div class="row">
        <button data-buy="${id}" data-n="1">买 ×1</button>
        <button data-buy="${id}" data-n="10">买 ×10</button>
      </div>
    `;
    list.appendChild(div);
  }
  list.onclick = (e) => {
    const btn = e.target.closest('button[data-buy]');
    if (!btn) return;
    const id = btn.dataset.buy;
    const n = parseInt(btn.dataset.n, 10);
    const cost = BAITS[id].price * n;
    if (user.money < cost) { alert('金币不足'); return; }
    user.money -= cost;
    user.baits[id] = (user.baits[id] || 0) + n;
    refreshUI();
    renderShop();
    saveUser();
  };
}

// ====== 图鉴 ======
const dexOverlay = $('dex-overlay');
$('dex-btn').onclick = () => { renderDex(); dexOverlay.classList.remove('hidden'); };

let activeDexBait = 'worm';

function renderDex() {
  const tabs = $('dex-tabs');
  tabs.innerHTML = '';
  for (const [id, b] of Object.entries(BAITS)) {
    const btn = document.createElement('button');
    btn.textContent = b.dexName || b.name;
    if (id === activeDexBait) btn.classList.add('active');
    btn.onclick = () => { activeDexBait = id; renderDex(); };
    tabs.appendChild(btn);
  }

  const list = $('dex-list');
  list.innerHTML = '';
  const fishes = BAITS[activeDexBait].fishes;
  let unlocked = 0;
  for (const f of fishes) {
    const dex = user.dex[f.id];
    const isU = !!dex;
    if (isU) unlocked++;
    const div = document.createElement('div');
    div.className = 'dex-item ' + (isU ? 'unlocked' : 'locked');
    div.style.borderColor = RARITY_COLOR[f.rarity];
    div.innerHTML = `
      <span class="icon">${isU ? f.icon : '❓'}</span>
      <div class="name" style="color:${RARITY_COLOR[f.rarity]}">${isU ? f.name : '???'}</div>
      <div class="info">${RARITY_NAME[f.rarity]}</div>
      <div class="info">${isU ? `×${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁'}</div>
    `;
    list.appendChild(div);
  }

  $('dex-stats').innerHTML = `
    <div>${BAITS[activeDexBait].dexName || '当前鱼饵图鉴'}：${unlocked} / ${fishes.length}</div>
    <div>累计钓获：${user.stats.totalCatches || 0} 次</div>
    <div>累计收入：${user.stats.totalEarned || 0} 金币</div>
    <div>累计钻石：${user.stats.totalDiamonds || 0} 钻石</div>
  `;
}

// ====== 排行榜 ======
const rankOverlay = $('rank-overlay');
let activeRankTab = 'today-catches';
let rankData = null;

$('rank-btn').onclick = () => {
  rankOverlay.classList.remove('hidden');
  loadLeaderboard();
};

$('rank-tabs').onclick = (e) => {
  const btn = e.target.closest('button[data-rank]');
  if (!btn) return;
  activeRankTab = btn.dataset.rank;
  $('rank-tabs').querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard();
};

async function loadLeaderboard() {
  const loading = $('rank-loading');
  const list = $('rank-list');
  loading.classList.remove('hidden');
  list.innerHTML = '';
  try {
    const res = await fetch('/api/leaderboard');
    rankData = await res.json();
    renderLeaderboard();
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#ff5722">加载失败</div>';
  }
  loading.classList.add('hidden');
}

function renderLeaderboard() {
  const list = $('rank-list');
  if (!rankData) return;
  const sortKey = {
    'today-catches': 'todayCatches',
    'today-weight': 'todayWeight',
    'total-catches': 'totalCatches',
    'total-weight': 'totalWeight',
  }[activeRankTab];
  const isWeight = activeRankTab.includes('weight');
  const sorted = [...rankData].sort((a, b) => b[sortKey] - a[sortKey]).filter(e => e[sortKey] > 0);
  if (sorted.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">暂无数据</div>';
    return;
  }
  const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };
  let html = '<table><tr><th>#</th><th>玩家</th><th style="text-align:right">' + (isWeight ? '重量 (kg)' : '数量') + '</th></tr>';
  sorted.forEach((e, i) => {
    const rank = i + 1;
    const isMe = user && e.username === user.username;
    const medal = medalMap[rank] || rank;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    html += `<tr class="${isMe ? 'me' : ''}"><td class="rank-num${rankClass}">${medal}</td><td>${e.username}</td><td class="rank-val">${isWeight ? e[sortKey].toFixed(2) : e[sortKey]}</td></tr>`;
  });
  html += '</table>';
  list.innerHTML = html;
}

// ====== 鱼竿皮肤 ======
const rodOverlay = $('rod-overlay');
$('rod-btn').onclick = () => { renderRodSkins(); rodOverlay.classList.remove('hidden'); };

function renderRodSkins() {
  const list = $('rod-list');
  list.innerHTML = '';
  const dexCount = Object.keys(user.dex).length;
  const current = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  const owned = user.ownedRods || [];
  for (const skin of GAME_DATA.ALL_RODS) {
    const isGacha = GAME_DATA.GACHA_RODS.some(g => g.id === skin.id);
    const isSpecial = (GAME_DATA.SPECIAL_RODS || []).some(s => s.id === skin.id);
    const unlocked = (isGacha || isSpecial) ? owned.includes(skin.id) : dexCount >= skin.threshold;
    const isActive = skin.id === current.id;
    const div = document.createElement('div');
    div.className = 'rod-item' + (unlocked ? ' unlocked' : ' locked') + (isActive ? ' active' : '') + (isGacha ? ' gacha' : '');
    if (unlocked && !isActive) div.style.cursor = 'pointer';
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    drawRodPreview(canvas, skin);
    let reqText;
    if (unlocked) reqText = isActive ? '✅ 装备中' : '点击装备';
    else if (isGacha) reqText = '🎰 抽奖限定';
    else if (skin.unlock === 'black_silk_dex') reqText = `🔒 集齐黑丝图鉴解锁 (${countUnlockedBaitDex(BLACK_SILK_BAIT_ID)}/${BAITS[BLACK_SILK_BAIT_ID].fishes.length})`;
    else reqText = `🔒 收集 ${skin.threshold} 种鱼解锁 (${dexCount}/${skin.threshold})`;
    div.innerHTML = `
      <div class="rod-preview"></div>
      <div class="rod-name" style="color:${skin.rodHighlight}">${skin.name}</div>
      <div class="rod-desc">${skin.desc}</div>
      <div class="rod-req">${reqText}</div>
      ${isActive ? '<div class="rod-badge">装备中</div>' : ''}
      ${isGacha && !unlocked ? '<div class="rod-badge" style="background:#c586c0">限定</div>' : ''}
      ${isSpecial && !unlocked ? '<div class="rod-badge" style="background:#ff7ac8">图鉴</div>' : ''}
    `;
    div.querySelector('.rod-preview').appendChild(canvas);
    if (unlocked && !isActive) {
      div.onclick = () => {
        user.rodSkin = skin.id;
        saveUser();
        refreshUI();
        renderRodSkins();
      };
    }
    list.appendChild(div);
  }
}

function drawRodPreview(canvas, skin) {
  const c = canvas.getContext('2d');
  c.strokeStyle = skin.rodColor;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(180, 55);
  c.lineTo(20, 10);
  c.stroke();
  c.strokeStyle = skin.rodHighlight;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(180, 55);
  c.lineTo(20, 10);
  c.stroke();
  c.strokeStyle = skin.lineColor;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(20, 10);
  c.quadraticCurveTo(10, 30, 15, 50);
  c.stroke();
}

function updateRodInfo() {
  const el = $('rod-info');
  const skin = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  const next = GAME_DATA.getNextRodSkin(user.dex);
  const dexCount = Object.keys(user.dex).length;
  let nextText = '';
  if (next) nextText = `<span class="rod-next">下一把: ${next.name} (${dexCount}/${next.threshold})</span>`;
  el.innerHTML = `<span class="rod-icon">🎣</span> ${skin.name} ${nextText}`;
}

// ====== 兑换码 ======
const redeemOverlay = $('redeem-overlay');
$('redeem-btn').onclick = () => {
  $('redeem-input').value = '';
  $('redeem-status').textContent = '';
  $('redeem-status').className = 'redeem-status';
  redeemOverlay.classList.remove('hidden');
};

$('redeem-submit').onclick = redeemCode;
$('redeem-input').onkeydown = (e) => { if (e.key === 'Enter') redeemCode(); };

async function redeemCode() {
  const code = $('redeem-input').value.trim();
  const status = $('redeem-status');
  if (!code) { status.textContent = '请输入兑换码'; status.className = 'redeem-status error'; return; }
  try {
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, code }),
    });
    const data = await res.json();
    if (data.success) {
      user = data.user;
      refreshUI();
      status.innerHTML = `兑换成功！<br>${data.desc} +${data.coins} 金币 🎉`;
      status.className = 'redeem-status success';
      $('redeem-input').value = '';
    } else {
      status.textContent = data.error || '兑换失败';
      status.className = 'redeem-status error';
    }
  } catch (e) {
    status.textContent = '网络错误，请重试';
    status.className = 'redeem-status error';
  }
}

// ====== 分享功能 ======
const shareOverlay = $('share-overlay');
$('share-btn').onclick = () => { openShare(); shareOverlay.classList.remove('hidden'); };

function openShare() {
  const link = window.location.origin + '?ref=' + encodeURIComponent(user.username);
  $('share-link').value = link;
  const status = $('share-status');
  const todayKey = new Date().toISOString().slice(0, 10);
  if (user.lastShareDate === todayKey) {
    status.textContent = '今日已领取分享奖励';
    status.className = 'share-status info';
  } else {
    status.textContent = '';
    status.className = 'share-status';
  }
}

$('copy-link-btn').onclick = () => {
  const input = $('share-link');
  const status = $('share-status');
  navigator.clipboard.writeText(input.value).then(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (user.lastShareDate !== todayKey) {
      user.money += 10;
      user.lastShareDate = todayKey;
      refreshUI();
      saveUser();
      status.textContent = '链接已复制！获得 10 金币奖励 🎉';
      status.className = 'share-status success';
    } else {
      status.textContent = '链接已复制！（今日奖励已领取）';
      status.className = 'share-status info';
    }
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    const todayKey = new Date().toISOString().slice(0, 10);
    if (user.lastShareDate !== todayKey) {
      user.money += 10;
      user.lastShareDate = todayKey;
      refreshUI();
      saveUser();
      status.textContent = '链接已复制！获得 10 金币奖励 🎉';
      status.className = 'share-status success';
    } else {
      status.textContent = '链接已复制！（今日奖励已领取）';
      status.className = 'share-status info';
    }
  });
};

// ====== 手机端按钮 ======
const mobileBtn = $('mobile-action-btn');
const mobileBtnText = $('mobile-btn-text');

function updateMobileBtn() {
  if (state.phase === 'idle') {
    mobileBtnText.textContent = '抛竿';
    mobileBtn.style.background = 'linear-gradient(135deg, #d35400, #ff6f00)';
  } else if (state.phase === 'waiting') {
    mobileBtnText.textContent = '等待...';
    mobileBtn.style.background = 'linear-gradient(135deg, #2c3e50, #34495e)';
  } else if (state.phase === 'hooked') {
    mobileBtnText.textContent = '拉!';
    mobileBtn.style.background = 'linear-gradient(135deg, #c0392b, #e74c3c)';
  } else if (state.phase === 'reeling') {
    mobileBtnText.textContent = '击中!';
    mobileBtn.style.background = 'linear-gradient(135deg, #c0392b, #e74c3c)';
  }
}

function handleMobileAction(e) {
  e.preventDefault();
  if (state.phase === 'idle') {
    startCast();
  } else if (state.phase === 'hooked') {
    startHitbar();
  } else if (state.phase === 'reeling') {
    hitbarClick();
  }
  updateMobileBtn();
}
mobileBtn.addEventListener('touchstart', handleMobileAction, { passive: false });
mobileBtn.addEventListener('mousedown', handleMobileAction);

// ====== 抽奖系统 ======
const gachaOverlay = $('gacha-overlay');
let activeGachaCurrency = 'coins';
$('gacha-btn').onclick = () => {
  $('gacha-result').classList.add('hidden');
  setGachaTab(activeGachaCurrency);
  gachaOverlay.classList.remove('hidden');
};
document.querySelectorAll('[data-gacha]').forEach((btn) => {
  btn.onclick = () => setGachaTab(btn.dataset.gacha);
});
$('gacha-coin-single').onclick = () => doGacha(1, 'coins');
$('gacha-coin-ten').onclick = () => doGacha(10, 'coins');
$('gacha-diamond-single').onclick = () => doGacha(1, 'diamonds');
$('gacha-diamond-ten').onclick = () => doGacha(10, 'diamonds');

function setGachaTab(currency) {
  activeGachaCurrency = currency === 'diamonds' ? 'diamonds' : 'coins';
  document.querySelectorAll('[data-gacha]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.gacha === activeGachaCurrency);
  });
  $('gacha-coins-panel').classList.toggle('hidden', activeGachaCurrency !== 'coins');
  $('gacha-diamonds-panel').classList.toggle('hidden', activeGachaCurrency !== 'diamonds');
  $('gacha-result').classList.add('hidden');
}

function countUnlockedBaitDex(baitId) {
  const bait = BAITS[baitId];
  if (!bait) return 0;
  return bait.fishes.filter((f) => user.dex[f.id] && user.dex[f.id].count > 0).length;
}

function getGachaCost(count, currency) {
  if (currency === 'diamonds') return count === 1 ? 10 : 90;
  return count === 1 ? 1000 : 9000;
}

async function doGacha(count, currency = activeGachaCurrency) {
  const cost = getGachaCost(count, currency);
  if (currency === 'diamonds') {
    if ((user.diamonds || 0) < cost) { alert('钻石不足！需要 ' + cost + ' 钻石'); return; }
  } else if (user.money < cost) {
    alert('金币不足！需要 ' + cost + ' 金币');
    return;
  }
  try {
    const res = await fetch('/api/gacha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, count, currency }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    user = data.user;
    ensureUserDefaults();
    refreshUI();
    showGachaResult(data.results);
  } catch (e) {
    alert('网络错误，请重试');
  }
}

function showGachaResult(results) {
  const el = $('gacha-result');
  el.classList.remove('hidden');
  let html = '<div class="gacha-result-items">';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    let cls = 'gacha-item';
    let icon, name;
    if (r.type === 'rod') {
      const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
      icon = (rod && rod.emoji) || '🎣';
      name = rod ? rod.name : r.id;
      cls += ' gi-' + ((rod && rod.rarity) || 'rare');
    } else if (r.type === 'diamonds') {
      icon = '💎';
      name = r.diamonds + ' 钻石';
      cls += ' gi-diamond';
    } else {
      icon = r.coins >= 1000 ? '💰' : '🪙';
      name = r.coins + ' 金币';
      cls += r.coins >= 1000 ? ' gi-coin' : ' gi-common';
    }
    const delay = i * 0.1;
    html += `<div class="${cls}" style="animation-delay:${delay}s"><span class="gi-icon">${icon}</span><span class="gi-name">${name}</span></div>`;
  }
  html += '</div>';
  const rods = results.filter(r => r.type === 'rod');
  const totalCoins = results.filter(r => r.type === 'coins').reduce((s, r) => s + r.coins, 0);
  const totalDiamonds = results.filter(r => r.type === 'diamonds').reduce((s, r) => s + r.diamonds, 0);
  const summaryParts = [];
  if (rods.length > 0) {
    summaryParts.push(rods.map((r) => {
      const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
      return `🎉 获得 ${rod ? rod.name : r.id}！`;
    }).join('<br>'));
  }
  if (totalDiamonds > 0) summaryParts.push(`💎 共获得 ${totalDiamonds} 钻石`);
  if (totalCoins > 0) summaryParts.push(`💰 共获得 ${totalCoins} 金币`);
  const summary = `<div class="gacha-summary">${summaryParts.join('<br>')}</div>`;
  el.innerHTML = html + summary;
}

// 关闭按钮
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.onclick = () => $(btn.dataset.close).classList.add('hidden');
});
