if (!window.GAME_DATA) {
  document.body.innerHTML = '<div style="color:#ff5722;padding:40px;font-family:monospace;font-size:16px">' +
    '错误：data.js 未加载。<br>请通过 <b>http://localhost:3456</b> 访问，而不是直接打开 HTML 文件。' +
    '</div>';
  throw new Error('GAME_DATA missing');
}

const API_BASE = location.hostname === 'fish.wakaka007.cn' ? '' : 'https://fishapi.wakaka007.cn';
// HITS_BY_RARITY / RARITY_COLOR / RARITY_NAME / BAITS / rollCatch 由 data.js 顶层声明，已在脚本作用域可见

function todayCN() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderItemIcon(item, unlocked = true) {
  if (!unlocked) return '❓';
  const pixelIcon = item && (GAME_DATA.FISH_PIXEL_ICONS?.[item.id] || item.pixelIcon);
  if (!item || !pixelIcon) return item ? escapeHtml(item.icon) : '';
  const iconType = String(pixelIcon).replace(/[^a-z0-9_-]/gi, '');
  const label = escapeHtml(item.name || '像素鱼');
  return `
    <span class="pixel-icon pixel-icon--${iconType}" role="img" aria-label="${label}" title="${label}">
      <span class="pixel-aura"></span>
      <span class="pixel-tail"></span>
      <span class="pixel-body"></span>
      <span class="pixel-belly"></span>
      <span class="pixel-fin pixel-fin--top"></span>
      <span class="pixel-fin pixel-fin--bottom"></span>
      <span class="pixel-stripe pixel-stripe--one"></span>
      <span class="pixel-stripe pixel-stripe--two"></span>
      <span class="pixel-whisker pixel-whisker--top"></span>
      <span class="pixel-whisker pixel-whisker--bottom"></span>
      <span class="pixel-eye"></span>
      <span class="pixel-eye pixel-eye--back"></span>
      <span class="pixel-horn"></span>
      <span class="pixel-lure"></span>
      <span class="pixel-shell"></span>
      <span class="pixel-claw pixel-claw--left"></span>
      <span class="pixel-claw pixel-claw--right"></span>
      <span class="pixel-leg pixel-leg--one"></span>
      <span class="pixel-leg pixel-leg--two"></span>
      <span class="pixel-leg pixel-leg--three"></span>
      <span class="pixel-leg pixel-leg--four"></span>
      <span class="pixel-tentacle pixel-tentacle--one"></span>
      <span class="pixel-tentacle pixel-tentacle--two"></span>
      <span class="pixel-tentacle pixel-tentacle--three"></span>
      <span class="pixel-tentacle pixel-tentacle--four"></span>
      <span class="pixel-wing pixel-wing--left"></span>
      <span class="pixel-wing pixel-wing--right"></span>
      <span class="pixel-drop"></span>
      <span class="pixel-sparkle pixel-sparkle--one"></span>
      <span class="pixel-sparkle pixel-sparkle--two"></span>
      <span class="pixel-crown"></span>
    </span>
  `;
}

// ====== 穿山甲广告 ======
const CSJ_CONFIG = {
  appId: 'YOUR_APP_ID',
  rewardAdId: 'YOUR_REWARD_AD_ID',
};
const AD_REWARD_DIAMONDS = 50;
const AD_COOLDOWN_MS = 120000;
let adReady = false;
let adLastWatchTime = 0;
let adInstance = null;

function initCSJAd() {
  if (typeof window.H5Union === 'undefined') {
    console.warn('穿山甲SDK未加载');
    return;
  }
  try {
    adInstance = new window.H5Union.RewardedVideoAd({
      appId: CSJ_CONFIG.appId,
      adUnitId: CSJ_CONFIG.rewardAdId,
    });
    adInstance.onLoad(() => { adReady = true; updateAdButtons(); });
    adInstance.onError((err) => { console.warn('广告加载失败', err); adReady = false; updateAdButtons(); });
    adInstance.onClose((res) => {
      if (res && res.isEnded) {
        onAdRewardGranted();
      }
      adInstance.load();
    });
    adInstance.load();
  } catch (e) {
    console.warn('广告初始化失败', e);
  }
}

function isAdOnCooldown() {
  return Date.now() - adLastWatchTime < AD_COOLDOWN_MS;
}

function getAdCooldownRemain() {
  return Math.ceil((AD_COOLDOWN_MS - (Date.now() - adLastWatchTime)) / 1000);
}

function updateAdButtons() {
  const rewardBtn = $('ad-reward-btn');
  if (!rewardBtn) return;
  const sdkMissing = typeof window.H5Union === 'undefined';
  if (isAdOnCooldown()) {
    rewardBtn.disabled = true;
    rewardBtn.classList.add('cooldown');
    rewardBtn.textContent = `冷却中 (${getAdCooldownRemain()}s)`;
  } else if (!adReady && !sdkMissing) {
    rewardBtn.disabled = true;
    rewardBtn.textContent = '广告加载中...';
  } else {
    rewardBtn.disabled = false;
    rewardBtn.classList.remove('cooldown');
    rewardBtn.textContent = '免费领取';
  }
}

function showRewardedAd(callback) {
  if (!adInstance || !adReady) {
    showAdToast('广告尚未加载完成，请稍后再试');
    return;
  }
  if (isAdOnCooldown()) {
    showAdToast(`广告冷却中，请${getAdCooldownRemain()}秒后再试`);
    return;
  }
  adInstance.onClose = (res) => {
    if (res && res.isEnded) {
      adLastWatchTime = Date.now();
      if (callback) callback();
    }
    adInstance.load();
  };
  adInstance.show();
}

function showAdToast(msg) {
  if (phaserRenderer && phaserUi.modal) {
    phaserUi.status = msg;
    return;
  }
  let toast = document.getElementById('ad-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ad-toast';
    toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#ffd700;padding:14px 28px;border-radius:8px;font-size:1.1em;z-index:99999;pointer-events:none;transition:opacity 0.4s;border:1px solid #ffd700;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

function onAdRewardGranted() {
  if (!user) return;
  user.diamonds = (user.diamonds || 0) + AD_REWARD_DIAMONDS;
  user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
  refreshUI();
  saveUser('wallet');
  if (typeof phaserUi !== 'undefined' && phaserUi.modal === 'shop') {
    phaserUi.status = `获得 ${AD_REWARD_DIAMONDS} 钻石`;
  }
  if (!phaserRenderer || phaserUi.modal !== 'shop') showAdToast(`🎉 获得 ${AD_REWARD_DIAMONDS} 钻石！`);
  updateAdButtons();
}

function claimAdReward() {
  if (isAdOnCooldown()) {
    const msg = `广告冷却中，请${getAdCooldownRemain()}秒后再试`;
    if (typeof phaserUi !== 'undefined' && phaserUi.modal === 'shop') phaserUi.status = msg;
    showAdToast(msg);
    return;
  }
  if (!adInstance || !adReady) {
    if (typeof window.H5Union === 'undefined') {
      adLastWatchTime = Date.now();
      onAdRewardGranted();
      return;
    }
    if (typeof phaserUi !== 'undefined' && phaserUi.modal === 'shop') phaserUi.status = '广告尚未加载完成';
    showAdToast('广告尚未加载完成，请稍后再试');
    return;
  }
  if (typeof phaserUi !== 'undefined' && phaserUi.modal === 'shop') phaserUi.status = '广告播放中...';
  showRewardedAd(() => { onAdRewardGranted(); });
}

// 商店广告按钮
document.addEventListener('DOMContentLoaded', () => {
  const rewardBtn = $('ad-reward-btn');
  if (rewardBtn) {
    rewardBtn.onclick = claimAdReward;
  }
  // 冷却倒计时刷新
  setInterval(updateAdButtons, 1000);
});

// ====== 状态 ======
let user = null;
let saveQueue = Promise.resolve();
let saveRevision = 0;
const SAVE_SCOPES = {
  wallet: { endpoint: '/api/player/wallet', fields: ['money', 'diamonds', 'stats'] },
  selection: { endpoint: '/api/player/selection', fields: ['currentBait', 'activePet', 'activeCharacter', 'equippedAccessory'] },
  cast: { endpoint: '/api/player/cast', fields: ['baits', 'currentBait'] },
  catch: {
    endpoint: '/api/player/catch',
    fields: ['money', 'diamonds', 'baits', 'dex', 'stats', 'history', 'dailyStats', 'ownedRods', 'ownedCharacters', 'activeCharacter', 'characterFragments'],
  },
  shop: { endpoint: '/api/shop/purchase', fields: ['money', 'diamonds', 'baits', 'currentBait'] },
  character: { endpoint: '/api/player/characters', fields: ['ownedCharacters', 'activeCharacter', 'characterFragments'] },
  pet: { endpoint: '/api/player/pets', fields: ['ownedPets', 'activePet'] },
  accessory: { endpoint: '/api/player/accessories', fields: ['money', 'accessories', 'equippedAccessory'] },
  rod: { endpoint: '/api/player/rod-skin', fields: ['rodSkin'] },
  share: { endpoint: '/api/player/share-reward', fields: ['money', 'lastShareDate'] },
  full: { endpoint: '/api/save', fields: null },
};
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
const vipAutoBtn = $('vip-auto-btn');

const DIAMOND_JACKPOT_CHANCE = 0.01;
const BLACK_SILK_BAIT_ID = 'black_silk';
const DIVINE_BAIT_ID = 'divine';
const JB_BAIT_ID = 'jb';
const DIVINE_BAIT_DROP_CHANCE = 0.0001;
const JB_BAIT_DROP_CHANCE = 0.05;
const BLACK_SILK_ROD_ID = 'black_silk_rod';
const VIP_AUTO_USERNAMES = ['wakaka'];
const VIP_AUTO_FIRST_IDLE_MS = 1000;
const VIP_AUTO_RESUME_IDLE_MS = 3000;
const VIP_AUTO_TICK_MS = 500;
let accessoryUidCounter = 0;
const vipAuto = {
  enabled: false,
  running: false,
  idleTimer: null,
  tickTimer: null,
  baitId: null,
  nextDelay: VIP_AUTO_FIRST_IDLE_MS,
  noBaitNotified: false,
};

function canUseVipAuto() {
  return !!user && (user.vip === true || VIP_AUTO_USERNAMES.includes(user.username));
}

function getSelectedVipAutoBait() {
  const baitId = baitSelect.value || user?.currentBait;
  return BAITS[baitId] ? baitId : null;
}

function getVipAutoBait() {
  if (!user || !user.baits) return null;
  const baitId = vipAuto.baitId || getSelectedVipAutoBait();
  if (!baitId || !BAITS[baitId]) return null;
  return (user.baits[baitId] || 0) > 0 ? baitId : null;
}

function clearVipAutoIdleTimer() {
  if (vipAuto.idleTimer) clearTimeout(vipAuto.idleTimer);
  vipAuto.idleTimer = null;
}

function clearVipAutoTickTimer() {
  if (vipAuto.tickTimer) clearInterval(vipAuto.tickTimer);
  vipAuto.tickTimer = null;
}

function stopVipAutoRunning() {
  vipAuto.running = false;
  clearVipAutoTickTimer();
  updateVipAutoUI();
}

function stopVipAutoDueToNoBait() {
  vipAuto.enabled = false;
  vipAuto.running = false;
  vipAuto.baitId = null;
  clearVipAutoIdleTimer();
  clearVipAutoTickTimer();
  statusEl.textContent = 'VIP自动钓鱼：当前鱼饵不足，已停止';
  vipAuto.noBaitNotified = true;
  updateVipAutoUI();
}

function resetVipAutoForUser() {
  vipAuto.enabled = false;
  vipAuto.running = false;
  vipAuto.baitId = null;
  vipAuto.nextDelay = VIP_AUTO_FIRST_IDLE_MS;
  vipAuto.noBaitNotified = false;
  clearVipAutoIdleTimer();
  clearVipAutoTickTimer();
  updateVipAutoUI();
}

function scheduleVipAutoStart(delayMs = VIP_AUTO_RESUME_IDLE_MS) {
  clearVipAutoIdleTimer();
  if (!vipAuto.enabled || !user || !canUseVipAuto()) {
    updateVipAutoUI();
    return;
  }
  vipAuto.nextDelay = delayMs;
  vipAuto.idleTimer = setTimeout(() => {
    vipAuto.idleTimer = null;
    startVipAutoRunning();
  }, delayMs);
  updateVipAutoUI();
}

function startVipAutoRunning() {
  if (!vipAuto.enabled || !user || !canUseVipAuto()) {
    stopVipAutoRunning();
    return;
  }
  if (state.phase === 'idle') {
    if (!vipAuto.baitId) vipAuto.baitId = getSelectedVipAutoBait();
  }
  if (state.phase === 'idle' && !getVipAutoBait()) {
    stopVipAutoDueToNoBait();
    return;
  }
  vipAuto.noBaitNotified = false;
  vipAuto.running = true;
  clearVipAutoTickTimer();
  vipAuto.tickTimer = setInterval(runVipAutoTick, VIP_AUTO_TICK_MS);
  runVipAutoTick();
  updateVipAutoUI();
}

function noteVipAutoManualActivity() {
  if (!vipAuto.enabled || !user || !canUseVipAuto()) return;
  stopVipAutoRunning();
  scheduleVipAutoStart(VIP_AUTO_RESUME_IDLE_MS);
}

function maybeResumeVipAutoAfterInventoryChange() {
  if (!vipAuto.enabled || vipAuto.running || !getVipAutoBait()) return;
  scheduleVipAutoStart(VIP_AUTO_RESUME_IDLE_MS);
}

function runVipAutoTick() {
  if (!vipAuto.enabled || !vipAuto.running || !user || !canUseVipAuto()) {
    stopVipAutoRunning();
    return;
  }
  if (state.phase === 'idle') {
    if (!vipAuto.baitId) vipAuto.baitId = getSelectedVipAutoBait();
    const baitId = getVipAutoBait();
    if (!baitId) {
      stopVipAutoDueToNoBait();
      return;
    }
    const resultEl = $('result-overlay');
    if (resultEl) resultEl.classList.add('hidden');
    startCast(baitId, { silent: true });
  } else if (state.phase === 'hooked') {
    startHitbar();
  } else if (state.phase === 'reeling') {
    vipAutoHitbarClick();
  }
}

function updateVipAutoUI() {
  if (!vipAutoBtn) return;
  vipAutoBtn.hidden = !user || !canUseVipAuto();
  vipAutoBtn.classList.toggle('is-enabled', vipAuto.enabled);
  vipAutoBtn.classList.toggle('is-running', vipAuto.running);
  vipAutoBtn.classList.toggle('is-paused', vipAuto.enabled && !vipAuto.running);
  if (!vipAuto.enabled) {
    vipAutoBtn.textContent = 'VIP自动: 关';
  } else if (vipAuto.running) {
    vipAutoBtn.textContent = 'VIP自动: 中';
  } else {
    vipAutoBtn.textContent = getVipAutoBait() ? 'VIP自动: 待' : 'VIP自动: 缺饵';
  }
}

if (vipAutoBtn) {
  vipAutoBtn.onclick = () => {
    if (!user) return;
    if (!canUseVipAuto()) {
      alert('需要充值VIP 才能使用');
      return;
    }
    vipAuto.enabled = !vipAuto.enabled;
    vipAuto.baitId = vipAuto.enabled ? getSelectedVipAutoBait() : null;
    vipAuto.noBaitNotified = false;
    stopVipAutoRunning();
    if (vipAuto.enabled) {
      scheduleVipAutoStart(VIP_AUTO_FIRST_IDLE_MS);
      statusEl.textContent = 'VIP自动钓鱼已开启，1秒无操作后启动';
    } else {
      clearVipAutoIdleTimer();
      statusEl.textContent = 'VIP自动钓鱼已关闭';
      updateVipAutoUI();
    }
  };
}

['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
  document.addEventListener(type, (e) => {
    if (vipAutoBtn && e.target === vipAutoBtn && !vipAuto.enabled) return;
    noteVipAutoManualActivity();
  }, { capture: true, passive: true });
});

// ====== 登录 ======
let phaserLoginStatus = '';
let phaserLoginLoading = false;
let versionData = null;
let versionReady = null;

function sanitizeUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 24);
}

function setLoginStatus(message) {
  phaserLoginStatus = message || '';
  const errEl = $('login-error');
  if (errEl) errEl.textContent = phaserLoginStatus;
}

function focusPhaserCanvas() {
  const phaserCanvas = phaserRenderer?.getCanvas?.();
  if (!phaserCanvas || typeof phaserCanvas.focus !== 'function') return;
  phaserCanvas.tabIndex = 0;
  setTimeout(() => phaserCanvas.focus(), 0);
}

function showLoginScreen() {
  if (phaserRenderer) {
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active', 'phaser-login-active');
    gameScreen.classList.remove('phaser-hud-active');
    focusPhaserCanvas();
  } else {
    loginScreen.classList.add('active');
    gameScreen.classList.remove('active', 'phaser-login-active', 'phaser-hud-active');
  }
}

$('login-btn').onclick = login;
usernameInput.onkeydown = (e) => { if (e.key === 'Enter') login(); };

async function login(options = {}) {
  setLoginStatus('');
  const name = sanitizeUsername(usernameInput.value);
  usernameInput.value = name;
  if (!name) {
    setLoginStatus('请输入有效用户名（字母数字下划线）');
    return;
  }
  if (location.protocol === 'file:') {
    setLoginStatus('检测到 file:// 协议，请通过 http://localhost:3456 访问');
    return;
  }
  phaserLoginLoading = true;
  if (options.source === 'phaser') setLoginStatus('正在连接服务器...');
  try {
    const res = await fetch(API_BASE + '/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const loginData = await res.json();
    const pendingRewards = loginData.pendingRankRewards || [];
    delete loginData.pendingRankRewards;
    user = loginData;
    try { localStorage.setItem('fishing_username', name); } catch (_) {}
    enterGame();
    showPendingRankRewards(pendingRewards);
  } catch (e) {
    setLoginStatus('登录失败: ' + e.message + '（请确认服务器已启动）');
    console.error(e);
  } finally {
    phaserLoginLoading = false;
  }
}

$('logout-btn').onclick = () => {
  saveRevision++;
  resetVipAutoForUser();
  user = null;
  phaserModalQueue.length = 0;
  closePhaserModal();
  try { localStorage.removeItem('fishing_username'); } catch (_) {}
  showLoginScreen();
};

// 自动登录
(async () => {
  try {
    const saved = localStorage.getItem('fishing_username');
    if (saved && location.protocol !== 'file:') {
      usernameInput.value = saved;
      phaserLoginStatus = '正在恢复存档...';
      const res = await fetch(API_BASE + '/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: saved }),
      });
      if (res.ok) {
        const loginData = await res.json();
        const pendingRewards = loginData.pendingRankRewards || [];
        delete loginData.pendingRankRewards;
        user = loginData;
        enterGame();
        showPendingRankRewards(pendingRewards);
      }
      if (!res.ok) phaserLoginStatus = '';
    }
  } catch (_) {
    phaserLoginStatus = '';
  }
})();

function pickUserFields(fields) {
  if (!fields) return user;
  const patch = {};
  for (const field of fields) patch[field] = user[field];
  return patch;
}

async function saveUser(scope = 'full') {
  if (!user) return;
  const config = SAVE_SCOPES[scope] || SAVE_SCOPES.full;
  const username = user.username;
  const body = JSON.stringify({ username, patch: pickUserFields(config.fields) });
  const revision = ++saveRevision;
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    try {
      const res = await fetch(API_BASE + config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.error || 'HTTP ' + res.status);
      if (revision === saveRevision && user && user.username === username) {
        if (saved && saved.patch) {
          Object.assign(user, saved.patch);
        } else {
          user = saved;
        }
        ensureUserDefaults();
      }
      return saved;
    } catch (e) {
      console.warn('save failed', e);
      return null;
    }
  });
  return saveQueue;
}

function enterGame() {
  saveRevision++;
  ensureUserDefaults();
  resetVipAutoForUser();
  loginScreen.classList.remove('active');
  gameScreen.classList.remove('phaser-login-active');
  gameScreen.classList.add('active');
  gameScreen.classList.toggle('phaser-hud-active', !!phaserRenderer);
  setLoginStatus('');
  phaserLoginLoading = false;
  focusPhaserCanvas();
  refreshUI();
}

function ensureUserDefaults() {
  if (!user) return;
  user.money = Math.max(0, Math.floor(user.money || 0));
  user.diamonds = Math.max(0, Math.floor(user.diamonds || 0));
  user.baits = user.baits || {};
  for (const id of Object.keys(BAITS)) {
    user.baits[id] = Math.max(0, Math.floor(user.baits[id] || 0));
  }
  user.dex = user.dex || {};
  user.stats = user.stats || {};
  user.history = user.history || [];
  user.ownedRods = user.ownedRods || [];
  user.ownedPets = user.ownedPets || [];
  user.activePet = user.activePet || null;
  normalizeCharacters();
  normalizeCharacterFragments();
  normalizeAccessories();
  unlockBlackSilkRodIfComplete();
}

function normalizeCharacters() {
  const defaultId = GAME_DATA.DEFAULT_CHARACTER_ID || 'fishing_master';
  const validIds = new Set((GAME_DATA.CHARACTERS || []).map(c => c.id));
  user.ownedCharacters = Array.isArray(user.ownedCharacters) ? user.ownedCharacters.filter(id => validIds.has(id)) : [];
  if (!user.ownedCharacters.includes(defaultId)) user.ownedCharacters.unshift(defaultId);
  if (!validIds.has(user.activeCharacter) || !user.ownedCharacters.includes(user.activeCharacter)) {
    user.activeCharacter = defaultId;
  }
}

function getCharacterShardTarget(characterId) {
  return (GAME_DATA.CHARACTER_SHARD_TARGETS || []).find(t => t.characterId === characterId) || null;
}

function normalizeCharacterFragments() {
  const validTargets = GAME_DATA.CHARACTER_SHARD_TARGETS || [];
  const incoming = user.characterFragments || {};
  const normalized = {};
  for (const target of validTargets) {
    const count = incoming[target.characterId] ?? incoming[target.id] ?? 0;
    normalized[target.characterId] = Math.max(0, Math.floor(count || 0));
  }
  user.characterFragments = normalized;
}

function getCharacterShardCount(characterId) {
  normalizeCharacterFragments();
  return user.characterFragments[characterId] || 0;
}

function synthesizeCharacter(characterId) {
  normalizeCharacters();
  normalizeCharacterFragments();
  const target = getCharacterShardTarget(characterId);
  const character = GAME_DATA.CHARACTERS.find(c => c.id === characterId);
  const required = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
  if (!target || !character || user.ownedCharacters.includes(characterId)) return false;
  if ((user.characterFragments[characterId] || 0) < required) return false;
  user.characterFragments[characterId] -= required;
  user.ownedCharacters.push(characterId);
  user.activeCharacter = characterId;
  statusEl.textContent = `已合成并解锁 ${character.name}`;
  refreshUI();
  saveUser('character');
  renderCharacters();
  return true;
}

function makeAccessoryUid() {
  accessoryUidCounter += 1;
  return 'acc_' + Date.now().toString(36) + '_' + accessoryUidCounter.toString(36);
}

function normalizeAccessories() {
  const defs = GAME_DATA.ACCESSORIES || [];
  const validTypes = new Set(defs.map(a => a.id));
  const items = Array.isArray(user.accessories) ? user.accessories : [];
  user.accessories = items.map((item) => {
    const type = typeof item === 'string' ? item : (item.type || item.id);
    if (!validTypes.has(type)) return null;
    return {
      uid: item.uid || makeAccessoryUid(),
      type,
      star: GAME_DATA.clampAccessoryStar(item.star || 1),
    };
  }).filter(Boolean);
  if (!user.accessories.some(item => item.uid === user.equippedAccessory)) {
    user.equippedAccessory = null;
  }
}

function getEquippedAccessory() {
  if (!user || !user.equippedAccessory) return null;
  return (user.accessories || []).find(item => item.uid === user.equippedAccessory) || null;
}

function getEquippedAccessoryEffects() {
  return GAME_DATA.getAccessoryEffects(getEquippedAccessory());
}

function formatAccessoryEffect(accessory) {
  const effects = GAME_DATA.getAccessoryEffects(accessory);
  const parts = [];
  if (effects.rarityBoost) parts.push(`稀有鱼概率 +${Math.round(effects.rarityBoost * 1000) / 10}%`);
  if (effects.speedSlow) parts.push(`钓鱼条速度 -${Math.round(effects.speedSlow * 1000) / 10}%`);
  return parts.join(' / ') || '无加成';
}

function renderCharacterSprite(character) {
  if (character.spriteImage) {
    return `
      <span class="character-sprite character-sprite--sheet character-sprite--${character.sprite}" style="--char-sheet:url('${escapeHtml(character.spriteImage)}')" role="img" aria-label="${escapeHtml(character.name)}"></span>
    `;
  }
  const coat = character.colors?.coat || '#2563eb';
  const trim = character.colors?.trim || '#facc15';
  return `
    <span class="character-sprite character-sprite--${character.sprite}" style="--char-coat:${coat};--char-trim:${trim}" role="img" aria-label="${escapeHtml(character.name)}">
      <span class="char-shadow"></span>
      <span class="char-leg char-leg--left"></span>
      <span class="char-leg char-leg--right"></span>
      <span class="char-body"></span>
      <span class="char-coat"></span>
      <span class="char-arm char-arm--left"></span>
      <span class="char-arm char-arm--right"></span>
      <span class="char-head"></span>
      <span class="char-hair"></span>
      <span class="char-face"></span>
      <span class="char-hat"></span>
      <span class="char-prop char-prop--one"></span>
      <span class="char-prop char-prop--two"></span>
      <span class="char-spark char-spark--one"></span>
      <span class="char-spark char-spark--two"></span>
    </span>
  `;
}

function refreshUI() {
  playerNameEl.textContent = user.username;
  playerMoneyEl.textContent = '💰 ' + user.money;
  playerDiamondsEl.textContent = '💎 ' + user.diamonds;
  if (typeof updateRodInfo === 'function') updateRodInfo();
  if (typeof updateMobileBtn === 'function') updateMobileBtn();
  if (typeof updateVipAutoUI === 'function') updateVipAutoUI();
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
  updateVipAutoUI();
}

baitSelect.onchange = () => {
  user.currentBait = baitSelect.value;
  if (vipAuto.enabled) vipAuto.baitId = getSelectedVipAutoBait();
  updateBaitCount();
  saveUser('selection');
};

// ====== 画布渲染（第一视角） ======
const phaserRenderer = window.FishingPhaser || null;
const canvas = phaserRenderer?.getCanvas?.() || $('game');
const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
if (ctx) ctx.imageSmoothingEnabled = false;
let lastPhaserUiActionAt = 0;
const phaserUi = {
  modal: null,
  status: '',
  data: null,
};
const phaserModalQueue = [];
if (phaserRenderer?.setActionHandler) {
  phaserRenderer.setActionHandler(handlePhaserAction);
}
if (phaserRenderer && !user) showLoginScreen();

const W = 640;
const H = 360;

function px(x, y, w, h, color) {
  if (!ctx) return;
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w, h);
}

let hookX = W / 2;
let hookY = H * 0.55;
let lineSlack = 0;

function render() {
  const t = Date.now() / 1000;
  if (phaserRenderer) {
    const activePet = user && user.activePet ? GAME_DATA.PETS.find(p => p.id === user.activePet) : null;
    const rodSkin = user ? GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods) : GAME_DATA.ROD_SKINS[0];
    const accessory = getEquippedAccessory();
    const accessoryDef = accessory ? GAME_DATA.getAccessoryDef(accessory.type) : null;
    phaserRenderer.render({
      time: t,
      phase: state.phase,
      hookX,
      hookY,
      rodSkin,
      pet: activePet,
      accessoryDef,
      accessoryStar: accessory ? GAME_DATA.clampAccessoryStar(accessory.star) : 1,
      hud: getPhaserHudSnapshot(),
      login: getPhaserLoginSnapshot(),
      modal: getPhaserModalSnapshot(),
      hitbar: user ? getPhaserHitbarSnapshot() : null,
    });
    return;
  }
  if (!ctx) return;

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
  drawAccessoryRodParticles(getEquippedAccessory(), rodBaseX, rodBaseY, rodTipX, rodTipY, t);

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

  // 宠物渲染（像素风格带手脚）
  if (user && user.activePet) {
    const pet = GAME_DATA.PETS.find(p => p.id === user.activePet);
    if (pet) {
      const bx = pet.canvasX * W;
      const by = pet.canvasY * H + Math.sin(t * 2) * 2;
      const s = 4;
      const c = pet.colors;
      const legSwing = Math.sin(t * 4) * 2;
      // 耳朵
      if (c.ear) {
        px(bx - s*2, by - s*7, s, s*2, c.ear);
        px(bx + s*2, by - s*7, s, s*2, c.ear);
      }
      // 头
      px(bx - s*2, by - s*5, s*5, s*4, c.body);
      // 眼睛
      px(bx - s, by - s*4, s, s, c.eye || '#111');
      px(bx + s, by - s*4, s, s, c.eye || '#111');
      // 鼻子/嘴
      px(bx, by - s*2.5, s, Math.ceil(s*0.5), c.nose || '#333');
      // 身体
      px(bx - s*1.5, by - s, s*4, s*4, c.body);
      // 肚子
      if (c.belly) px(bx - s*0.5, by, s*2, s*2, c.belly);
      // 手臂（左右摆动）
      const armSwing = Math.sin(t * 3) * 1.5;
      px(bx - s*3, by - s*0.5 + armSwing, s, s*3, c.limb || c.body);
      px(bx + s*2.5, by - s*0.5 - armSwing, s, s*3, c.limb || c.body);
      // 腿（走路摆动）
      px(bx - s, by + s*3 + legSwing, s, s*2, c.limb || c.body);
      px(bx + s, by + s*3 - legSwing, s, s*2, c.limb || c.body);
      // 尾巴
      if (c.tail) {
        const tailY = Math.sin(t * 5) * 2;
        px(bx + s*2.5, by + s, s*2, s, c.tail);
        px(bx + s*3.5, by + s*0.5 + tailY, s, s, c.tail);
      }
      // 特殊装饰
      if (c.extra) c.extra(ctx, bx, by, s, t);
    }
  }

  // 状态消息
  if (state.phase === 'waiting') {
    drawText('等待鱼上钩...', W / 2, H - 24, '#fff', 12);
  } else if (state.phase === 'hooked') {
    drawText('!!! 鱼上钩了 !!!', W / 2, H - 24, '#ff5722', 16);
  }
}

function drawAccessoryRodParticles(accessory, rodBaseX, rodBaseY, rodTipX, rodTipY, t) {
  const def = accessory && GAME_DATA.getAccessoryDef(accessory.type);
  if (!def) return;
  const star = GAME_DATA.clampAccessoryStar(accessory.star);
  const count = Math.min(18, 5 + Math.floor(star / 2));
  for (let i = 0; i < count; i++) {
    const frac = (i / count + t * (0.22 + star * 0.004)) % 1;
    const wave = Math.sin(t * 4 + i * 1.7) * (3 + star * 0.12);
    const x = rodBaseX + (rodTipX - rodBaseX) * frac + wave;
    const y = rodBaseY + (rodTipY - rodBaseY) * frac + Math.cos(t * 3 + i) * 3;
    const alpha = 0.35 + Math.sin(t * 5 + i) * 0.25;
    if (def.particle === 'tide') {
      px(x - 3, y - 1, 6, 2, `rgba(78,201,176,${alpha})`);
      px(x - 1, y - 3, 2, 6, `rgba(102,230,255,${alpha * 0.7})`);
    } else if (def.particle === 'star') {
      px(x - 1, y - 5, 2, 10, `rgba(255,215,0,${alpha})`);
      px(x - 5, y - 1, 10, 2, `rgba(255,215,0,${alpha})`);
    } else {
      px(x - 2, y - 2, 4, 4, `rgba(102,230,255,${alpha})`);
      px(x + 2, y, 2, 2, `rgba(255,255,255,${alpha * 0.8})`);
    }
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

function getPhaserLoginSnapshot() {
  if (!phaserRenderer || user) return null;
  return {
    type: 'login',
    title: '像素钓鱼',
    username: usernameInput.value || '',
    status: phaserLoginStatus,
    loading: phaserLoginLoading,
    version: versionData?.version || '',
  };
}

function getPhaserHudSnapshot() {
  if (!phaserRenderer || !user) return null;
  const baitId = state.castBait || baitSelect.value || user.currentBait || 'worm';
  const bait = BAITS[baitId] || BAITS.worm;
  const rod = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  const actions = [
    ['shop', '商店'],
    ['dex', '图鉴'],
    ['rod', '鱼竿'],
    ['character', '角色'],
    ['accessory', '首饰'],
    ['pet', '宠物'],
    ['rank', '排行'],
    ['gacha', '抽奖'],
    ['redeem', '兑换'],
    ['share', '分享'],
    ['logout', '退出'],
  ].map(([action, label]) => ({ action, label }));
  return {
    username: user.username,
    money: user.money,
    diamonds: user.diamonds,
    version: versionData?.version || '',
    phase: state.phase,
    actions,
    baitName: bait.name,
    baitCount: user.baits[baitId] || 0,
    baitColor: bait.color || '#ffd700',
    rodName: `鱼竿：${rod ? rod.name : '新手竿'}`,
    status: statusEl.textContent,
    castLabel: state.phase === 'idle' ? '抛竿钓鱼' : (state.phase === 'hooked' ? '拉鱼' : state.phase === 'reeling' ? '击中' : '等待中'),
    vipVisible: canUseVipAuto(),
    vipLabel: vipAutoBtn ? vipAutoBtn.textContent : 'VIP自动',
    vipActive: vipAuto.enabled || vipAuto.running,
  };
}

function getPhaserAdLabel() {
  if (isAdOnCooldown()) return `冷却中 ${getAdCooldownRemain()}s`;
  if (!adReady && typeof window.H5Union !== 'undefined') return '广告加载中';
  return `看广告领 ${AD_REWARD_DIAMONDS} 钻石`;
}

function getPhaserModalSnapshot() {
  if (!phaserRenderer || !user || !phaserUi.modal) return null;
  if (phaserUi.modal === 'announcement') return getPhaserAnnouncementSnapshot();
  if (phaserUi.modal === 'rank-reward') return getPhaserRankRewardSnapshot();
  if (phaserUi.modal === 'shop') {
    return {
      type: 'shop',
      money: user.money,
      diamonds: user.diamonds,
      status: phaserUi.status,
      adLabel: getPhaserAdLabel(),
      adDisabled: isAdOnCooldown() || (!adReady && typeof window.H5Union !== 'undefined'),
      items: Object.entries(BAITS)
        .filter(([, bait]) => bait.purchasable !== false)
        .map(([id, bait]) => ({
          id,
          name: bait.name,
          desc: bait.desc,
          color: bait.color,
          price: bait.price,
          currencyIcon: bait.currency === 'diamonds' ? '💎' : '💰',
          owned: user.baits[id] || 0,
        })),
    };
  }
  if (phaserUi.modal === 'result' || phaserUi.modal === 'miss') {
    return phaserUi.data ? { ...phaserUi.data, status: phaserUi.status } : null;
  }
  if (phaserUi.modal === 'dex') return getPhaserDexSnapshot();
  if (phaserUi.modal === 'rod') return getPhaserRodSnapshot();
  if (phaserUi.modal === 'character') return getPhaserCharacterSnapshot();
  if (phaserUi.modal === 'pet') return getPhaserPetSnapshot();
  if (phaserUi.modal === 'accessory') return getPhaserAccessorySnapshot();
  if (phaserUi.modal === 'rank') return getPhaserRankSnapshot();
  if (phaserUi.modal === 'gacha') return getPhaserGachaSnapshot();
  if (phaserUi.modal === 'redeem') return getPhaserRedeemSnapshot();
  if (phaserUi.modal === 'share') return getPhaserShareSnapshot();
  return null;
}

function openPhaserModal(type, data = null) {
  if (!phaserRenderer) return false;
  phaserUi.modal = type;
  phaserUi.status = '';
  phaserUi.data = data;
  announceOverlay?.classList.add('hidden');
  shopOverlay?.classList.add('hidden');
  resultOverlay?.classList.add('hidden');
  dexOverlay?.classList.add('hidden');
  rodOverlay?.classList.add('hidden');
  characterOverlay?.classList.add('hidden');
  petOverlay?.classList.add('hidden');
  accessoryOverlay?.classList.add('hidden');
  rankOverlay?.classList.add('hidden');
  gachaOverlay?.classList.add('hidden');
  redeemOverlay?.classList.add('hidden');
  shareOverlay?.classList.add('hidden');
  updateAdButtons();
  return true;
}

function openOrQueuePhaserModal(type, data = null) {
  if (!phaserRenderer) return false;
  if (phaserUi.modal) {
    phaserModalQueue.push({ type, data });
    return true;
  }
  return openPhaserModal(type, data);
}

function closePhaserModal() {
  phaserUi.modal = null;
  phaserUi.status = '';
  phaserUi.data = null;
  const next = phaserModalQueue.shift();
  if (next) setTimeout(() => openPhaserModal(next.type, next.data), 0);
}

function triggerDomButton(id) {
  const target = $(id);
  if (target && typeof target.click === 'function') target.click();
}

function selectAdjacentBait(offset) {
  if (!user || state.phase !== 'idle') return;
  const ids = Object.keys(BAITS).filter((id) => (user.baits[id] || 0) > 0);
  if (ids.length === 0) return;
  const current = baitSelect.value || user.currentBait || ids[0];
  const currentIndex = Math.max(0, ids.indexOf(current));
  const next = ids[(currentIndex + offset + ids.length) % ids.length];
  user.currentBait = next;
  baitSelect.value = next;
  if (vipAuto.enabled) vipAuto.baitId = getSelectedVipAutoBait();
  updateBaitCount();
  refreshUI();
  saveUser('selection');
}

function handlePhaserAction(action, payload = null) {
  lastPhaserUiActionAt = Date.now();
  if (!user) {
    if (action === 'login-submit') return login({ source: 'phaser' });
    if (action === 'login-clear') {
      usernameInput.value = '';
      setLoginStatus('');
    }
    return;
  }
  if (phaserUi.modal) {
    if (action === 'modal-close') return closePhaserModal();
    if (action === 'shop-buy') return purchaseBait(payload?.id, payload?.count || 1, { source: 'phaser' });
    if (action === 'shop-ad-reward') return claimAdReward();
    if (action === 'result-retry') return retryAfterMissWithAd({ source: 'phaser' });
    if (action === 'dex-tab') return setPhaserDexTab(payload?.id);
    if (action === 'dex-page') return setPhaserDexPage(payload?.delta || 0);
    if (action === 'rod-equip') return equipRodSkin(payload?.id, { source: 'phaser' });
    if (action === 'rod-page') return setPhaserRodPage(payload?.delta || 0);
    if (action === 'character-equip') return equipCharacter(payload?.id, { source: 'phaser' });
    if (action === 'character-compose') return composeCharacter(payload?.id, { source: 'phaser' });
    if (action === 'pet-toggle') return togglePet(payload?.id, { source: 'phaser' });
    if (action === 'accessory-toggle') return toggleAccessory(payload?.uid, { source: 'phaser' });
    if (action === 'accessory-upgrade') return upgradeAccessory(payload?.uid, { source: 'phaser' });
    if (action === 'accessory-page') return setPhaserAccessoryPage(payload?.delta || 0);
    if (action === 'rank-tab') return setPhaserRankTab(payload?.id);
    if (action === 'rank-page') return setPhaserRankPage(payload?.delta || 0);
    if (action === 'rank-refresh') return loadLeaderboard({ source: 'phaser' });
    if (action === 'gacha-tab') return setGachaTab(payload?.currency, { source: 'phaser' });
    if (action === 'gacha-season') return setGachaSeason(payload?.currency, payload?.season, { source: 'phaser' });
    if (action === 'gacha-draw') return doGacha(payload?.count || 1, payload?.currency, payload?.season, { source: 'phaser' });
    if (action === 'redeem-submit') return redeemCode({ source: 'phaser' });
    if (action === 'redeem-clear') return clearPhaserRedeemCode();
    if (action === 'redeem-paste') return pastePhaserRedeemCode();
    if (action === 'share-copy') return copyShareLink({ source: 'phaser' });
    if (action === 'announcement-page') return setPhaserAnnouncementPage(payload?.delta || 0);
    return;
  }
  if (action === 'cast') {
    if (state.phase === 'idle') startCast(null, { source: 'phaser' });
    else if (state.phase === 'hooked') startHitbar();
    else if (state.phase === 'reeling') hitbarClick();
    return;
  }
  if (action === 'bait-prev') return selectAdjacentBait(-1);
  if (action === 'bait-next') return selectAdjacentBait(1);
  if (action === 'vip-auto') return triggerDomButton('vip-auto-btn');
  if (action === 'version') {
    if (versionData) showAnnouncement('');
    return;
  }
  if (action === 'shop') return openPhaserModal('shop');
  if (action === 'dex') return openPhaserDex();
  if (action === 'rod') return openPhaserRod();
  if (action === 'character') return openPhaserCharacter();
  if (action === 'pet') return openPhaserPet();
  if (action === 'accessory') return openPhaserAccessory();
  if (action === 'rank') return openPhaserRank();
  if (action === 'gacha') return openPhaserGacha();
  if (action === 'redeem') return openPhaserRedeem();
  if (action === 'share') return openPhaserShare();
  const domButtons = {
    logout: 'logout-btn',
  };
  if (domButtons[action]) triggerDomButton(domButtons[action]);
}

function loop() {
  if (user || phaserRenderer) render();
  requestAnimationFrame(loop);
}
loop();

// ====== 钓鱼流程 ======
let waitTimer = null;

castBtn.onclick = () => startCast();

function startCast(preferredBaitId = null, options = {}) {
  if (!user || state.phase !== 'idle') return false;
  const baitId = BAITS[preferredBaitId] ? preferredBaitId : (baitSelect.value || user.currentBait);
  if (!user.baits[baitId] || user.baits[baitId] <= 0) {
    const msg = '没有鱼饵了，去商店买点吧！';
    if (options.source === 'phaser') statusEl.textContent = msg;
    else if (!options.silent) alert(msg);
    return false;
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
  saveUser('cast');

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
  return true;
}

function handlePhaserLoginKey(e) {
  if (!phaserRenderer || user) return false;
  if (e.key === 'Enter') {
    e.preventDefault();
    login({ source: 'phaser' });
    return true;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    usernameInput.value = usernameInput.value.slice(0, -1);
    setLoginStatus('');
    return true;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    usernameInput.value = '';
    setLoginStatus('');
    return true;
  }
  if (e.key.length === 1 && /^[a-zA-Z0-9_-]$/.test(e.key) && usernameInput.value.length < 24) {
    e.preventDefault();
    usernameInput.value = sanitizeUsername(usernameInput.value + e.key);
    setLoginStatus('');
    return true;
  }
  return false;
}

window.addEventListener('keydown', (e) => {
  if (handlePhaserLoginKey(e)) return;
  if (phaserUi.modal === 'redeem' && handlePhaserRedeemKey(e)) return;
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
  if (Date.now() - lastPhaserUiActionAt < 120) return;
  if (state.phase === 'hooked') startHitbar();
  else if (state.phase === 'reeling') hitbarClick();
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

function getPhaserHitbarSnapshot() {
  if (!phaserRenderer || !hb.active) return null;
  return {
    active: hb.active,
    hitsNeeded: hb.hitsNeeded,
    hits: hb.hits,
    cursorPos: hb.cursorPos,
    zoneStart: hb.zoneStart,
    zoneWidth: hb.zoneWidth,
    timeLeft: hb.timeLeft,
    message: hitbarMsg ? hitbarMsg.textContent : '',
    color: hitbarMsg ? hitbarMsg.style.color : '#ffae42',
  };
}

function startHitbar() {
  if (state.phase !== 'hooked') return;
  if (waitTimer) clearTimeout(waitTimer);
  state.phase = 'reeling';

  // 提前 roll 出钓获结果
  const currentRodId = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods).id;
  const accessoryEffects = getEquippedAccessoryEffects();
  const result = rollCatch(state.castBait || user.currentBait, currentRodId, accessoryEffects, user.ownedCharacters);
  hb.catch = result;
  const rarity = result.kind === 'fish' ? result.item.rarity : result.kind;
  hb.hitsNeeded = HITS_BY_RARITY[rarity] || 2;
  hb.hits = 0;
  hb.cursorPos = 0;
  hb.cursorDir = 1;

  // 难度参数：稀有度越高，光标越快、红区越窄
  const difficultyRarity = result.kind === 'character_shard' ? 'legendary' : rarity;
  const difficulty = {
    trash: { speed: 0.6, zone: 0.25 },
    common: { speed: 0.8, zone: 0.22 },
    rare: { speed: 1.1, zone: 0.18 },
    legendary: { speed: 1.5, zone: 0.13 },
    hidden: { speed: 1.9, zone: 0.10 },
    treasure: { speed: 1.2, zone: 0.16 },
    limited: { speed: 1.3, zone: 0.16 },
    rod_exclusive: { speed: 1.4, zone: 0.14 },
    character_shard: { speed: 1.5, zone: 0.13 },
  }[difficultyRarity] || { speed: 0.8, zone: 0.22 };
  hb.cursorSpeed = difficulty.speed;
  const rodSkin = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  if (rodSkin.speedBonus && rodSkin.speedBonus[difficultyRarity]) {
    hb.cursorSpeed *= (1 + rodSkin.speedBonus[difficultyRarity]);
  }
  if (accessoryEffects.speedSlow) {
    hb.cursorSpeed *= Math.max(0.35, 1 - accessoryEffects.speedSlow);
  }
  hb.zoneWidth = difficulty.zone;
  hb.timeLeft = 12;

  hitbarMsg.textContent = result.kind === 'character_shard'
    ? `角色碎片上钩了！连续命中红区 ${hb.hitsNeeded} 次！`
    : `${RARITY_NAME[rarity]}级鱼上钩了！连续命中红区 ${hb.hitsNeeded} 次！`;
  hitbarMsg.style.color = RARITY_COLOR[rarity];
  hitsNeededEl.textContent = hb.hitsNeeded;
  hitsCurrentEl.textContent = 0;
  if (!phaserRenderer) hitbarOverlay.classList.remove('hidden');
  else hitbarOverlay.classList.add('hidden');
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

  if (!phaserRenderer) {
    const barW = hitbarZoneEl.parentElement.offsetWidth;
    hitbarZoneEl.style.left = (hb.zoneStart * barW) + 'px';
    hitbarZoneEl.style.width = (hb.zoneWidth * barW) + 'px';
    hitbarCursorEl.style.left = (hb.cursorPos * barW) + 'px';
  }
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

function vipAutoHitbarClick() {
  if (!hb.active) return;
  hb.cursorPos = Math.random();
  hitbarClick();
}

function endHitbar(success, failMsg) {
  hb.active = false;
  if (hb.timerId) clearInterval(hb.timerId);
  if (hb.rafId) cancelAnimationFrame(hb.rafId);
  hitbarOverlay.classList.add('hidden');
  state.phase = 'idle';
  state.castBait = null;
  if (typeof updateMobileBtn === 'function') updateMobileBtn();

  if (success) {
    applyCatch(hb.catch);
    showResult(hb.catch);
    playCatchRodEffect();
  } else {
    showMiss(failMsg || '操作失败，鱼跑了');
  }
  hb.catch = null;
}

// ====== 宠物加成 ======
const PET_BONUS = {
  cat: { coins: 10 }, dog: { coins: 10 },
  parrot: { diamonds: 1 }, penguin: { diamonds: 1 }, rabbit: { diamonds: 1 }, fox: { diamonds: 1 },
  dragon: { diamonds: 5 }, unicorn: { diamonds: 5 },
};

function getPetBonus() {
  if (!user || !user.activePet) return { coins: 0, diamonds: 0 };
  const b = PET_BONUS[user.activePet];
  return b ? { coins: b.coins || 0, diamonds: b.diamonds || 0 } : { coins: 0, diamonds: 0 };
}

// ====== 应用钓获 ======
function applyCatch(c) {
  const isCharacterShardCatch = c.kind === 'character_shard';
  const bonusDiamonds = isCharacterShardCatch ? 0 : rollDiamondReward();
  const saleDiamonds = c.diamondValue || 0;
  const baitDrops = isCharacterShardCatch ? [] : rollBonusBaitDrops();
  const petBonus = isCharacterShardCatch ? { coins: 0, diamonds: 0 } : getPetBonus();
  const shardUnlock = applyCharacterShardCatch(c);
  c.petBonusCoins = petBonus.coins;
  c.petBonusDiamonds = petBonus.diamonds;
  c.value += petBonus.coins;
  user.money += c.value;
  user.diamonds = (user.diamonds || 0) + saleDiamonds + bonusDiamonds + petBonus.diamonds;
  for (const drop of baitDrops) {
    user.baits[drop.id] = (user.baits[drop.id] || 0) + drop.count;
  }
  user.stats.totalCatches = (user.stats.totalCatches || 0) + 1;
  user.stats.totalEarned = (user.stats.totalEarned || 0) + c.value;
  user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + saleDiamonds + bonusDiamonds + petBonus.diamonds;
  user.stats.totalWeight = +(((user.stats.totalWeight || 0) + (c.weight || 0)).toFixed(2));
  // 今日统计
  const todayKey = todayCN();
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
  const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
  user.history.push({
    t: Date.now(),
    kind: c.kind,
    name: c.item.name,
    rarity,
    weight: c.weight,
    value: c.value,
    diamondValue: saleDiamonds,
    diamonds: bonusDiamonds,
    baitDrops,
    baitDrop: baitDrops[0] || null,
    characterId: c.characterId || null,
    shardCount: c.shardCount || 0,
  });
  const unlockedBlackSilkRod = unlockBlackSilkRodIfComplete();
  c.diamonds = bonusDiamonds;
  c.baitDrops = baitDrops;
  c.baitDrop = baitDrops[0] || null;
  c.unlockedCharacter = shardUnlock;
  c.unlockedRod = unlockedBlackSilkRod ? BLACK_SILK_ROD_ID : null;
  if (user.history.length > 50) user.history.shift();
  refreshUI();
  saveUser('catch');
}

function rollDiamondReward() {
  if (Math.random() < DIAMOND_JACKPOT_CHANCE) return 100;
  return 1 + Math.floor(Math.random() * 3);
}

function rollBonusBaitDrops() {
  const drops = [];
  if (Math.random() < DIVINE_BAIT_DROP_CHANCE) drops.push({ id: DIVINE_BAIT_ID, count: 1 });
  if (Math.random() < JB_BAIT_DROP_CHANCE) drops.push({ id: JB_BAIT_ID, count: 1 });
  return drops;
}

function applyCharacterShardCatch(c) {
  if (c.kind !== 'character_shard' || !c.characterId) return null;
  normalizeCharacters();
  normalizeCharacterFragments();
  const target = getCharacterShardTarget(c.characterId);
  const character = GAME_DATA.CHARACTERS.find(ch => ch.id === c.characterId);
  if (!target || !character) return null;
  if (!user.ownedCharacters.includes(c.characterId)) {
    user.characterFragments[c.characterId] = (user.characterFragments[c.characterId] || 0) + (c.shardCount || 1);
  }
  c.character = character;
  c.shardName = target.name;
  c.shardProgress = user.characterFragments[c.characterId] || 0;
  c.shardsRequired = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
  if (!user.ownedCharacters.includes(c.characterId) && c.shardProgress >= c.shardsRequired) {
    user.characterFragments[c.characterId] -= c.shardsRequired;
    user.ownedCharacters.push(c.characterId);
    user.activeCharacter = c.characterId;
    c.shardProgress = user.characterFragments[c.characterId] || 0;
    return c.characterId;
  }
  return null;
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
  if (phaserRenderer) return;
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
$('result-close').onclick = () => { resultOverlay.classList.add('hidden'); closePhaserModal(); };
$('result-close-bottom').onclick = () => { resultOverlay.classList.add('hidden'); closePhaserModal(); };

function getCatchResultDetails(c) {
  const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
  const color = RARITY_COLOR[rarity] || '#ffd700';
  const character = c.character || (c.characterId ? GAME_DATA.CHARACTERS.find(ch => ch.id === c.characterId) : null);
  const detailLines = [];
  if (c.kind === 'fish') {
    detailLines.push(`重量：${c.weight} kg`);
    detailLines.push(c.diamondValue ? `售价：${c.diamondValue} 钻石` : `单价：${c.item.price} 金/kg`);
  } else if (c.kind === 'character_shard') {
    const required = c.shardsRequired || GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
    const progress = c.unlockedCharacter ? required : (c.shardProgress || 0);
    const characterName = character ? character.name : c.item.name;
    detailLines.push(`${characterName} 碎片：${progress} / ${required}`);
  }
  const baitDrops = c.baitDrops || (c.baitDrop ? [c.baitDrop] : []);
  const rewardLines = [];
  if (c.value) rewardLines.push(`+${c.value} 金币`);
  if (c.diamondValue) rewardLines.push(`+${c.diamondValue} 钻石`);
  if (c.diamonds) rewardLines.push(`额外 +${c.diamonds} 钻石`);
  for (const drop of baitDrops) rewardLines.push(`获得 ${BAITS[drop.id].name} ×${drop.count}`);
  if (c.unlockedRod) rewardLines.push('解锁黑丝鱼竿');
  if (c.unlockedCharacter && character) rewardLines.push(`解锁角色 ${character.name}`);
  if (c.petBonusCoins) rewardLines.push(`宠物加成 +${c.petBonusCoins} 金币`);
  if (c.petBonusDiamonds) rewardLines.push(`宠物加成 +${c.petBonusDiamonds} 钻石`);
  return {
    type: 'result',
    title: '钓获成功',
    icon: c.item.icon || '🎣',
    name: c.item.name,
    rarity,
    rarityName: RARITY_NAME[rarity] || rarity,
    color,
    character,
    detailLines,
    rewardLines,
    baitDrops,
    statusText: `钓到了 ${c.item.name}！${rewardLines.join('，')}`,
  };
}

function getMissResultDetails(msg) {
  const canRetry = !isAdOnCooldown();
  return {
    type: 'miss',
    title: '鱼跑了',
    icon: '💧',
    message: msg,
    canRetry,
    retryLabel: canRetry ? '看广告再来一次' : `冷却中 ${getAdCooldownRemain()}s`,
  };
}

function retryAfterMissWithAd(options = {}) {
  const source = options.source || 'dom';
  if (isAdOnCooldown()) {
    const msg = `广告冷却中，请${getAdCooldownRemain()}秒后再试`;
    if (source === 'phaser') phaserUi.status = msg;
    showAdToast(msg);
    return;
  }
  const grantRewardAndRetry = (showToast = false) => {
    user.diamonds = (user.diamonds || 0) + AD_REWARD_DIAMONDS;
    user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
    refreshUI();
    saveUser('wallet');
    resultOverlay.classList.add('hidden');
    closePhaserModal();
    if (showToast && source !== 'phaser') showAdToast(`🎉 获得 ${AD_REWARD_DIAMONDS} 钻石，再来一次！`);
    startCast(null, source === 'phaser' ? { source: 'phaser' } : {});
  };
  if (typeof window.H5Union === 'undefined') {
    adLastWatchTime = Date.now();
    grantRewardAndRetry(true);
    return;
  }
  if (source === 'phaser') phaserUi.status = '广告播放中...';
  showRewardedAd(() => grantRewardAndRetry(false));
}

function showResult(c) {
  const retryBox = $('ad-retry-box');
  if (retryBox) retryBox.classList.add('hidden');
  const resultDetails = getCatchResultDetails(c);
  if (phaserRenderer) {
    openPhaserModal('result', resultDetails);
    statusEl.textContent = resultDetails.statusText;
    return;
  }
  const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
  const color = RARITY_COLOR[rarity];
  const character = c.character || (c.characterId ? GAME_DATA.CHARACTERS.find(ch => ch.id === c.characterId) : null);
  let weightLine = '';
  if (c.kind === 'fish') {
    const priceLine = c.diamondValue
      ? `<div>售价：${c.diamondValue} 钻石</div>`
      : `<div>单价：${c.item.price} 金/kg</div>`;
    weightLine = `<div>重量：${c.weight} kg</div>${priceLine}`;
  } else if (c.kind === 'character_shard') {
    const required = c.shardsRequired || GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
    const progress = c.unlockedCharacter ? required : (c.shardProgress || 0);
    const characterName = character ? character.name : c.item.name;
    weightLine = `<div>${escapeHtml(characterName)} 碎片：${progress} / ${required}</div>`;
  }
  const coinLine = c.value ? `<div class="value">+${c.value} 金币</div>` : '';
  const saleDiamondLine = c.diamondValue ? `<div class="diamond-value">+${c.diamondValue} 钻石</div>` : '';
  const diamondLine = c.diamonds ? `<div class="diamond-value">额外 +${c.diamonds} 钻石</div>` : '';
  const baitDrops = resultDetails.baitDrops;
  const baitDropLine = baitDrops.map(drop => `<div class="bait-drop">获得 ${BAITS[drop.id].name} ×${drop.count}</div>`).join('');
  const rodLine = c.unlockedRod ? '<div class="rod-unlock">解锁 黑丝鱼竿</div>' : '';
  const characterLine = c.unlockedCharacter && character
    ? `<div class="character-unlock">解锁角色 ${escapeHtml(character.name)}</div>`
    : '';
  const petCoinLine = c.petBonusCoins ? `<div class="pet-bonus">🐾 宠物加成 +${c.petBonusCoins} 金币</div>` : '';
  const petDiamondLine = c.petBonusDiamonds ? `<div class="pet-bonus">🐾 宠物加成 +${c.petBonusDiamonds} 钻石</div>` : '';
  resultContent.innerHTML = `
    <div class="result-fish">
      <span class="icon">${renderItemIcon(c.item)}</span>
      <div class="name" style="color:${color}">${c.item.name}</div>
      <div class="rarity" style="color:${color}">★ ${RARITY_NAME[rarity]} ★</div>
      <div class="stats">${weightLine}</div>
      ${coinLine}
      ${saleDiamondLine}
      ${diamondLine}
      ${baitDropLine}
      ${rodLine}
      ${characterLine}
      ${petCoinLine}
      ${petDiamondLine}
    </div>
  `;
  resultOverlay.classList.remove('hidden');
  statusEl.textContent = resultDetails.statusText;
}

function showMiss(msg) {
  if (phaserRenderer) {
    openPhaserModal('miss', getMissResultDetails(msg));
    statusEl.textContent = msg;
    return;
  }
  resultContent.innerHTML = `
    <div class="result-fish miss">
      <span class="icon">💧</span>
      <div class="name">${msg}</div>
    </div>
  `;
  const retryBox = $('ad-retry-box');
  const retryBtn = $('ad-retry-btn');
  if (retryBox && retryBtn && !isAdOnCooldown()) {
    retryBox.classList.remove('hidden');
    retryBtn.disabled = false;
    retryBtn.onclick = () => {
      retryBox.classList.add('hidden');
      retryAfterMissWithAd({ source: 'dom' });
    };
  } else if (retryBox) {
    retryBox.classList.add('hidden');
  }
  resultOverlay.classList.remove('hidden');
  statusEl.textContent = msg;
}

// ====== 商店 ======
const shopOverlay = $('shop-overlay');
$('shop-btn').onclick = () => {
  if (openPhaserModal('shop')) return;
  renderShop();
  shopOverlay.classList.remove('hidden');
};

function purchaseBait(id, n, options = {}) {
  if (!user || !BAITS[id]) return false;
  const count = Math.max(1, Math.floor(n || 1));
  const bait = BAITS[id];
  const cost = bait.price * count;
  const isDiamond = bait.currency === 'diamonds';
  const source = options.source || 'dom';
  const fail = (msg) => {
    if (source === 'phaser') phaserUi.status = msg;
    else alert(msg);
    return false;
  };
  if (isDiamond) {
    if ((user.diamonds || 0) < cost) return fail('钻石不足');
    user.diamonds -= cost;
  } else {
    if (user.money < cost) return fail('金币不足');
    user.money -= cost;
  }
  user.baits[id] = (user.baits[id] || 0) + count;
  phaserUi.status = `已购买 ${bait.name} x${count}`;
  refreshUI();
  if (!shopOverlay.classList.contains('hidden')) renderShop();
  saveUser('shop');
  maybeResumeVipAutoAfterInventoryChange();
  return true;
}

function renderShop() {
  const list = $('shop-list');
  list.innerHTML = '';
  for (const [id, b] of Object.entries(BAITS).filter(([, bait]) => bait.purchasable !== false)) {
    const owned = user.baits[id] || 0;
    const isDiamond = b.currency === 'diamonds';
    const priceIcon = isDiamond ? '💎' : '💰';
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <h3 style="color:${b.color}">${b.name}</h3>
      <div class="desc">${b.desc}</div>
      <div class="row">
        <span class="price">${priceIcon} ${b.price}/个</span>
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
    purchaseBait(id, n, { source: 'dom' });
  };
}

// ====== 图鉴 ======
const dexOverlay = $('dex-overlay');
$('dex-btn').onclick = () => {
  if (openPhaserDex()) return;
  renderDex();
  dexOverlay.classList.remove('hidden');
};

let activeDexBait = 'worm';
let activeDexPage = 0;
const DEX_ITEMS_PER_PAGE = 6;

function getDexTabs() {
  const tabs = Object.entries(BAITS)
    .filter(([, bait]) => !bait.hideDex)
    .map(([id, bait]) => ({
      id,
      label: bait.dexName || bait.name,
      active: id === activeDexBait,
    }));
  tabs.push({
    id: '_rod_exclusive',
    label: '鱼竿专属',
    active: activeDexBait === '_rod_exclusive',
  });
  return tabs;
}

function normalizeActiveDexTab() {
  const valid = getDexTabs().some(tab => tab.id === activeDexBait);
  if (!valid) {
    activeDexBait = 'worm';
    activeDexPage = 0;
  }
}

function getDexItems() {
  normalizeActiveDexTab();
  if (activeDexBait === '_rod_exclusive') {
    return GAME_DATA.ALL_ROD_FISH.map((fish) => {
      const dex = user.dex[fish.id];
      const rod = GAME_DATA.ALL_RODS.find(r => r.id === fish.rodId);
      return {
        id: fish.id,
        icon: dex ? fish.icon : '?',
        name: dex ? fish.name : '???',
        rarity: 'rod_exclusive',
        rarityName: RARITY_NAME.rod_exclusive,
        color: RARITY_COLOR.rod_exclusive,
        extra: `鱼竿：${rod ? rod.name : fish.rodId}`,
        stat: dex ? `x${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁',
        unlocked: !!dex,
      };
    });
  }
  const bait = BAITS[activeDexBait] || BAITS.worm;
  return bait.fishes.map((fish) => {
    const dex = user.dex[fish.id];
    return {
      id: fish.id,
      icon: dex ? fish.icon : '?',
      name: dex ? fish.name : '???',
      rarity: fish.rarity,
      rarityName: RARITY_NAME[fish.rarity],
      color: RARITY_COLOR[fish.rarity],
      extra: fish.timeSlot ? `时段：${GAME_DATA.TIME_SLOT_NAMES[fish.timeSlot]}` : '',
      stat: dex ? `x${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁',
      unlocked: !!dex,
    };
  });
}

function getPhaserDexSnapshot() {
  if (!phaserRenderer || !user) return null;
  const tabs = getDexTabs();
  const items = getDexItems();
  const unlocked = items.filter(item => item.unlocked).length;
  const pageCount = Math.max(1, Math.ceil(items.length / DEX_ITEMS_PER_PAGE));
  activeDexPage = Math.max(0, Math.min(activeDexPage, pageCount - 1));
  const bait = activeDexBait === '_rod_exclusive' ? null : (BAITS[activeDexBait] || BAITS.worm);
  const title = activeDexBait === '_rod_exclusive'
    ? '鱼竿专属图鉴'
    : (bait.dexName || `${bait.name}图鉴`);
  return {
    type: 'dex',
    title,
    tabs,
    page: activeDexPage,
    pageCount,
    items: items.slice(activeDexPage * DEX_ITEMS_PER_PAGE, (activeDexPage + 1) * DEX_ITEMS_PER_PAGE),
    stats: [
      `${title}：${unlocked} / ${items.length}`,
      `累计钓获：${user.stats.totalCatches || 0} 次`,
      `累计收入：${user.stats.totalEarned || 0} 金币`,
      `累计钻石：${user.stats.totalDiamonds || 0} 钻石`,
    ],
  };
}

function openPhaserDex() {
  activeDexPage = 0;
  return openPhaserModal('dex');
}

function setPhaserDexTab(id) {
  if (!id || id === activeDexBait) return;
  activeDexBait = id;
  activeDexPage = 0;
  phaserUi.status = '';
}

function setPhaserDexPage(delta) {
  const snapshot = getPhaserDexSnapshot();
  if (!snapshot) return;
  activeDexPage = Math.max(0, Math.min(activeDexPage + delta, snapshot.pageCount - 1));
}

function renderDex() {
  const tabs = $('dex-tabs');
  tabs.innerHTML = '';
  for (const [id, b] of Object.entries(BAITS)) {
    if (b.hideDex) continue;
    const btn = document.createElement('button');
    btn.textContent = b.dexName || b.name;
    if (id === activeDexBait) btn.classList.add('active');
    btn.onclick = () => { activeDexBait = id; activeDexPage = 0; renderDex(); };
    tabs.appendChild(btn);
  }
  // 鱼竿专属图鉴 tab
  const rodDexBtn = document.createElement('button');
  rodDexBtn.textContent = '🎣 鱼竿专属';
  if (activeDexBait === '_rod_exclusive') rodDexBtn.classList.add('active');
  rodDexBtn.onclick = () => { activeDexBait = '_rod_exclusive'; activeDexPage = 0; renderDex(); };
  tabs.appendChild(rodDexBtn);

  const list = $('dex-list');
  list.innerHTML = '';

  if (activeDexBait === '_rod_exclusive') {
    const allRodFish = GAME_DATA.ALL_ROD_FISH;
    let unlocked = 0;
    for (const f of allRodFish) {
      const dex = user.dex[f.id];
      const isU = !!dex;
      if (isU) unlocked++;
      const rod = GAME_DATA.ALL_RODS.find(r => r.id === f.rodId);
      const rodName = rod ? rod.name : f.rodId;
      const div = document.createElement('div');
      div.className = 'dex-item ' + (isU ? 'unlocked' : 'locked');
      div.style.borderColor = RARITY_COLOR['rod_exclusive'];
      div.innerHTML = `
        <span class="icon">${renderItemIcon(f, isU)}</span>
        <div class="name" style="color:${RARITY_COLOR['rod_exclusive']}">${isU ? f.name : '???'}</div>
        <div class="info">${RARITY_NAME['rod_exclusive']}</div>
        <div class="info time-info">🎣 ${rodName}</div>
        <div class="info">${isU ? `×${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁'}</div>
      `;
      list.appendChild(div);
    }
    $('dex-stats').innerHTML = `
      <div>鱼竿专属图鉴：${unlocked} / ${allRodFish.length}</div>
      <div>累计钓获：${user.stats.totalCatches || 0} 次</div>
      <div>累计收入：${user.stats.totalEarned || 0} 金币</div>
      <div>累计钻石：${user.stats.totalDiamonds || 0} 钻石</div>
    `;
    return;
  }

  const fishes = BAITS[activeDexBait].fishes;
  let unlocked = 0;
  for (const f of fishes) {
    const dex = user.dex[f.id];
    const isU = !!dex;
    if (isU) unlocked++;
    const div = document.createElement('div');
    div.className = 'dex-item ' + (isU ? 'unlocked' : 'locked');
    div.style.borderColor = RARITY_COLOR[f.rarity];
    const timeInfo = f.timeSlot ? `<div class="info time-info">⏰ ${GAME_DATA.TIME_SLOT_NAMES[f.timeSlot]}</div>` : '';
    div.innerHTML = `
      <span class="icon">${renderItemIcon(f, isU)}</span>
      <div class="name" style="color:${RARITY_COLOR[f.rarity]}">${isU ? f.name : '???'}</div>
      <div class="info">${RARITY_NAME[f.rarity]}</div>
      ${timeInfo}
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

// ====== 角色系统 ======
const characterOverlay = $('character-overlay');
$('character-btn').onclick = () => {
  if (openPhaserCharacter()) return;
  renderCharacters();
  characterOverlay.classList.remove('hidden');
};

function getPhaserCharacterSnapshot() {
  if (!phaserRenderer || !user) return null;
  normalizeCharacters();
  normalizeCharacterFragments();
  const owned = user.ownedCharacters || [];
  const required = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
  return {
    type: 'character',
    title: '角色',
    status: phaserUi.status,
    activeCharacter: user.activeCharacter,
    ownedCount: owned.length,
    totalCount: GAME_DATA.CHARACTERS.length,
    required,
    items: GAME_DATA.CHARACTERS.map((character) => {
      const isOwned = owned.includes(character.id);
      const isActive = user.activeCharacter === character.id;
      const shardTarget = getCharacterShardTarget(character.id);
      const shardCount = shardTarget ? getCharacterShardCount(character.id) : 0;
      const canSynthesize = !!shardTarget && !isOwned && shardCount >= required;
      return {
        id: character.id,
        name: character.name,
        title: character.title,
        bio: character.bio,
        obtain: character.obtain || '暂未开放',
        sprite: character.sprite,
        spriteImage: character.spriteImage || '',
        colors: character.colors || {},
        owned: isOwned,
        active: isActive,
        shardCount,
        required,
        hasShardTarget: !!shardTarget,
        canSynthesize,
      };
    }),
  };
}

function openPhaserCharacter() {
  return openPhaserModal('character');
}

function equipCharacter(id, options = {}) {
  if (!user || !id) return false;
  normalizeCharacters();
  const character = GAME_DATA.CHARACTERS.find(item => item.id === id);
  if (!character || !(user.ownedCharacters || []).includes(id)) return false;
  user.activeCharacter = id;
  phaserUi.status = `已装备 ${character.name}`;
  refreshUI();
  saveUser('selection');
  if (!characterOverlay.classList.contains('hidden')) renderCharacters();
  return true;
}

function composeCharacter(id, options = {}) {
  if (!user || !id) return false;
  const character = GAME_DATA.CHARACTERS.find(item => item.id === id);
  const ok = synthesizeCharacter(id);
  if (!ok) {
    if (options.source === 'phaser') phaserUi.status = '碎片不足，暂时无法合成';
    return false;
  }
  phaserUi.status = character ? `已合成并装备 ${character.name}` : statusEl.textContent;
  return true;
}

function renderCharacters() {
  normalizeCharacters();
  normalizeCharacterFragments();
  const list = $('character-list');
  list.innerHTML = '';
  const owned = user.ownedCharacters || [];
  const required = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
  for (const character of GAME_DATA.CHARACTERS) {
    const isOwned = owned.includes(character.id);
    const isActive = user.activeCharacter === character.id;
    const shardTarget = getCharacterShardTarget(character.id);
    const shardCount = shardTarget ? getCharacterShardCount(character.id) : 0;
    const canSynthesize = !!shardTarget && !isOwned && shardCount >= required;
    const obtainLine = isOwned
      ? `<span class="character-badge">${isActive ? '✔ 已装备' : '点击装备'}</span>`
      : (shardTarget
        ? `<div class="character-shards">碎片 ${shardCount} / ${required}</div><button class="character-compose" data-compose="${character.id}" ${canSynthesize ? '' : 'disabled'}>合成角色</button>`
        : `<span class="character-badge">🔒 ${escapeHtml(character.obtain || '暂未开放')}</span>`);
    const div = document.createElement('div');
    div.className = 'character-item' + (isActive ? ' active' : '') + (!isOwned ? ' locked' : '');
    div.innerHTML = `
      <div class="character-stage">${renderCharacterSprite(character)}</div>
      <div class="character-name">${escapeHtml(character.name)}</div>
      <div class="character-title">${escapeHtml(character.title)}</div>
      <div class="character-bio">${escapeHtml(character.bio)}</div>
      ${obtainLine}
    `;
    if (isOwned) {
      div.onclick = () => {
        equipCharacter(character.id, { source: 'dom' });
      };
    } else if (canSynthesize) {
      div.querySelector('[data-compose]').onclick = (e) => {
        e.stopPropagation();
        composeCharacter(character.id, { source: 'dom' });
      };
    }
    list.appendChild(div);
  }
}

// ====== 宠物系统 ======
const petOverlay = $('pet-overlay');
$('pet-btn').onclick = () => {
  if (openPhaserPet()) return;
  renderPets();
  petOverlay.classList.remove('hidden');
};

function getPetAbilityText(petId) {
  const bonus = PET_BONUS[petId];
  if (!bonus) return '';
  return bonus.coins ? `钓鱼金币+${bonus.coins}` : `钓鱼钻石+${bonus.diamonds}`;
}

function getPhaserPetSnapshot() {
  if (!phaserRenderer || !user) return null;
  const owned = user.ownedPets || [];
  return {
    type: 'pet',
    title: '宠物',
    status: phaserUi.status,
    activePet: user.activePet || null,
    ownedCount: owned.length,
    totalCount: GAME_DATA.PETS.length,
    items: GAME_DATA.PETS.map((pet) => {
      const isOwned = owned.includes(pet.id);
      const isActive = user.activePet === pet.id;
      return {
        id: pet.id,
        name: pet.name,
        icon: pet.icon,
        desc: pet.desc,
        obtain: pet.obtain || '活动获取',
        colors: pet.colors || {},
        owned: isOwned,
        active: isActive,
        abilityText: getPetAbilityText(pet.id),
      };
    }),
  };
}

function openPhaserPet() {
  return openPhaserModal('pet');
}

function togglePet(id, options = {}) {
  if (!user || !id) return false;
  const pet = GAME_DATA.PETS.find(item => item.id === id);
  if (!pet || !(user.ownedPets || []).includes(id)) return false;
  const isActive = user.activePet === id;
  user.activePet = isActive ? null : id;
  phaserUi.status = isActive ? `已卸下 ${pet.name}` : `已装备 ${pet.name}`;
  refreshUI();
  saveUser('pet');
  if (!petOverlay.classList.contains('hidden')) renderPets();
  return true;
}

function renderPets() {
  const list = $('pet-list');
  list.innerHTML = '';
  const owned = user.ownedPets || [];
  for (const pet of GAME_DATA.PETS) {
    const isOwned = owned.includes(pet.id);
    const isActive = user.activePet === pet.id;
    const div = document.createElement('div');
    div.className = 'pet-item' + (isActive ? ' active' : '') + (!isOwned ? ' locked' : '');
    const abilityText = getPetAbilityText(pet.id);
    div.innerHTML = `
      <span class="pet-icon">${pet.icon}</span>
      <div class="pet-name">${pet.name}</div>
      <div class="pet-desc">${pet.desc}</div>
      ${abilityText ? `<div class="pet-ability">${abilityText}</div>` : ''}
      ${isOwned
        ? `<span class="pet-badge">${isActive ? '✔ 已装备' : '点击装备'}</span>`
        : `<span class="pet-badge">🔒 ${pet.obtain || '活动获取'}</span>`}
    `;
    if (isOwned) {
      div.onclick = () => {
        togglePet(pet.id, { source: 'dom' });
      };
    }
    list.appendChild(div);
  }
}

// ====== 首饰系统 ======
const accessoryOverlay = $('accessory-overlay');
$('accessory-btn').onclick = () => {
  if (openPhaserAccessory()) return;
  renderAccessories();
  accessoryOverlay.classList.remove('hidden');
};

let activeAccessoryPage = 0;
const ACCESSORY_ITEMS_PER_PAGE = 4;

function getSortedAccessories() {
  normalizeAccessories();
  return [...user.accessories].sort((a, b) => {
    if (a.uid === user.equippedAccessory) return -1;
    if (b.uid === user.equippedAccessory) return 1;
    return b.star - a.star || a.type.localeCompare(b.type);
  });
}

function findAccessoryUpgradeMaterial(target) {
  return (user.accessories || []).find(item =>
    item.uid !== target.uid &&
    item.type === target.type &&
    GAME_DATA.clampAccessoryStar(item.star) === GAME_DATA.clampAccessoryStar(target.star)
  );
}

function getAccessoryItemSnapshot(item) {
  const def = GAME_DATA.getAccessoryDef(item.type);
  if (!def) return null;
  const star = GAME_DATA.clampAccessoryStar(item.star);
  const isEquipped = item.uid === user.equippedAccessory;
  const material = findAccessoryUpgradeMaterial(item);
  const chance = GAME_DATA.getAccessoryUpgradeChance(star);
  const cost = GAME_DATA.getAccessoryUpgradeCost(star);
  const lacksMoney = user.money < cost;
  const atMax = star >= 20;
  const canUpgrade = !!material && !atMax && !lacksMoney;
  let matText;
  if (atMax) matText = '已达到最高星级';
  else matText = `${cost} 金币 + 同款同星 ×1${!material ? '（缺材料）' : (lacksMoney ? '（金币不足）' : '')}`;
  return {
    uid: item.uid,
    type: item.type,
    name: def.name,
    icon: def.icon,
    color: def.color,
    desc: def.desc,
    star,
    starsText: `${star}★`,
    effectText: formatAccessoryEffect(item),
    equipped: isEquipped,
    chance,
    chanceText: atMax ? '已满星' : `强化 ${Math.round(chance * 100)}%`,
    cost,
    hasMaterial: !!material,
    lacksMoney,
    atMax,
    canUpgrade,
    matText,
  };
}

function getPhaserAccessorySnapshot() {
  if (!phaserRenderer || !user) return null;
  const sorted = getSortedAccessories();
  const equipped = getEquippedAccessory();
  const equippedDef = equipped ? GAME_DATA.getAccessoryDef(equipped.type) : null;
  const pageCount = Math.max(1, Math.ceil(sorted.length / ACCESSORY_ITEMS_PER_PAGE));
  activeAccessoryPage = Math.max(0, Math.min(activeAccessoryPage, pageCount - 1));
  const pageItems = sorted
    .slice(activeAccessoryPage * ACCESSORY_ITEMS_PER_PAGE, (activeAccessoryPage + 1) * ACCESSORY_ITEMS_PER_PAGE)
    .map(getAccessoryItemSnapshot)
    .filter(Boolean);
  return {
    type: 'accessory',
    title: '首饰',
    money: user.money || 0,
    status: phaserUi.status,
    page: activeAccessoryPage,
    pageCount,
    totalCount: sorted.length,
    equipped: equipped && equippedDef ? {
      icon: equippedDef.icon,
      name: equippedDef.name,
      color: equippedDef.color,
      star: GAME_DATA.clampAccessoryStar(equipped.star),
      effectText: formatAccessoryEffect(equipped),
    } : null,
    items: pageItems,
    catalog: (GAME_DATA.ACCESSORIES || []).map(def => ({
      icon: def.icon,
      name: def.name,
      color: def.color,
      desc: def.desc,
    })),
  };
}

function openPhaserAccessory() {
  activeAccessoryPage = 0;
  return openPhaserModal('accessory');
}

function setPhaserAccessoryPage(delta) {
  const snapshot = getPhaserAccessorySnapshot();
  if (!snapshot) return;
  activeAccessoryPage = Math.max(0, Math.min(activeAccessoryPage + delta, snapshot.pageCount - 1));
}

function setAccessoryStatus(message) {
  phaserUi.status = message || '';
  if (!accessoryOverlay.classList.contains('hidden')) renderAccessories(message);
}

function toggleAccessory(uid, options = {}) {
  if (!user || !uid) return false;
  normalizeAccessories();
  const item = user.accessories.find(acc => acc.uid === uid);
  if (!item) return false;
  const isEquipped = user.equippedAccessory === uid;
  user.equippedAccessory = isEquipped ? null : uid;
  const def = GAME_DATA.getAccessoryDef(item.type);
  const message = isEquipped ? '已卸下首饰' : `已装备 ${def ? def.name : '首饰'}`;
  phaserUi.status = message;
  saveUser('selection');
  refreshUI();
  if (!accessoryOverlay.classList.contains('hidden')) renderAccessories(message);
  return true;
}

function renderAccessories(message = '') {
  normalizeAccessories();
  const summary = $('accessory-summary');
  const status = $('accessory-status');
  const list = $('accessory-list');
  const equipped = getEquippedAccessory();
  if (equipped) {
    const def = GAME_DATA.getAccessoryDef(equipped.type);
    summary.innerHTML = `
      <div class="accessory-equipped">
        <span class="accessory-icon">${def.icon}</span>
        <div>
          <div>装备中：${def.name} <span class="accessory-stars">${'★'.repeat(equipped.star)}</span></div>
          <div class="accessory-effect">${formatAccessoryEffect(equipped)}</div>
        </div>
      </div>
    `;
  } else {
    summary.innerHTML = '<div class="accessory-empty">未装备首饰</div>';
  }
  status.textContent = message;
  status.className = 'accessory-status' + (message.includes('失败') ? ' fail' : (message ? ' success' : ''));
  list.innerHTML = '';

  if (user.accessories.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'accessory-empty-panel';
    empty.innerHTML = '<div class="accessory-empty-title">暂无首饰</div><div class="accessory-empty-desc">可在钻石抽奖第三期获得首饰。</div>';
    list.appendChild(empty);
  }

  const sorted = getSortedAccessories();

  for (const item of sorted) {
    const def = GAME_DATA.getAccessoryDef(item.type);
    if (!def) continue;
    const isEquipped = item.uid === user.equippedAccessory;
    const material = findAccessoryUpgradeMaterial(item);
    const chance = GAME_DATA.getAccessoryUpgradeChance(item.star);
    const cost = GAME_DATA.getAccessoryUpgradeCost(item.star);
    const lacksMoney = user.money < cost;
    const div = document.createElement('div');
    div.className = 'accessory-item' + (isEquipped ? ' active' : '');
    div.style.borderColor = isEquipped ? def.color : '';
    div.innerHTML = `
      <div class="accessory-head">
        <span class="accessory-icon">${def.icon}</span>
        <div>
          <div class="accessory-name" style="color:${def.color}">${def.name}</div>
          <div class="accessory-stars">${'★'.repeat(item.star)}</div>
        </div>
      </div>
      <div class="accessory-desc">${def.desc}</div>
      <div class="accessory-effect">${formatAccessoryEffect(item)}</div>
      <div class="accessory-actions">
        <button data-equip="${item.uid}">${isEquipped ? '卸下' : '装备'}</button>
        <button data-upgrade="${item.uid}" ${(!material || item.star >= 20 || lacksMoney) ? 'disabled' : ''}>
          ${item.star >= 20 ? '已满星' : `强化 ${Math.round(chance * 100)}%`}
        </button>
      </div>
      <div class="accessory-mat ${(!material || lacksMoney) ? 'muted' : ''}">
        ${item.star >= 20
          ? '已达到最高星级'
          : `消耗：${cost} 金币 + 同款同星首饰 ×1${!material ? '（缺材料）' : (lacksMoney ? '（金币不足）' : '')}`}
      </div>
    `;
    list.appendChild(div);
  }

  if (user.accessories.length > 0) {
    list.querySelectorAll('[data-equip]').forEach((btn) => {
      btn.onclick = () => {
        toggleAccessory(btn.dataset.equip, { source: 'dom' });
      };
    });
    list.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.onclick = () => upgradeAccessory(btn.dataset.upgrade);
    });
  }

  const catalog = document.createElement('div');
  catalog.className = 'accessory-catalog';
  catalog.innerHTML = GAME_DATA.ACCESSORIES.map(def => `
    <div class="accessory-catalog-item">
      <span>${def.icon}</span>
      <strong style="color:${def.color}">${def.name}</strong>
      <em>${def.desc}</em>
    </div>
  `).join('');
  list.appendChild(catalog);
}

function upgradeAccessory(uid, options = {}) {
  normalizeAccessories();
  const target = user.accessories.find(item => item.uid === uid);
  if (!target || target.star >= 20) return false;
  const material = findAccessoryUpgradeMaterial(target);
  if (!material) {
    setAccessoryStatus('缺少同款同星首饰');
    return false;
  }
  const def = GAME_DATA.getAccessoryDef(target.type);
  const cost = GAME_DATA.getAccessoryUpgradeCost(target.star);
  if (user.money < cost) {
    setAccessoryStatus(`金币不足，需要 ${cost} 金币`);
    return false;
  }
  const chance = GAME_DATA.getAccessoryUpgradeChance(target.star);
  const success = Math.random() < chance;
  user.money -= cost;
  if (success) target.star = GAME_DATA.clampAccessoryStar(target.star + 1);
  user.accessories = user.accessories.filter(item => item.uid !== material.uid);
  saveUser('accessory');
  refreshUI();
  setAccessoryStatus(success
    ? `${def.name} 强化成功，消耗 ${cost} 金币，升至 ${target.star} 星`
    : `${def.name} 强化失败，消耗 ${cost} 金币和材料`);
  return true;
}

// ====== 排行榜 ======
const rankOverlay = $('rank-overlay');
let activeRankTab = 'today-catches';
let rankData = null;
let activeRankPage = 0;
const RANK_ITEMS_PER_PAGE = 6;
const RANK_TABS = [
  { id: 'today-catches', label: '今日钓鱼数', sortKey: 'todayCatches', valueLabel: '数量' },
  { id: 'today-weight', label: '今日总重量', sortKey: 'todayWeight', valueLabel: '重量(kg)', isWeight: true },
  { id: 'total-catches', label: '累计钓鱼数', sortKey: 'totalCatches', valueLabel: '数量' },
  { id: 'total-weight', label: '累计总重量', sortKey: 'totalWeight', valueLabel: '重量(kg)', isWeight: true },
];

function showPendingRankRewards(rewards) {
  if (!rewards || rewards.length === 0) return;
  setTimeout(() => {
    if (phaserRenderer) {
      rewards.forEach((r) => {
        openOrQueuePhaserModal('rank-reward', {
          reward: {
            date: r.date,
            catches: r.catches,
            diamonds: r.diamonds,
          },
        });
      });
      return;
    }
    for (const r of rewards) {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `<div class="modal"><button class="close-x top-close" onclick="this.parentElement.parentElement.remove()">✕</button><h2>🏆 排名奖励</h2><div style="text-align:center;padding:20px"><p style="font-size:1.2em;color:#ffd700">恭喜你在 <strong>${r.date}</strong> 获得</p><p style="font-size:1.5em;margin:16px 0">🎣 今日钓鱼数第一名</p><p style="font-size:1.1em;color:#aaa">钓鱼 <strong style="color:#fff">${r.catches}</strong> 次</p><p style="font-size:1.4em;margin-top:16px;color:#ffd700">💎 +${r.diamonds} 钻石</p></div></div>`;
      document.getElementById('game-screen').appendChild(overlay);
    }
  }, 500);
  refreshUI();
}

function getPhaserRankRewardSnapshot() {
  const reward = phaserUi.data?.reward || {};
  return {
    type: 'rank-reward',
    title: '排名奖励',
    date: reward.date || '',
    catches: reward.catches || 0,
    diamonds: reward.diamonds || 0,
  };
}

$('rank-btn').onclick = () => {
  if (openPhaserRank()) return;
  rankOverlay.classList.remove('hidden');
  loadLeaderboard();
};

$('rank-tabs').onclick = (e) => {
  const btn = e.target.closest('button[data-rank]');
  if (!btn) return;
  activeRankTab = btn.dataset.rank;
  activeRankPage = 0;
  $('rank-tabs').querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard();
};

let rankHistory = null;
async function loadLeaderboard(options = {}) {
  const usePhaser = options.source === 'phaser';
  const loading = $('rank-loading');
  const list = $('rank-list');
  if (usePhaser) {
    phaserUi.status = '加载中...';
  } else {
    loading.classList.remove('hidden');
    list.innerHTML = '';
  }
  try {
    const [lbRes, histRes] = await Promise.all([fetch(API_BASE + '/api/leaderboard'), fetch(API_BASE + '/api/rank-history')]);
    rankData = await lbRes.json();
    rankHistory = (await histRes.json()).history || [];
    activeRankPage = 0;
    if (usePhaser) {
      phaserUi.status = '';
    } else {
      renderLeaderboard();
    }
  } catch (e) {
    if (usePhaser) {
      phaserUi.status = '加载失败';
    } else {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:#ff5722">加载失败</div>';
    }
  }
  if (!usePhaser) {
    loading.classList.add('hidden');
  }
}

function getRankTab(tabId = activeRankTab) {
  return RANK_TABS.find(tab => tab.id === tabId) || RANK_TABS[0];
}

function getRankRows(tabId = activeRankTab) {
  const tab = getRankTab(tabId);
  if (!Array.isArray(rankData)) return [];
  const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return [...rankData]
    .map(entry => ({ ...entry, value: Number(entry[tab.sortKey] || 0) }))
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((entry, index) => {
      const rank = index + 1;
      return {
        rank,
        medal: medalMap[rank] || String(rank),
        username: entry.username,
        value: entry.value,
        valueText: tab.isWeight ? entry.value.toFixed(2) : String(entry.value),
        isMe: !!(user && entry.username === user.username),
      };
    });
}

function getPhaserRankSnapshot() {
  const rows = getRankRows(activeRankTab);
  const pageCount = Math.max(1, Math.ceil(rows.length / RANK_ITEMS_PER_PAGE));
  activeRankPage = Math.min(Math.max(activeRankPage, 0), pageCount - 1);
  const start = activeRankPage * RANK_ITEMS_PER_PAGE;
  const currentRows = rows.slice(start, start + RANK_ITEMS_PER_PAGE);
  const tab = getRankTab(activeRankTab);
  return {
    type: 'rank',
    title: '排行榜',
    status: phaserUi.status,
    loading: phaserUi.status === '加载中...',
    tabs: RANK_TABS.map(item => ({ id: item.id, label: item.label, active: item.id === activeRankTab })),
    activeLabel: tab.label,
    valueLabel: tab.valueLabel,
    rewardBanner: activeRankTab === 'today-catches' ? '今日钓鱼数第一名可获得 5000 钻石（每晚 23:59 结算）' : '',
    rows: currentRows,
    totalRows: rows.length,
    history: activeRankTab === 'today-catches' && Array.isArray(rankHistory) ? rankHistory.slice(0, 5) : [],
    page: activeRankPage,
    pageCount,
  };
}

function openPhaserRank() {
  activeRankPage = 0;
  if (!openPhaserModal('rank')) return false;
  loadLeaderboard({ source: 'phaser' });
  return true;
}

function setPhaserRankTab(tabId) {
  if (!RANK_TABS.some(tab => tab.id === tabId)) return;
  activeRankTab = tabId;
  activeRankPage = 0;
  $('rank-tabs').querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.rank === activeRankTab);
  });
  phaserUi.status = '';
}

function setPhaserRankPage(delta) {
  const rows = getRankRows(activeRankTab);
  const pageCount = Math.max(1, Math.ceil(rows.length / RANK_ITEMS_PER_PAGE));
  activeRankPage = Math.min(Math.max(activeRankPage + delta, 0), pageCount - 1);
}

function renderLeaderboard() {
  const list = $('rank-list');
  if (!rankData) return;
  const tab = getRankTab(activeRankTab);
  const sorted = getRankRows(activeRankTab);

  let html = '';
  if (activeRankTab === 'today-catches') {
    html += '<div class="rank-reward-banner">🏆 今日钓鱼数第一名可获得 <strong>💎 5000 钻石</strong>（每晚 23:59 结算）</div>';
  }

  if (sorted.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#888">暂无数据</div>';
  } else {
    html += '<table><tr><th>#</th><th>玩家</th><th style="text-align:right">' + tab.valueLabel + '</th></tr>';
    sorted.forEach((e) => {
      const rankClass = e.rank <= 3 ? ` rank-${e.rank}` : '';
      html += `<tr class="${e.isMe ? 'me' : ''}"><td class="rank-num${rankClass}">${e.medal}</td><td>${e.username}</td><td class="rank-val">${e.valueText}</td></tr>`;
    });
    html += '</table>';
  }

  if (activeRankTab === 'today-catches' && rankHistory && rankHistory.length > 0) {
    html += '<div class="rank-history"><div class="rank-history-title">近期获奖记录</div>';
    for (const r of rankHistory.slice(0, 7)) {
      html += `<div class="rank-history-item"><span>${r.date}</span><span class="rank-history-user">${r.username}</span><span>🎣${r.catches}次</span><span style="color:#ffd700">💎${r.diamonds}</span></div>`;
    }
    html += '</div>';
  }

  list.innerHTML = html;
}

// ====== 鱼竿皮肤 ======
const rodOverlay = $('rod-overlay');
$('rod-btn').onclick = () => {
  if (openPhaserRod()) return;
  renderRodSkins();
  rodOverlay.classList.remove('hidden');
};

let activeRodPage = 0;
const ROD_ITEMS_PER_PAGE = 4;

function getRodUnlockInfo(skin, dexCount, current) {
  const owned = user.ownedRods || [];
  const isGacha = GAME_DATA.GACHA_RODS.some(g => g.id === skin.id);
  const isSpecial = (GAME_DATA.SPECIAL_RODS || []).some(s => s.id === skin.id);
  const unlocked = (isGacha || isSpecial) ? owned.includes(skin.id) : dexCount >= skin.threshold;
  let reqText;
  if (unlocked) reqText = skin.id === current.id ? '装备中' : '点击装备';
  else if (isGacha) reqText = '抽奖限定';
  else if (skin.unlock === 'black_silk_dex') reqText = `集齐黑丝图鉴 (${countUnlockedBaitDex(BLACK_SILK_BAIT_ID)}/${BAITS[BLACK_SILK_BAIT_ID].fishes.length})`;
  else reqText = `收集 ${skin.threshold} 种鱼解锁 (${dexCount}/${skin.threshold})`;
  return { unlocked, isGacha, isSpecial, reqText };
}

function getPhaserRodSnapshot() {
  if (!phaserRenderer || !user) return null;
  const dexCount = Object.keys(user.dex).length;
  const current = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  const rods = GAME_DATA.ALL_RODS.map((skin) => {
    const info = getRodUnlockInfo(skin, dexCount, current);
    return {
      id: skin.id,
      name: skin.name,
      desc: skin.desc,
      rodColor: skin.rodColor,
      rodHighlight: skin.rodHighlight,
      lineColor: skin.lineColor,
      emoji: skin.emoji || '🎣',
      active: skin.id === current.id,
      unlocked: info.unlocked,
      isGacha: info.isGacha,
      isSpecial: info.isSpecial,
      reqText: info.reqText,
    };
  });
  const pageCount = Math.max(1, Math.ceil(rods.length / ROD_ITEMS_PER_PAGE));
  activeRodPage = Math.max(0, Math.min(activeRodPage, pageCount - 1));
  const next = GAME_DATA.getNextRodSkin(user.dex);
  return {
    type: 'rod',
    title: '鱼竿收藏',
    status: phaserUi.status,
    currentName: current.name,
    dexCount,
    nextText: next ? `下一把：${next.name} (${dexCount}/${next.threshold})` : '图鉴进度已解锁全部普通鱼竿',
    page: activeRodPage,
    pageCount,
    items: rods.slice(activeRodPage * ROD_ITEMS_PER_PAGE, (activeRodPage + 1) * ROD_ITEMS_PER_PAGE),
  };
}

function openPhaserRod() {
  activeRodPage = 0;
  return openPhaserModal('rod');
}

function setPhaserRodPage(delta) {
  const snapshot = getPhaserRodSnapshot();
  if (!snapshot) return;
  activeRodPage = Math.max(0, Math.min(activeRodPage + delta, snapshot.pageCount - 1));
}

function equipRodSkin(id, options = {}) {
  if (!user || !id) return false;
  const skin = GAME_DATA.ALL_RODS.find(item => item.id === id);
  if (!skin) return false;
  const dexCount = Object.keys(user.dex).length;
  const current = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  const { unlocked } = getRodUnlockInfo(skin, dexCount, current);
  if (!unlocked || skin.id === current.id) return false;
  user.rodSkin = skin.id;
  phaserUi.status = `已装备 ${skin.name}`;
  saveUser('rod');
  refreshUI();
  if (!rodOverlay.classList.contains('hidden')) renderRodSkins();
  return true;
}

function renderRodSkins() {
  const list = $('rod-list');
  list.innerHTML = '';
  const dexCount = Object.keys(user.dex).length;
  const current = GAME_DATA.getCurrentRodSkin(user.dex, user.rodSkin, user.ownedRods);
  for (const skin of GAME_DATA.ALL_RODS) {
    const { unlocked, isGacha, isSpecial, reqText } = getRodUnlockInfo(skin, dexCount, current);
    const isActive = skin.id === current.id;
    const div = document.createElement('div');
    div.className = 'rod-item' + (unlocked ? ' unlocked' : ' locked') + (isActive ? ' active' : '') + (isGacha ? ' gacha' : '');
    if (unlocked && !isActive) div.style.cursor = 'pointer';
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    drawRodPreview(canvas, skin);
    div.innerHTML = `
      <div class="rod-preview"></div>
      <div class="rod-name" style="color:${skin.rodHighlight}">${skin.name}</div>
      <div class="rod-desc">${skin.desc}</div>
      <div class="rod-req">${unlocked && isActive ? '✅ ' : (!unlocked ? '🔒 ' : '')}${reqText}</div>
      ${isActive ? '<div class="rod-badge">装备中</div>' : ''}
      ${isGacha && !unlocked ? '<div class="rod-badge" style="background:#c586c0">限定</div>' : ''}
      ${isSpecial && !unlocked ? '<div class="rod-badge" style="background:#ff7ac8">图鉴</div>' : ''}
    `;
    div.querySelector('.rod-preview').appendChild(canvas);
    if (unlocked && !isActive) {
      div.onclick = () => {
        equipRodSkin(skin.id, { source: 'dom' });
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
  const accessory = getEquippedAccessory();
  const character = GAME_DATA.CHARACTERS.find(c => c.id === user.activeCharacter);
  let nextText = '';
  if (next) nextText = `<span class="rod-next">下一把: ${next.name} (${dexCount}/${next.threshold})</span>`;
  const characterText = character ? `<span class="rod-character">🧍 ${escapeHtml(character.name)}</span>` : '';
  let accessoryText = '';
  if (accessory) {
    const def = GAME_DATA.getAccessoryDef(accessory.type);
    accessoryText = `<span class="rod-accessory">${def.icon} ${def.name} ${accessory.star}★</span>`;
  }
  el.innerHTML = `<span class="rod-icon">🎣</span> ${skin.name} ${characterText} ${accessoryText} ${nextText}`;
}

// ====== 兑换码 ======
const redeemOverlay = $('redeem-overlay');
let phaserRedeemCode = '';
$('redeem-btn').onclick = () => {
  if (openPhaserRedeem()) return;
  $('redeem-input').value = '';
  $('redeem-status').textContent = '';
  $('redeem-status').className = 'redeem-status';
  redeemOverlay.classList.remove('hidden');
};

$('redeem-submit').onclick = redeemCode;
$('redeem-input').onkeydown = (e) => { if (e.key === 'Enter') redeemCode(); };

function getPhaserRedeemSnapshot() {
  return {
    type: 'redeem',
    title: '兑换码',
    code: phaserRedeemCode,
    status: phaserUi.status,
    canSubmit: phaserRedeemCode.trim().length > 0,
  };
}

function openPhaserRedeem() {
  phaserRedeemCode = '';
  if (!openPhaserModal('redeem')) return false;
  phaserUi.status = '键盘输入兑换码，Enter 提交';
  return true;
}

function clearPhaserRedeemCode() {
  phaserRedeemCode = '';
  phaserUi.status = '已清空';
}

async function pastePhaserRedeemCode() {
  try {
    const text = await navigator.clipboard.readText();
    phaserRedeemCode = String(text || '').trim().slice(0, 20);
    phaserUi.status = phaserRedeemCode ? '已粘贴兑换码' : '剪贴板为空';
  } catch (e) {
    phaserUi.status = '无法读取剪贴板';
  }
}

function handlePhaserRedeemKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePhaserModal();
    return true;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    redeemCode({ source: 'phaser' });
    return true;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    phaserRedeemCode = phaserRedeemCode.slice(0, -1);
    phaserUi.status = '';
    return true;
  }
  if (e.key.length === 1 && /^[a-zA-Z0-9_-]$/.test(e.key) && phaserRedeemCode.length < 20) {
    e.preventDefault();
    phaserRedeemCode += e.key;
    phaserUi.status = '';
    return true;
  }
  return false;
}

async function redeemCode(options = {}) {
  const usePhaser = options.source === 'phaser';
  const code = usePhaser ? phaserRedeemCode.trim() : $('redeem-input').value.trim();
  const status = $('redeem-status');
  const setStatus = (message, kind = 'info') => {
    if (usePhaser) {
      phaserUi.status = message;
    } else {
      status.textContent = message;
      status.className = 'redeem-status ' + kind;
    }
  };
  if (!code) {
    setStatus('请输入兑换码', 'error');
    return;
  }
  if (usePhaser) phaserUi.status = '兑换中...';
  try {
    const res = await fetch(API_BASE + '/api/redeem/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, code }),
    });
    const data = await res.json();
    if (data.success) {
      Object.assign(user, data.patch || {});
      ensureUserDefaults();
      refreshUI();
      const rewardData = data.reward || {};
      let reward = '';
      if (rewardData.coins) reward += `+${rewardData.coins} 金币 `;
      if (rewardData.diamonds) reward += `+${rewardData.diamonds} 钻石 `;
      if (usePhaser) {
        phaserUi.status = `兑换成功！${data.desc} ${reward}🎉`;
        phaserRedeemCode = '';
      } else {
        status.innerHTML = `兑换成功！<br>${data.desc} ${reward}🎉`;
        status.className = 'redeem-status success';
        $('redeem-input').value = '';
      }
    } else {
      setStatus(data.error || '兑换失败', 'error');
    }
  } catch (e) {
    setStatus('网络错误，请重试', 'error');
  }
}

// ====== 分享功能 ======
const shareOverlay = $('share-overlay');
$('share-btn').onclick = () => {
  if (openPhaserShare()) return;
  openShare();
  shareOverlay.classList.remove('hidden');
};

function getShareLink() {
  return window.location.origin + '?ref=' + encodeURIComponent(user.username);
}

function getShareInitialStatus() {
  const todayKey = todayCN();
  return user.lastShareDate === todayKey ? '今日已领取分享奖励' : '';
}

function openShare() {
  $('share-link').value = getShareLink();
  const status = $('share-status');
  const initialStatus = getShareInitialStatus();
  status.textContent = initialStatus;
  status.className = initialStatus ? 'share-status info' : 'share-status';
}

function getPhaserShareSnapshot() {
  const link = getShareLink();
  return {
    type: 'share',
    title: '分享到微信',
    link,
    status: phaserUi.status,
    rewardClaimed: user.lastShareDate === todayCN(),
    rewardText: '复制链接可领取 10 金币奖励',
    qrImage: 'group-qr',
  };
}

function openPhaserShare() {
  if (!openPhaserModal('share')) return false;
  phaserUi.status = getShareInitialStatus();
  $('share-link').value = getShareLink();
  return true;
}

function applyShareCopyReward() {
  const todayKey = todayCN();
  if (user.lastShareDate !== todayKey) {
    user.money += 10;
    user.lastShareDate = todayKey;
    refreshUI();
    saveUser('share');
    return '链接已复制！获得 10 金币奖励 🎉';
  }
  return '链接已复制！（今日奖励已领取）';
}

async function copyShareLink(options = {}) {
  const usePhaser = options.source === 'phaser';
  const link = getShareLink();
  const setStatus = (message, kind = 'info') => {
    if (usePhaser) {
      phaserUi.status = message;
    } else {
      const status = $('share-status');
      status.textContent = message;
      status.className = 'share-status ' + kind;
    }
  };
  try {
    await navigator.clipboard.writeText(link);
    setStatus(applyShareCopyReward(), 'success');
  } catch (e) {
    if (!usePhaser) {
      const input = $('share-link');
      input.value = link;
      input.select();
      document.execCommand('copy');
      setStatus(applyShareCopyReward(), 'success');
      return;
    }
    phaserUi.status = '复制失败，请手动复制链接';
  }
}

$('copy-link-btn').onclick = () => {
  copyShareLink();
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
let lastGachaResults = [];
$('gacha-btn').onclick = () => {
  if (openPhaserGacha()) return;
  clearGachaResult();
  setGachaTab(activeGachaCurrency);
  gachaOverlay.classList.remove('hidden');
};
document.querySelectorAll('[data-gacha]').forEach((btn) => {
  btn.onclick = () => setGachaTab(btn.dataset.gacha);
});
let activeGachaDiamondSeason = 1;
let activeGachaCoinSeason = 1;
$('gacha-coin-single').onclick = () => doGacha(1, 'coins', 1);
$('gacha-coin-ten').onclick = () => doGacha(10, 'coins', 1);
$('gacha-coin-s2-single').onclick = () => doGacha(1, 'coins', 2);
$('gacha-coin-s2-ten').onclick = () => doGacha(10, 'coins', 2);
$('gacha-diamond-single').onclick = () => doGacha(1, 'diamonds', 1);
$('gacha-diamond-ten').onclick = () => doGacha(10, 'diamonds', 1);
$('gacha-diamond-s2-single').onclick = () => doGacha(1, 'diamonds', 2);
$('gacha-diamond-s2-ten').onclick = () => doGacha(10, 'diamonds', 2);
$('gacha-diamond-s3-single').onclick = () => doGacha(1, 'diamonds', 3);
$('gacha-diamond-s3-ten').onclick = () => doGacha(10, 'diamonds', 3);

document.querySelectorAll('[data-diamond-season]').forEach((btn) => {
  btn.onclick = () => {
    setGachaSeason('diamonds', parseInt(btn.dataset.diamondSeason, 10));
  };
});
document.querySelectorAll('[data-coin-season]').forEach((btn) => {
  btn.onclick = () => {
    setGachaSeason('coins', parseInt(btn.dataset.coinSeason, 10));
  };
});

const GACHA_PRIZES = {
  coins: {
    1: [
      { label: '🌙 神秘暗夜竿', chance: '0.1%', tone: 'legendary' },
      { label: '🐼 熊猫竿', chance: '1%', tone: 'rare' },
      { label: '💰 1000金币', chance: '8.9%', tone: 'coin' },
      { label: '🪙 1金币', chance: '90%', tone: 'common' },
    ],
    2: [
      { label: '🐱 小猫咪 / 🐶 小狗狗', chance: '各0.1%', tone: 'ultimate' },
      { label: '🦜 鹦鹉 / 🐧 企鹅 / 🐰 兔子 / 🦊 狐狸', chance: '各0.05%', tone: 'legendary' },
      { label: '🐲 小龙 / 🦄 独角兽', chance: '各0.01%', tone: 'legendary' },
      { label: '💎 10钻石', chance: '10%', tone: 'diamond' },
      { label: '🪙 1金币', chance: '89.58%', tone: 'common' },
    ],
  },
  diamonds: {
    1: [
      { label: '🔥 极品火麒麟鱼竿', chance: '1%', tone: 'ultimate' },
      { label: '🐢 极品绿玄武鱼竿', chance: '1%', tone: 'ultimate' },
      { label: '💎 10钻石', chance: '8%', tone: 'diamond' },
      { label: '💰 1000金币', chance: '90%', tone: 'coin' },
    ],
    2: [
      { label: '🎧 耳机竿', chance: '0.01%', tone: 'ultimate' },
      { label: '🍬 Candy竿', chance: '0.99%', tone: 'legendary' },
      { label: '💎 10钻石', chance: '10%', tone: 'diamond' },
      { label: '💰 1000金币', chance: '90%', tone: 'coin' },
    ],
    3: [
      { label: '💠 鳞光坠', chance: '10%', tone: 'rare' },
      { label: '🌀 潮汐环', chance: '10%', tone: 'rare' },
      { label: '✨ 星砂针', chance: '10%', tone: 'legendary' },
      { label: '💰 100金币', chance: '70%', tone: 'coin' },
    ],
  },
};

function clearGachaResult() {
  lastGachaResults = [];
  $('gacha-result').classList.add('hidden');
}

function getGachaSeason(currency = activeGachaCurrency) {
  return currency === 'diamonds' ? activeGachaDiamondSeason : activeGachaCoinSeason;
}

function setGachaTab(currency, options = {}) {
  activeGachaCurrency = currency === 'diamonds' ? 'diamonds' : 'coins';
  document.querySelectorAll('[data-gacha]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.gacha === activeGachaCurrency);
  });
  $('gacha-coins-panel').classList.toggle('hidden', activeGachaCurrency !== 'coins');
  $('gacha-diamonds-panel').classList.toggle('hidden', activeGachaCurrency !== 'diamonds');
  clearGachaResult();
  if (options.source === 'phaser') phaserUi.status = '';
}

function setGachaSeason(currency, season, options = {}) {
  const nextSeason = parseInt(season, 10) || 1;
  if (currency === 'diamonds') {
    activeGachaDiamondSeason = Math.min(Math.max(nextSeason, 1), 3);
    document.querySelectorAll('[data-diamond-season]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.diamondSeason, 10) === activeGachaDiamondSeason));
    $('gacha-diamond-s1').classList.toggle('hidden', activeGachaDiamondSeason !== 1);
    $('gacha-diamond-s2').classList.toggle('hidden', activeGachaDiamondSeason !== 2);
    $('gacha-diamond-s3').classList.toggle('hidden', activeGachaDiamondSeason !== 3);
  } else {
    activeGachaCoinSeason = Math.min(Math.max(nextSeason, 1), 2);
    document.querySelectorAll('[data-coin-season]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.coinSeason, 10) === activeGachaCoinSeason));
    $('gacha-coin-s1').classList.toggle('hidden', activeGachaCoinSeason !== 1);
    $('gacha-coin-s2').classList.toggle('hidden', activeGachaCoinSeason !== 2);
  }
  clearGachaResult();
  if (options.source === 'phaser') phaserUi.status = '';
}

function getGachaResultItem(r) {
  let cls = 'gacha-item';
  let icon;
  let name;
  let tone = 'common';
  if (r.type === 'pet') {
    const pet = GAME_DATA.PETS.find(p => p.id === r.id);
    icon = pet ? pet.icon : '🐾';
    name = pet ? pet.name : r.id;
    cls += ' gi-ultimate';
    tone = 'ultimate';
  } else if (r.type === 'rod') {
    const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
    icon = (rod && rod.emoji) || '🎣';
    name = rod ? rod.name : r.id;
    tone = (rod && rod.rarity) || 'rare';
    cls += ' gi-' + tone;
  } else if (r.type === 'accessory') {
    const accessory = GAME_DATA.ACCESSORIES.find(a => a.id === r.id);
    icon = accessory ? accessory.icon : '💍';
    name = `${accessory ? accessory.name : r.id} ${r.star || 1}★`;
    cls += ' gi-accessory';
    tone = 'accessory';
  } else if (r.type === 'diamonds') {
    icon = '💎';
    name = r.diamonds + ' 钻石';
    cls += ' gi-diamond';
    tone = 'diamond';
  } else {
    icon = r.coins >= 1000 ? '💰' : '🪙';
    name = r.coins + ' 金币';
    cls += r.coins >= 1000 ? ' gi-coin' : ' gi-common';
    tone = r.coins >= 1000 ? 'coin' : 'common';
  }
  return { cls, icon, name, tone };
}

function getGachaSummaryParts(results) {
  const rods = results.filter(r => r.type === 'rod');
  const pets = results.filter(r => r.type === 'pet');
  const accessories = results.filter(r => r.type === 'accessory');
  const totalCoins = results.filter(r => r.type === 'coins').reduce((s, r) => s + r.coins, 0);
  const totalDiamonds = results.filter(r => r.type === 'diamonds').reduce((s, r) => s + r.diamonds, 0);
  const summaryParts = [];
  if (pets.length > 0) {
    summaryParts.push(...pets.map((r) => {
      const pet = GAME_DATA.PETS.find(p => p.id === r.id);
      return `🎉 获得宠物 ${pet ? pet.icon + ' ' + pet.name : r.id}！`;
    }));
  }
  if (rods.length > 0) {
    summaryParts.push(...rods.map((r) => {
      const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
      return `🎉 获得 ${rod ? rod.name : r.id}！`;
    }));
  }
  if (accessories.length > 0) {
    summaryParts.push(...accessories.map((r) => {
      const accessory = GAME_DATA.ACCESSORIES.find(a => a.id === r.id);
      return `🎉 获得首饰 ${accessory ? accessory.icon + ' ' + accessory.name : r.id} ${r.star || 1}★！`;
    }));
  }
  if (totalDiamonds > 0) summaryParts.push(`💎 共获得 ${totalDiamonds} 钻石`);
  if (totalCoins > 0) summaryParts.push(`💰 共获得 ${totalCoins} 金币`);
  return summaryParts;
}

function getPhaserGachaSnapshot() {
  const currency = activeGachaCurrency === 'diamonds' ? 'diamonds' : 'coins';
  const season = getGachaSeason(currency);
  const singleCost = getGachaCost(1, currency, season);
  const tenCost = getGachaCost(10, currency, season);
  const balance = currency === 'diamonds' ? (user.diamonds || 0) : user.money;
  return {
    type: 'gacha',
    title: '幸运抽奖',
    money: user.money,
    diamonds: user.diamonds || 0,
    currency,
    season,
    status: phaserUi.status,
    currencyTabs: [
      { currency: 'coins', label: '金币抽奖', active: currency === 'coins' },
      { currency: 'diamonds', label: '钻石抽奖', active: currency === 'diamonds' },
    ],
    seasonTabs: Object.keys(GACHA_PRIZES[currency]).map(id => ({
      currency,
      season: Number(id),
      label: `第${id}期`,
      active: Number(id) === season,
    })),
    prizes: GACHA_PRIZES[currency][season] || [],
    drawButtons: [
      { label: `单抽 ${currency === 'diamonds' ? '💎' : '💰'}${singleCost}`, count: 1, cost: singleCost, disabled: balance < singleCost },
      { label: `十连 ${currency === 'diamonds' ? '💎' : '💰'}${tenCost}`, count: 10, cost: tenCost, disabled: balance < tenCost },
    ],
    results: lastGachaResults.map(getGachaResultItem),
    summary: getGachaSummaryParts(lastGachaResults),
  };
}

function openPhaserGacha() {
  clearGachaResult();
  setGachaTab(activeGachaCurrency, { source: 'phaser' });
  return openPhaserModal('gacha');
}

function countUnlockedBaitDex(baitId) {
  const bait = BAITS[baitId];
  if (!bait) return 0;
  return bait.fishes.filter((f) => user.dex[f.id] && user.dex[f.id].count > 0).length;
}

function getGachaCost(count, currency, season) {
  if (currency === 'diamonds') return count === 1 ? 10 : 90;
  if (season === 2) return count === 1 ? 10000 : 100000;
  return count === 1 ? 1000 : 9000;
}

async function doGacha(count, currency = activeGachaCurrency, season, options = {}) {
  const source = options.source || 'dom';
  const usePhaser = source === 'phaser';
  currency = currency === 'diamonds' ? 'diamonds' : 'coins';
  if (season === undefined) season = currency === 'coins' ? activeGachaCoinSeason : activeGachaDiamondSeason;
  const cost = getGachaCost(count, currency, season);
  if (currency === 'diamonds') {
    if ((user.diamonds || 0) < cost) {
      const msg = '钻石不足！需要 ' + cost + ' 钻石';
      if (usePhaser) phaserUi.status = msg;
      else alert(msg);
      return;
    }
  } else if (user.money < cost) {
    const msg = '金币不足！需要 ' + cost + ' 金币';
    if (usePhaser) phaserUi.status = msg;
    else alert(msg);
    return;
  }
  if (usePhaser) {
    phaserUi.status = '抽奖中...';
    lastGachaResults = [];
  }
  try {
    const res = await fetch(API_BASE + '/api/gacha/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, count, currency, season }),
    });
    const data = await res.json();
    if (data.error) {
      if (usePhaser) phaserUi.status = data.error;
      else alert(data.error);
      return;
    }
    Object.assign(user, data.patch || {});
    ensureUserDefaults();
    refreshUI();
    lastGachaResults = data.results || [];
    if (usePhaser) {
      phaserUi.status = count === 10 ? '十连抽奖完成' : '单抽完成';
    } else {
      showGachaResult(lastGachaResults);
    }
  } catch (e) {
    if (usePhaser) phaserUi.status = '网络错误，请重试';
    else alert('网络错误，请重试');
  }
}

function showGachaResult(results) {
  const el = $('gacha-result');
  el.classList.remove('hidden');
  let html = '<div class="gacha-result-items">';
  for (let i = 0; i < results.length; i++) {
    const item = getGachaResultItem(results[i]);
    const delay = i * 0.1;
    html += `<div class="${item.cls}" style="animation-delay:${delay}s"><span class="gi-icon">${item.icon}</span><span class="gi-name">${item.name}</span></div>`;
  }
  html += '</div>';
  const summaryParts = getGachaSummaryParts(results);
  const summary = `<div class="gacha-summary">${summaryParts.join('<br>')}</div>`;
  el.innerHTML = html + summary;
}

// ====== 版本与公告 ======
const ANNOUNCEMENT_PAGE_SIZE = 3;
const announceOverlay = $('announce-overlay');
versionReady = fetch('/version.json?t=' + Date.now()).then(r => r.json()).then(d => {
  versionData = d;
  $('version-tag').textContent = 'v' + d.version;
}).catch(() => {});

async function checkAnnouncement() {
  await versionReady;
  if (!versionData) return;
  const lastSeen = localStorage.getItem('fishing_last_version') || '';
  if (lastSeen === versionData.version) return;
  if (showAnnouncement(lastSeen)) {
    localStorage.setItem('fishing_last_version', versionData.version);
  }
}

function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getAnnouncementEntries(sinceVersion) {
  if (!versionData) return [];
  return versionData.changelog
    .filter((entry) => !(sinceVersion && compareVersions(entry.version, sinceVersion) <= 0))
    .map((entry) => ({
      version: entry.version,
      date: entry.date,
      changes: Array.isArray(entry.changes) ? entry.changes : [],
    }));
}

function getPhaserAnnouncementSnapshot() {
  const data = phaserUi.data || {};
  const entries = data.entries || [];
  const totalPages = Math.max(1, Math.ceil(entries.length / ANNOUNCEMENT_PAGE_SIZE));
  const page = Math.max(0, Math.min(data.page || 0, totalPages - 1));
  data.page = page;
  return {
    type: 'announcement',
    title: '更新公告',
    entries: entries.slice(page * ANNOUNCEMENT_PAGE_SIZE, (page + 1) * ANNOUNCEMENT_PAGE_SIZE),
    page,
    totalPages,
  };
}

function setPhaserAnnouncementPage(delta) {
  if (phaserUi.modal !== 'announcement' || !phaserUi.data) return;
  const entries = phaserUi.data.entries || [];
  const totalPages = Math.max(1, Math.ceil(entries.length / ANNOUNCEMENT_PAGE_SIZE));
  const nextPage = Math.max(0, Math.min((phaserUi.data.page || 0) + delta, totalPages - 1));
  phaserUi.data.page = nextPage;
}

function showAnnouncement(sinceVersion) {
  const entries = getAnnouncementEntries(sinceVersion);
  if (!entries.length) return false;
  if (openOrQueuePhaserModal('announcement', { entries, page: 0 })) {
    announceOverlay?.classList.add('hidden');
    return true;
  }
  const el = $('announce-content');
  let html = '';
  for (const entry of entries) {
    html += `<div class="announce-version">v${entry.version}<span class="announce-date">${entry.date}</span></div>`;
    html += '<ul class="announce-list">';
    for (const c of entry.changes) html += `<li>${c}</li>`;
    html += '</ul>';
  }
  el.innerHTML = html;
  announceOverlay.classList.remove('hidden');
  return true;
}

$('announce-close').onclick = () => announceOverlay.classList.add('hidden');
$('version-tag').onclick = () => { if (versionData) { showAnnouncement(''); } };

// 在 enterGame 中触发公告检查和广告初始化
const _origEnterGame = enterGame;
enterGame = function() {
  _origEnterGame();
  checkAnnouncement();
  initCSJAd();
  updateAdButtons();
};

// 关闭按钮
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.onclick = () => $(btn.dataset.close).classList.add('hidden');
});
