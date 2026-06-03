const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const dpr = wx.getSystemInfoSync().pixelRatio || 1;
const info = wx.getSystemInfoSync();
canvas.width = info.windowWidth * dpr;
canvas.height = info.windowHeight * dpr;
ctx.scale(dpr, dpr);

const W = info.windowWidth;
const H = info.windowHeight;
const API_BASE = 'https://fish.wakaka007.cn';
const BAITS = [
  {
    id: 'worm',
    name: '蚯蚓',
    price: 10,
    color: '#8b4513',
    fishes: [
      { name: '沙丁鱼', rarity: '普通', minW: 0.05, maxW: 0.3, price: 30, icon: '鱼' },
      { name: '小鲫鱼', rarity: '普通', minW: 0.1, maxW: 0.6, price: 25, icon: '鱼' },
      { name: '鲫鱼王', rarity: '稀有', minW: 1, maxW: 3, price: 80, icon: '鱼' },
      { name: '锦鲤', rarity: '传说', minW: 2, maxW: 5, price: 400, icon: '锦' },
    ],
  },
  {
    id: 'shrimp',
    name: '鲜虾',
    price: 50,
    color: '#ff7f7f',
    fishes: [
      { name: '鲭鱼', rarity: '普通', minW: 0.5, maxW: 1.5, price: 60, icon: '鱼' },
      { name: '章鱼', rarity: '稀有', minW: 1, maxW: 4, price: 250, icon: '章' },
      { name: '龙虾', rarity: '稀有', minW: 0.5, maxW: 2, price: 400, icon: '虾' },
      { name: '幼海妖', rarity: '隐藏', minW: 20, maxW: 60, price: 1500, icon: '妖' },
    ],
  },
  {
    id: 'lure',
    name: '亮片',
    price: 200,
    color: '#c0c0c0',
    fishes: [
      { name: '鲈鱼', rarity: '普通', minW: 1, maxW: 4, price: 150, icon: '鱼' },
      { name: '小鲨鱼', rarity: '稀有', minW: 8, maxW: 25, price: 350, icon: '鲨' },
      { name: '幼巨齿鲨', rarity: '传说', minW: 30, maxW: 80, price: 800, icon: '鲨' },
      { name: '幼海蛇神', rarity: '隐藏', minW: 80, maxW: 300, price: 2000, icon: '龙' },
    ],
  },
];

const state = {
  username: 'guest',
  money: 100,
  diamonds: 0,
  baits: { worm: 5, shrimp: 0, lure: 0 },
  baitIndex: 0,
  phase: 'idle',
  message: '点击抛竿开始钓鱼',
  result: null,
  castAt: 0,
  hit: null,
  synced: false,
};

const buttons = {};

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function contains(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function loadLocal() {
  const raw = wx.getStorageSync('fishing_minigame_user');
  if (!raw) return;
  Object.assign(state, JSON.parse(raw));
}

function saveLocal() {
  wx.setStorageSync('fishing_minigame_user', JSON.stringify({
    username: state.username,
    money: state.money,
    diamonds: state.diamonds,
    baits: state.baits,
    baitIndex: state.baitIndex,
  }));
}

function remote(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method: 'POST',
      data,
      timeout: 8000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data || {});
        else reject(new Error('HTTP ' + res.statusCode));
      },
      fail: reject,
    });
  });
}

function syncLogin() {
  remote('/api/session/login', { username: state.username })
    .then((data) => {
      state.money = typeof data.money === 'number' ? data.money : state.money;
      state.diamonds = typeof data.diamonds === 'number' ? data.diamonds : state.diamonds;
      state.baits = Object.assign(state.baits, data.baits || {});
      state.synced = true;
      saveLocal();
    })
    .catch(() => {
      state.synced = false;
    });
}

function syncSave() {
  saveLocal();
  remote('/api/save', { username: state.username, state }).catch(() => {});
}

function drawText(text, x, y, size, color, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function drawButton(key, label, r, active) {
  buttons[key] = r;
  ctx.fillStyle = active ? '#d35400' : '#1a1a2e';
  ctx.strokeStyle = active ? '#ffae42' : '#ffd700';
  ctx.lineWidth = 2;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  drawText(label, r.x + r.w / 2, r.y + r.h / 2 + 5, 14, '#ffd700', 'center');
}

function drawScene() {
  const top = 84;
  const water = top + Math.min(250, W * 0.55);
  const grad = ctx.createLinearGradient(0, top, 0, water + 150);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(0.55, '#87ceeb');
  grad.addColorStop(0.56, '#2f9fd0');
  grad.addColorStop(1, '#174e86');
  ctx.fillStyle = grad;
  ctx.fillRect(12, top, W - 24, Math.min(310, H - 250));
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, top, W - 24, Math.min(310, H - 250));

  ctx.fillStyle = '#f8d86a';
  ctx.fillRect(28, top + 18, 26, 26);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(12, water - 6, W - 24, 12);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(42, water - 12, 72, 14);
  ctx.fillStyle = '#263238';
  ctx.fillRect(W * 0.35, water - 56, 18, 34);
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(W * 0.35 + 3, water - 70, 13, 13);
  ctx.fillStyle = '#1976d2';
  ctx.fillRect(W * 0.35 - 10, water - 22, 34, 10);
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.39, water - 46);
  ctx.lineTo(W * 0.72, water + 34);
  ctx.stroke();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.72, water + 34);
  ctx.lineTo(W * 0.72, water + 90);
  ctx.stroke();
  if (state.phase === 'waiting' || state.phase === 'hooked') {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(W * 0.72 - 3, water + 86 + Math.sin(Date.now() / 100) * 4, 7, 7);
  }
}

function drawHitbar() {
  if (state.phase !== 'hooked' || !state.hit) return;
  const r = rect(28, H - 178, W - 56, 42);
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.fillRect(0, H - 220, W, 220);
  drawText('鱼上钩了！点红区', W / 2, H - 190, 20, '#ffae42', 'center');
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(r.x + r.w * state.hit.zone, r.y, r.w * state.hit.width, r.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(r.x + r.w * state.hit.cursor, r.y - 3, 4, r.h + 6);
  buttons.hit = r;
}

function drawResult() {
  if (!state.result) return;
  const r = rect(28, H / 2 - 82, W - 56, 164);
  ctx.fillStyle = 'rgba(0,0,0,.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  drawText(state.result.title, W / 2, r.y + 44, 24, state.result.color || '#ffd700', 'center');
  drawText(state.result.line1, W / 2, r.y + 82, 17, '#e8e8e8', 'center');
  drawText(state.result.line2 || '点击关闭', W / 2, r.y + 116, 16, '#4ec9b0', 'center');
  buttons.closeResult = r;
}

function render() {
  buttons.hit = null;
  buttons.closeResult = null;
  ctx.fillStyle = '#0d1421';
  ctx.fillRect(0, 0, W, H);
  drawText('像素钓鱼', 18, 34, 24, '#ffd700');
  drawText(`金币 ${Math.floor(state.money)}   钻石 ${Math.floor(state.diamonds)}`, 18, 60, 14, '#e8e8e8');
  drawText(state.synced ? '线上存档' : '本地游玩', W - 18, 34, 13, state.synced ? '#4ec9b0' : '#ffae42', 'right');
  drawScene();

  const bait = BAITS[state.baitIndex];
  drawText(`当前鱼饵：${bait.name} x${state.baits[bait.id] || 0}`, 18, H - 126, 16, bait.color);
  drawText(state.message, 18, H - 100, 14, '#4ec9b0');
  BAITS.forEach((item, i) => {
    drawButton('bait' + i, item.name, rect(18 + i * 76, H - 78, 68, 34), i === state.baitIndex);
  });
  drawButton('cast', state.phase === 'idle' ? '抛竿' : '等待', rect(W - 112, H - 78, 94, 34), state.phase !== 'idle');
  drawHitbar();
  drawResult();
  requestAnimationFrame(render);
}

function rollFish() {
  const bait = BAITS[state.baitIndex];
  const fish = bait.fishes[Math.floor(Math.random() * bait.fishes.length)];
  const weight = +(fish.minW + Math.random() * (fish.maxW - fish.minW)).toFixed(2);
  return { fish, weight, value: Math.round(weight * fish.price) };
}

function cast() {
  const bait = BAITS[state.baitIndex];
  if (state.phase !== 'idle') return;
  if ((state.baits[bait.id] || 0) <= 0) {
    state.message = '鱼饵不足，换一种试试';
    return;
  }
  state.baits[bait.id] -= 1;
  state.phase = 'waiting';
  state.message = '已抛竿，等待上钩...';
  saveLocal();
  setTimeout(() => {
    state.phase = 'hooked';
    state.message = '鱼上钩了！';
    state.hit = { cursor: 0, dir: 1, zone: 0.35 + Math.random() * 0.3, width: 0.18, target: rollFish() };
  }, 900 + Math.random() * 1500);
}

function tick() {
  if (state.phase === 'hooked' && state.hit) {
    state.hit.cursor += state.hit.dir * 0.018;
    if (state.hit.cursor > 1 || state.hit.cursor < 0) state.hit.dir *= -1;
    state.hit.cursor = Math.max(0, Math.min(1, state.hit.cursor));
  }
  setTimeout(tick, 16);
}

function hit() {
  if (state.phase !== 'hooked' || !state.hit) return;
  const h = state.hit;
  if (h.cursor >= h.zone && h.cursor <= h.zone + h.width) {
    const c = h.target;
    state.money += c.value;
    state.result = {
      title: `${c.fish.name} ${c.fish.rarity}`,
      line1: `${c.weight} kg  +${c.value} 金币`,
      line2: '点击继续',
      color: c.fish.rarity === '隐藏' ? '#ffd700' : '#4ec9b0',
    };
    state.message = '钓到了！';
    syncSave();
  } else {
    state.result = { title: '鱼跑了', line1: '下次点准红色区域', line2: '点击继续', color: '#ff5722' };
    state.message = '鱼跑了';
    saveLocal();
  }
  state.phase = 'idle';
  state.hit = null;
}

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  if (!touch) return;
  const x = touch.clientX;
  const y = touch.clientY;
  if (buttons.closeResult && contains(buttons.closeResult, x, y)) {
    state.result = null;
    return;
  }
  if (buttons.hit && contains(buttons.hit, x, y)) {
    hit();
    return;
  }
  BAITS.forEach((_, i) => {
    if (buttons['bait' + i] && contains(buttons['bait' + i], x, y)) {
      state.baitIndex = i;
      state.message = `切换到${BAITS[i].name}`;
      saveLocal();
    }
  });
  if (buttons.cast && contains(buttons.cast, x, y)) cast();
});

loadLocal();
syncLogin();
tick();
render();
