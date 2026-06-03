const GAME_DATA = require('./utils/game-data');
const VERSION_DATA = require('./utils/version');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const systemInfo = wx.getSystemInfoSync();
const dpr = systemInfo.pixelRatio || 1;
let W = systemInfo.windowWidth;
let H = systemInfo.windowHeight;

canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

const API_BASE = 'https://fish.wakaka007.cn';
const BAIT_IDS = Object.keys(GAME_DATA.BAITS);
const STORAGE_KEY = 'fishing_minigame_user_v2';
const TABS = [
  ['fish', '钓鱼'],
  ['shop', '商店'],
  ['dex', '图鉴'],
  ['bag', '背包'],
];

const state = {
  username: 'guest',
  money: 100,
  diamonds: 0,
  baits: { worm: 5, shrimp: 0, lure: 0, magic: 0, divine: 0, jb: 0, black_silk: 0 },
  currentBait: 'worm',
  dex: {},
  stats: { totalCatches: 0, totalEarned: 0, totalDiamonds: 0, totalWeight: 0 },
  ownedRods: [],
  ownedPets: [],
  ownedCharacters: [GAME_DATA.DEFAULT_CHARACTER_ID],
  characterFragments: {},
  accessories: [],
  phase: 'idle',
  tab: 'fish',
  scroll: 0,
  message: '选择鱼饵后点击抛竿',
  synced: false,
  hitbar: null,
  result: null,
};

let buttons = [];
let loopTimer = null;

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function hitRect(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function addButton(id, r, onTap) {
  buttons.push({ id, r, onTap });
}

function loadLocal() {
  const raw = wx.getStorageSync(STORAGE_KEY);
  if (!raw) return;
  try {
    Object.assign(state, JSON.parse(raw));
    state.phase = 'idle';
    state.hitbar = null;
    state.result = null;
  } catch (_) {}
}

function saveLocal() {
  wx.setStorageSync(STORAGE_KEY, JSON.stringify({
    username: state.username,
    money: state.money,
    diamonds: state.diamonds,
    baits: state.baits,
    currentBait: state.currentBait,
    dex: state.dex,
    stats: state.stats,
    ownedRods: state.ownedRods,
    ownedPets: state.ownedPets,
    ownedCharacters: state.ownedCharacters,
    characterFragments: state.characterFragments,
    accessories: state.accessories,
  }));
}

function remote(path, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method,
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

function mergeRemote(data) {
  if (!data || typeof data !== 'object') return;
  state.money = typeof data.money === 'number' ? data.money : state.money;
  state.diamonds = typeof data.diamonds === 'number' ? data.diamonds : state.diamonds;
  state.baits = { ...state.baits, ...(data.baits || {}) };
  state.dex = data.dex || state.dex;
  state.stats = { ...state.stats, ...(data.stats || {}) };
  state.ownedRods = data.ownedRods || state.ownedRods;
  state.ownedPets = data.ownedPets || state.ownedPets;
  state.ownedCharacters = data.ownedCharacters || state.ownedCharacters;
  state.characterFragments = data.characterFragments || state.characterFragments;
  state.accessories = data.accessories || state.accessories;
}

function syncLogin() {
  remote('/api/session/login', { username: state.username })
    .then((data) => {
      mergeRemote(data);
      state.synced = true;
      state.message = '已连接线上存档';
      saveLocal();
    })
    .catch(() => {
      state.synced = false;
      state.message = '离线游玩，本地保存';
    });
}

function syncSave() {
  saveLocal();
  remote('/api/save', { username: state.username, state }).catch(() => {});
}

function text(value, x, y, size, color, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(value), x, y);
}

function panel(r, fill = '#1a1a2e', stroke = '#ffd700') {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

function button(id, label, r, active, onTap) {
  addButton(id, r, onTap);
  panel(r, active ? '#d35400' : '#1a1a2e', active ? '#ffae42' : '#ffd700');
  text(label, r.x + r.w / 2, r.y + r.h / 2 + 5, 13, '#ffd700', 'center');
}

function rarityColor(rarity) {
  return GAME_DATA.RARITY_COLOR[rarity] || '#e8e8e8';
}

function rarityName(rarity) {
  return GAME_DATA.RARITY_NAME[rarity] || rarity || '';
}

function drawHeader() {
  text('像素钓鱼小游戏', 14, 28, 21, '#ffd700');
  text(`v${VERSION_DATA.version}`, W - 14, 26, 11, '#888', 'right');
  text(`金币 ${Math.floor(state.money)}   钻石 ${Math.floor(state.diamonds)}`, 14, 52, 13, '#e8e8e8');
  text(state.synced ? '线上存档' : '本地存档', W - 14, 52, 12, state.synced ? '#4ec9b0' : '#ffae42', 'right');
  const tabW = Math.max(64, Math.floor((W - 28) / TABS.length));
  TABS.forEach(([id, label], index) => {
    button(`tab:${id}`, label, rect(14 + index * tabW, 66, tabW - 6, 34), state.tab === id, () => {
      state.tab = id;
      state.scroll = 0;
      state.result = null;
    });
  });
}

function drawScene() {
  const top = 112;
  const h = Math.min(270, Math.max(210, H * 0.38));
  const waterY = top + h * 0.55;
  const sky = ctx.createLinearGradient(0, top, 0, top + h);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(0.55, '#87ceeb');
  sky.addColorStop(0.56, '#2f9fd0');
  sky.addColorStop(1, '#174e86');
  ctx.fillStyle = sky;
  ctx.fillRect(14, top, W - 28, h);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, top, W - 28, h);
  ctx.fillStyle = '#f8d86a';
  ctx.fillRect(30, top + 18, 26, 26);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(14, waterY - 6, W - 28, 12);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(42, waterY - 10, 78, 14);
  ctx.fillStyle = '#263238';
  ctx.fillRect(W * 0.36, waterY - 58, 20, 36);
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(W * 0.36 + 4, waterY - 72, 13, 13);
  ctx.fillStyle = '#1976d2';
  ctx.fillRect(W * 0.36 - 10, waterY - 24, 36, 12);
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.40, waterY - 48);
  ctx.lineTo(W * 0.73, waterY + 34);
  ctx.stroke();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.73, waterY + 34);
  ctx.lineTo(W * 0.73, waterY + 88);
  ctx.stroke();
  if (state.phase !== 'idle') {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(W * 0.73 - 4, waterY + 84 + Math.sin(Date.now() / 90) * 4, 8, 8);
  }
}

function drawFishTab() {
  drawScene();
  const bait = GAME_DATA.BAITS[state.currentBait] || GAME_DATA.BAITS.worm;
  const baseY = Math.min(H - 136, 112 + Math.min(270, Math.max(210, H * 0.38)) + 18);
  text(`当前鱼饵：${bait.name} x${state.baits[state.currentBait] || 0}`, 18, baseY, 16, bait.color || '#ffd700');
  text(state.message, 18, baseY + 24, 13, '#4ec9b0');
  const cols = Math.min(4, BAIT_IDS.length);
  const bw = Math.floor((W - 34) / cols);
  BAIT_IDS.slice(0, cols).forEach((id, index) => {
    const b = GAME_DATA.BAITS[id];
    button(`bait:${id}`, b.name, rect(14 + index * bw, H - 88, bw - 6, 32), id === state.currentBait, () => {
      state.currentBait = id;
      state.message = `切换到${b.name}`;
      saveLocal();
    });
  });
  button('cast', state.phase === 'idle' ? '抛竿钓鱼' : '等待中', rect(W - 116, H - 46, 102, 34), state.phase !== 'idle', cast);
  button('more-baits', '更多鱼饵', rect(14, H - 46, 92, 34), false, () => {
    state.tab = 'shop';
    state.scroll = 0;
  });
}

function drawList(items, startY, rowH, renderItem) {
  const visibleTop = startY;
  const visibleBottom = H - 12;
  items.forEach((item, index) => {
    const y = startY + index * rowH - state.scroll;
    if (y + rowH < visibleTop || y > visibleBottom) return;
    renderItem(item, y, index);
  });
}

function buyBait(id, count) {
  const bait = GAME_DATA.BAITS[id];
  const price = (bait.price || 0) * count;
  const currency = bait.currency || 'money';
  if (currency === 'diamonds') {
    if (state.diamonds < price) {
      state.message = '钻石不足';
      return;
    }
    state.diamonds -= price;
  } else {
    if (state.money < price) {
      state.message = '金币不足';
      return;
    }
    state.money -= price;
  }
  state.baits[id] = (state.baits[id] || 0) + count;
  state.currentBait = id;
  state.message = `购买 ${bait.name} x${count}`;
  syncSave();
}

function drawShopTab() {
  text('鱼饵商店：价格、货币和鱼饵来自原游戏配置', 14, 124, 13, '#4ec9b0');
  drawList(BAIT_IDS, 140, 76, (id, y) => {
    const bait = GAME_DATA.BAITS[id];
    panel(rect(14, y, W - 28, 66), '#0d1421', bait.color || '#555');
    text(`${bait.name}  x${state.baits[id] || 0}`, 24, y + 23, 16, bait.color || '#ffd700');
    text(`${bait.desc || ''}`.slice(0, 20), 24, y + 45, 12, '#cbd5e1');
    const price = `${bait.currency === 'diamonds' ? '钻石' : '金币'} ${bait.price || 0}`;
    text(price, W - 120, y + 23, 12, '#ffd700');
    button(`buy:${id}:1`, '买1', rect(W - 124, y + 33, 48, 25), false, () => buyBait(id, 1));
    button(`buy:${id}:10`, '买10', rect(W - 68, y + 33, 54, 25), false, () => buyBait(id, 10));
  });
}

function allFish() {
  const seen = {};
  BAIT_IDS.forEach((id) => {
    (GAME_DATA.BAITS[id].fishes || []).forEach((fish) => {
      if (!seen[fish.id]) seen[fish.id] = { ...fish, baitName: GAME_DATA.BAITS[id].name };
    });
  });
  return Object.values(seen);
}

function drawDexTab() {
  const fishes = allFish();
  text(`图鉴：${Object.keys(state.dex || {}).length}/${fishes.length}，鱼种来自原游戏完整配置`, 14, 124, 13, '#4ec9b0');
  drawList(fishes, 140, 58, (fish, y) => {
    const unlocked = !!state.dex[fish.id];
    panel(rect(14, y, W - 28, 50), '#0d1421', unlocked ? rarityColor(fish.rarity) : '#555');
    text(unlocked ? (fish.icon || '鱼') : '?', 26, y + 31, 20, unlocked ? rarityColor(fish.rarity) : '#777');
    text(unlocked ? fish.name : '未发现', 58, y + 22, 15, unlocked ? '#e8e8e8' : '#777');
    text(`${fish.baitName} / ${rarityName(fish.rarity)}`, 58, y + 40, 11, rarityColor(fish.rarity));
    if (unlocked) {
      const dex = state.dex[fish.id] || {};
      text(`x${dex.count || 0}`, W - 22, y + 31, 13, '#ffd700', 'right');
    }
  });
}

function drawBagTab() {
  const rods = GAME_DATA.ALL_RODS || [];
  const pets = GAME_DATA.PETS || [];
  const chars = GAME_DATA.CHARACTERS || [];
  const lines = [
    `累计钓获：${state.stats.totalCatches || 0} 次`,
    `累计收益：${Math.floor(state.stats.totalEarned || 0)} 金币`,
    `累计重量：${(state.stats.totalWeight || 0).toFixed(2)} kg`,
    `鱼竿：${state.ownedRods.length}/${rods.length}`,
    `宠物：${state.ownedPets.length}/${pets.length}`,
    `角色：${state.ownedCharacters.length}/${chars.length}`,
  ];
  text('背包 / 收藏', 14, 124, 15, '#ffd700');
  lines.forEach((line, index) => {
    panel(rect(14, 140 + index * 42, W - 28, 34), '#0d1421', '#334155');
    text(line, 26, 162 + index * 42, 14, '#e8e8e8');
  });
  text('小游戏版目前优先同步核心钓鱼、商店、图鉴和收藏数据。', 14, H - 44, 12, '#94a3b8');
  text('完整弹窗交互会继续按原网页游戏迁移。', 14, H - 24, 12, '#94a3b8');
}

function drawHitbar() {
  if (state.phase !== 'hooked' || !state.hitbar) return;
  ctx.fillStyle = 'rgba(0,0,0,.78)';
  ctx.fillRect(0, 0, W, H);
  text('鱼上钩了！点击红色区域', W / 2, H / 2 - 78, 20, '#ffae42', 'center');
  const r = rect(24, H / 2 - 38, W - 48, 44);
  panel(r, '#2c3e50', '#ffd700');
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(r.x + r.w * state.hitbar.zone, r.y, r.w * state.hitbar.width, r.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(r.x + r.w * state.hitbar.cursor, r.y - 4, 4, r.h + 8);
  text(`${state.hitbar.hits}/${state.hitbar.needed} 命中`, W / 2, H / 2 + 34, 15, '#4ec9b0', 'center');
  addButton('hitbar', r, tapHitbar);
}

function drawResult() {
  if (!state.result) return;
  ctx.fillStyle = 'rgba(0,0,0,.76)';
  ctx.fillRect(0, 0, W, H);
  const r = rect(26, H / 2 - 104, W - 52, 208);
  panel(r, '#1a1a2e', '#ffd700');
  text(state.result.title, W / 2, r.y + 46, 22, state.result.color || '#ffd700', 'center');
  state.result.lines.forEach((line, index) => {
    text(line, W / 2, r.y + 82 + index * 24, 15, '#e8e8e8', 'center');
  });
  button('result-close', '继续', rect(W / 2 - 48, r.y + 158, 96, 32), false, () => {
    state.result = null;
  });
}

function render() {
  buttons = [];
  ctx.fillStyle = '#0d1421';
  ctx.fillRect(0, 0, W, H);
  drawHeader();
  if (state.tab === 'fish') drawFishTab();
  if (state.tab === 'shop') drawShopTab();
  if (state.tab === 'dex') drawDexTab();
  if (state.tab === 'bag') drawBagTab();
  drawHitbar();
  drawResult();
}

function frame() {
  if (state.phase === 'hooked' && state.hitbar) {
    const hb = state.hitbar;
    hb.cursor += hb.dir * hb.speed;
    if (hb.cursor > 1 || hb.cursor < 0) hb.dir *= -1;
    hb.cursor = Math.max(0, Math.min(1, hb.cursor));
    hb.time -= 0.016;
    if (hb.time <= 0) finishCatch(false);
  }
  render();
  loopTimer = setTimeout(frame, 16);
}

function cast() {
  const bait = GAME_DATA.BAITS[state.currentBait] || GAME_DATA.BAITS.worm;
  if (state.phase !== 'idle') return;
  if ((state.baits[state.currentBait] || 0) <= 0) {
    state.message = '鱼饵不足，可以去商店购买';
    return;
  }
  state.baits[state.currentBait] -= 1;
  state.phase = 'waiting';
  state.message = '已抛竿，等待鱼上钩...';
  saveLocal();
  setTimeout(() => {
    const caught = GAME_DATA.rollCatch(state.currentBait, '', {}, state.ownedCharacters);
    const rarity = caught.item && caught.item.rarity ? caught.item.rarity : caught.rarity;
    const needed = Math.max(1, GAME_DATA.HITS_BY_RARITY[rarity] || 1);
    state.phase = 'hooked';
    state.message = `${bait.name} 有动静！`;
    state.hitbar = {
      caught,
      hits: 0,
      needed,
      cursor: 0,
      dir: 1,
      zone: 0.28 + Math.random() * 0.42,
      width: Math.max(0.08, 0.22 - needed * 0.015),
      speed: Math.min(0.034, 0.012 + needed * 0.003),
      time: 12,
    };
  }, 800 + Math.random() * 1200);
}

function tapHitbar() {
  if (!state.hitbar) return;
  const hb = state.hitbar;
  if (hb.cursor >= hb.zone && hb.cursor <= hb.zone + hb.width) {
    hb.hits += 1;
    if (hb.hits >= hb.needed) finishCatch(true);
  } else {
    hb.hits = 0;
  }
}

function finishCatch(success) {
  const hb = state.hitbar;
  state.phase = 'idle';
  state.hitbar = null;
  if (!hb || !success) {
    state.result = { title: '鱼跑了', color: '#ff5722', lines: ['下次再试试手感'] };
    state.message = '鱼跑了';
    saveLocal();
    return;
  }
  const c = hb.caught;
  const item = c.item || {};
  const lines = [];
  if (c.kind === 'fish') {
    state.money += c.value || 0;
    state.diamonds += c.diamondValue || 0;
    state.stats.totalCatches = (state.stats.totalCatches || 0) + 1;
    state.stats.totalEarned = (state.stats.totalEarned || 0) + (c.value || 0);
    state.stats.totalDiamonds = (state.stats.totalDiamonds || 0) + (c.diamondValue || 0);
    state.stats.totalWeight = (state.stats.totalWeight || 0) + (c.weight || 0);
    const dex = state.dex[item.id] || { count: 0, maxWeight: 0 };
    dex.count += 1;
    dex.maxWeight = Math.max(dex.maxWeight || 0, c.weight || 0);
    state.dex[item.id] = dex;
    lines.push(`${(c.weight || 0).toFixed(2)} kg`);
    if (c.value) lines.push(`+${c.value} 金币`);
    if (c.diamondValue) lines.push(`+${c.diamondValue} 钻石`);
  } else if (c.kind === 'treasure') {
    state.money += c.value || 0;
    lines.push(`+${c.value || 0} 金币`);
  } else if (c.kind === 'character_shard') {
    state.characterFragments[c.characterId] = (state.characterFragments[c.characterId] || 0) + 1;
    lines.push(`角色碎片 +${c.shardCount || 1}`);
  } else {
    lines.push('没有收益');
  }
  state.result = {
    title: `${item.icon || ''} ${item.name || '收获'}`,
    color: rarityColor(item.rarity || c.rarity),
    lines,
  };
  state.message = `钓到${item.name || '东西'}！`;
  syncSave();
}

wx.onTouchStart((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  const x = touch.clientX;
  const y = touch.clientY;
  const found = buttons.slice().reverse().find((btn) => hitRect(btn.r, x, y));
  if (found) {
    found.onTap();
    return;
  }
  state.scrollStartY = y;
});

wx.onTouchMove((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch || state.tab === 'fish') return;
  const y = touch.clientY;
  const delta = (state.scrollStartY || y) - y;
  state.scrollStartY = y;
  state.scroll = Math.max(0, state.scroll + delta);
});

wx.onTouchEnd(() => {
  state.scrollStartY = null;
});

wx.onHide(() => {
  saveLocal();
  if (loopTimer) clearTimeout(loopTimer);
});

wx.onShow(() => {
  if (!loopTimer) frame();
});

loadLocal();
syncLogin();
frame();
