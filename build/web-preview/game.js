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
  showAdToast(`🎉 获得 ${AD_REWARD_DIAMONDS} 钻石！`);
  updateAdButtons();
}

// 商店广告按钮
document.addEventListener('DOMContentLoaded', () => {
  const rewardBtn = $('ad-reward-btn');
  if (rewardBtn) {
    rewardBtn.onclick = () => {
      if (isAdOnCooldown()) {
        showAdToast(`广告冷却中，请${getAdCooldownRemain()}秒后再试`);
        return;
      }
      if (!adInstance || !adReady) {
        if (typeof window.H5Union === 'undefined') {
          adLastWatchTime = Date.now();
          onAdRewardGranted();
          return;
        }
        showAdToast('广告尚未加载完成，请稍后再试');
        return;
      }
      showRewardedAd(() => { onAdRewardGranted(); });
    };
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
  vipAutoBtn.hidden = !user;
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
    errEl.textContent = '登录失败: ' + e.message + '（请确认服务器已启动）';
    console.error(e);
  }
}

$('logout-btn').onclick = () => {
  saveRevision++;
  resetVipAutoForUser();
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
    }
  } catch (_) {}
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
  gameScreen.classList.add('active');
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
  if (!target || !character || user.ownedCharacters.includes(characterId)) return;
  if ((user.characterFragments[characterId] || 0) < required) return;
  user.characterFragments[characterId] -= required;
  user.ownedCharacters.push(characterId);
  user.activeCharacter = characterId;
  statusEl.textContent = `已合成并解锁 ${character.name}`;
  refreshUI();
  saveUser('character');
  renderCharacters();
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
      hitbar: getPhaserHitbarSnapshot(),
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

function loop() {
  if (user) render();
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
    if (!options.silent) alert('没有鱼饵了，去商店买点吧！');
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
$('result-close-bottom').onclick = () => resultOverlay.classList.add('hidden');

function showResult(c) {
  const retryBox = $('ad-retry-box');
  if (retryBox) retryBox.classList.add('hidden');
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
  const baitDrops = c.baitDrops || (c.baitDrop ? [c.baitDrop] : []);
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
  const rewards = [];
  if (c.value) rewards.push(`+${c.value} 金币`);
  if (c.diamondValue) rewards.push(`+${c.diamondValue} 钻石`);
  if (c.diamonds) rewards.push(`额外 +${c.diamonds} 钻石`);
  for (const drop of baitDrops) rewards.push(`获得 ${BAITS[drop.id].name} ×${drop.count}`);
  if (c.unlockedRod) rewards.push('解锁黑丝鱼竿');
  if (c.unlockedCharacter && character) rewards.push(`解锁角色 ${character.name}`);
  statusEl.textContent = `钓到了 ${c.item.name}！${rewards.join('，')}`;
}

function showMiss(msg) {
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
      if (typeof window.H5Union === 'undefined') {
        adLastWatchTime = Date.now();
        user.diamonds = (user.diamonds || 0) + AD_REWARD_DIAMONDS;
        user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
        refreshUI();
        saveUser('wallet');
        resultOverlay.classList.add('hidden');
        showAdToast(`🎉 获得 ${AD_REWARD_DIAMONDS} 钻石，再来一次！`);
        startCast();
        return;
      }
      showRewardedAd(() => {
        user.diamonds = (user.diamonds || 0) + AD_REWARD_DIAMONDS;
        user.stats.totalDiamonds = (user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
        refreshUI();
        saveUser('wallet');
        resultOverlay.classList.add('hidden');
        startCast();
      });
    };
  } else if (retryBox) {
    retryBox.classList.add('hidden');
  }
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
    const bait = BAITS[id];
    const cost = bait.price * n;
    const isDiamond = bait.currency === 'diamonds';
    if (isDiamond) {
      if ((user.diamonds || 0) < cost) { alert('钻石不足'); return; }
      user.diamonds -= cost;
    } else {
      if (user.money < cost) { alert('金币不足'); return; }
      user.money -= cost;
    }
    user.baits[id] = (user.baits[id] || 0) + n;
    refreshUI();
    renderShop();
    saveUser('shop');
    maybeResumeVipAutoAfterInventoryChange();
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
    if (b.hideDex) continue;
    const btn = document.createElement('button');
    btn.textContent = b.dexName || b.name;
    if (id === activeDexBait) btn.classList.add('active');
    btn.onclick = () => { activeDexBait = id; renderDex(); };
    tabs.appendChild(btn);
  }
  // 鱼竿专属图鉴 tab
  const rodDexBtn = document.createElement('button');
  rodDexBtn.textContent = '🎣 鱼竿专属';
  if (activeDexBait === '_rod_exclusive') rodDexBtn.classList.add('active');
  rodDexBtn.onclick = () => { activeDexBait = '_rod_exclusive'; renderDex(); };
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
$('character-btn').onclick = () => { renderCharacters(); characterOverlay.classList.remove('hidden'); };

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
        user.activeCharacter = character.id;
        refreshUI();
        saveUser('selection');
        renderCharacters();
      };
    } else if (canSynthesize) {
      div.querySelector('[data-compose]').onclick = (e) => {
        e.stopPropagation();
        synthesizeCharacter(character.id);
      };
    }
    list.appendChild(div);
  }
}

// ====== 宠物系统 ======
const petOverlay = $('pet-overlay');
$('pet-btn').onclick = () => { renderPets(); petOverlay.classList.remove('hidden'); };

function renderPets() {
  const list = $('pet-list');
  list.innerHTML = '';
  const owned = user.ownedPets || [];
  for (const pet of GAME_DATA.PETS) {
    const isOwned = owned.includes(pet.id);
    const isActive = user.activePet === pet.id;
    const div = document.createElement('div');
    div.className = 'pet-item' + (isActive ? ' active' : '') + (!isOwned ? ' locked' : '');
    const bonus = PET_BONUS[pet.id];
    const abilityText = bonus
      ? (bonus.coins ? `钓鱼金币+${bonus.coins}` : `钓鱼钻石+${bonus.diamonds}`)
      : '';
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
        user.activePet = isActive ? null : pet.id;
        refreshUI(); saveUser('pet'); renderPets();
      };
    }
    list.appendChild(div);
  }
}

// ====== 首饰系统 ======
const accessoryOverlay = $('accessory-overlay');
$('accessory-btn').onclick = () => { renderAccessories(); accessoryOverlay.classList.remove('hidden'); };

function findAccessoryUpgradeMaterial(target) {
  return (user.accessories || []).find(item =>
    item.uid !== target.uid &&
    item.type === target.type &&
    GAME_DATA.clampAccessoryStar(item.star) === GAME_DATA.clampAccessoryStar(target.star)
  );
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

  const sorted = [...user.accessories].sort((a, b) => {
    if (a.uid === user.equippedAccessory) return -1;
    if (b.uid === user.equippedAccessory) return 1;
    return b.star - a.star || a.type.localeCompare(b.type);
  });

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
        user.equippedAccessory = user.equippedAccessory === btn.dataset.equip ? null : btn.dataset.equip;
        saveUser('selection');
        refreshUI();
        renderAccessories(user.equippedAccessory ? '已装备首饰' : '已卸下首饰');
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

function upgradeAccessory(uid) {
  normalizeAccessories();
  const target = user.accessories.find(item => item.uid === uid);
  if (!target || target.star >= 20) return;
  const material = findAccessoryUpgradeMaterial(target);
  if (!material) {
    renderAccessories('缺少同款同星首饰');
    return;
  }
  const def = GAME_DATA.getAccessoryDef(target.type);
  const cost = GAME_DATA.getAccessoryUpgradeCost(target.star);
  if (user.money < cost) {
    renderAccessories(`金币不足，需要 ${cost} 金币`);
    return;
  }
  const chance = GAME_DATA.getAccessoryUpgradeChance(target.star);
  const success = Math.random() < chance;
  user.money -= cost;
  if (success) target.star = GAME_DATA.clampAccessoryStar(target.star + 1);
  user.accessories = user.accessories.filter(item => item.uid !== material.uid);
  saveUser('accessory');
  refreshUI();
  renderAccessories(success
    ? `${def.name} 强化成功，消耗 ${cost} 金币，升至 ${target.star} 星`
    : `${def.name} 强化失败，消耗 ${cost} 金币和材料`);
}

// ====== 排行榜 ======
const rankOverlay = $('rank-overlay');
let activeRankTab = 'today-catches';
let rankData = null;

function showPendingRankRewards(rewards) {
  if (!rewards || rewards.length === 0) return;
  for (const r of rewards) {
    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `<div class="modal"><button class="close-x top-close" onclick="this.parentElement.parentElement.remove()">✕</button><h2>🏆 排名奖励</h2><div style="text-align:center;padding:20px"><p style="font-size:1.2em;color:#ffd700">恭喜你在 <strong>${r.date}</strong> 获得</p><p style="font-size:1.5em;margin:16px 0">🎣 今日钓鱼数第一名</p><p style="font-size:1.1em;color:#aaa">钓鱼 <strong style="color:#fff">${r.catches}</strong> 次</p><p style="font-size:1.4em;margin-top:16px;color:#ffd700">💎 +${r.diamonds} 钻石</p></div></div>`;
      document.getElementById('game-screen').appendChild(overlay);
    }, 500);
  }
  refreshUI();
}

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

let rankHistory = null;
async function loadLeaderboard() {
  const loading = $('rank-loading');
  const list = $('rank-list');
  loading.classList.remove('hidden');
  list.innerHTML = '';
  try {
    const [lbRes, histRes] = await Promise.all([fetch(API_BASE + '/api/leaderboard'), fetch(API_BASE + '/api/rank-history')]);
    rankData = await lbRes.json();
    rankHistory = (await histRes.json()).history || [];
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

  let html = '';
  if (activeRankTab === 'today-catches') {
    html += '<div class="rank-reward-banner">🏆 今日钓鱼数第一名可获得 <strong>💎 5000 钻石</strong>（每晚 23:59 结算）</div>';
  }

  if (sorted.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#888">暂无数据</div>';
  } else {
    const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };
    html += '<table><tr><th>#</th><th>玩家</th><th style="text-align:right">' + (isWeight ? '重量 (kg)' : '数量') + '</th></tr>';
    sorted.forEach((e, i) => {
      const rank = i + 1;
      const isMe = user && e.username === user.username;
      const medal = medalMap[rank] || rank;
      const rankClass = rank <= 3 ? ` rank-${rank}` : '';
      html += `<tr class="${isMe ? 'me' : ''}"><td class="rank-num${rankClass}">${medal}</td><td>${e.username}</td><td class="rank-val">${isWeight ? e[sortKey].toFixed(2) : e[sortKey]}</td></tr>`;
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
        saveUser('rod');
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
      status.innerHTML = `兑换成功！<br>${data.desc} ${reward}🎉`;
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
  const todayKey = todayCN();
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
    const todayKey = todayCN();
    if (user.lastShareDate !== todayKey) {
      user.money += 10;
      user.lastShareDate = todayKey;
      refreshUI();
      saveUser('share');
      status.textContent = '链接已复制！获得 10 金币奖励 🎉';
      status.className = 'share-status success';
    } else {
      status.textContent = '链接已复制！（今日奖励已领取）';
      status.className = 'share-status info';
    }
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    const todayKey = todayCN();
    if (user.lastShareDate !== todayKey) {
      user.money += 10;
      user.lastShareDate = todayKey;
      refreshUI();
      saveUser('share');
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
    activeGachaDiamondSeason = parseInt(btn.dataset.diamondSeason);
    document.querySelectorAll('[data-diamond-season]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.diamondSeason) === activeGachaDiamondSeason));
    $('gacha-diamond-s1').classList.toggle('hidden', activeGachaDiamondSeason !== 1);
    $('gacha-diamond-s2').classList.toggle('hidden', activeGachaDiamondSeason !== 2);
    $('gacha-diamond-s3').classList.toggle('hidden', activeGachaDiamondSeason !== 3);
    $('gacha-result').classList.add('hidden');
  };
});
document.querySelectorAll('[data-coin-season]').forEach((btn) => {
  btn.onclick = () => {
    activeGachaCoinSeason = parseInt(btn.dataset.coinSeason);
    document.querySelectorAll('[data-coin-season]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.coinSeason) === activeGachaCoinSeason));
    $('gacha-coin-s1').classList.toggle('hidden', activeGachaCoinSeason !== 1);
    $('gacha-coin-s2').classList.toggle('hidden', activeGachaCoinSeason !== 2);
    $('gacha-result').classList.add('hidden');
  };
});

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

function getGachaCost(count, currency, season) {
  if (currency === 'diamonds') return count === 1 ? 10 : 90;
  if (season === 2) return count === 1 ? 10000 : 100000;
  return count === 1 ? 1000 : 9000;
}

async function doGacha(count, currency = activeGachaCurrency, season) {
  if (season === undefined) season = currency === 'coins' ? activeGachaCoinSeason : activeGachaDiamondSeason;
  const cost = getGachaCost(count, currency, season);
  if (currency === 'diamonds') {
    if ((user.diamonds || 0) < cost) { alert('钻石不足！需要 ' + cost + ' 钻石'); return; }
  } else if (user.money < cost) {
    alert('金币不足！需要 ' + cost + ' 金币');
    return;
  }
  try {
    const res = await fetch(API_BASE + '/api/gacha/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, count, currency, season }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    Object.assign(user, data.patch || {});
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
    if (r.type === 'pet') {
      const pet = GAME_DATA.PETS.find(p => p.id === r.id);
      icon = pet ? pet.icon : '🐾';
      name = pet ? pet.name : r.id;
      cls += ' gi-ultimate';
    } else if (r.type === 'rod') {
      const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
      icon = (rod && rod.emoji) || '🎣';
      name = rod ? rod.name : r.id;
      cls += ' gi-' + ((rod && rod.rarity) || 'rare');
    } else if (r.type === 'accessory') {
      const accessory = GAME_DATA.ACCESSORIES.find(a => a.id === r.id);
      icon = accessory ? accessory.icon : '💍';
      name = `${accessory ? accessory.name : r.id} ${r.star || 1}★`;
      cls += ' gi-accessory';
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
  const pets = results.filter(r => r.type === 'pet');
  const accessories = results.filter(r => r.type === 'accessory');
  const totalCoins = results.filter(r => r.type === 'coins').reduce((s, r) => s + r.coins, 0);
  const totalDiamonds = results.filter(r => r.type === 'diamonds').reduce((s, r) => s + r.diamonds, 0);
  const summaryParts = [];
  if (pets.length > 0) {
    summaryParts.push(pets.map((r) => {
      const pet = GAME_DATA.PETS.find(p => p.id === r.id);
      return `🎉 获得宠物 ${pet ? pet.icon + ' ' + pet.name : r.id}！`;
    }).join('<br>'));
  }
  if (rods.length > 0) {
    summaryParts.push(rods.map((r) => {
      const rod = GAME_DATA.GACHA_RODS.find(g => g.id === r.id);
      return `🎉 获得 ${rod ? rod.name : r.id}！`;
    }).join('<br>'));
  }
  if (accessories.length > 0) {
    summaryParts.push(accessories.map((r) => {
      const accessory = GAME_DATA.ACCESSORIES.find(a => a.id === r.id);
      return `🎉 获得首饰 ${accessory ? accessory.icon + ' ' + accessory.name : r.id} ${r.star || 1}★！`;
    }).join('<br>'));
  }
  if (totalDiamonds > 0) summaryParts.push(`💎 共获得 ${totalDiamonds} 钻石`);
  if (totalCoins > 0) summaryParts.push(`💰 共获得 ${totalCoins} 金币`);
  const summary = `<div class="gacha-summary">${summaryParts.join('<br>')}</div>`;
  el.innerHTML = html + summary;
}

// ====== 版本与公告 ======
let versionData = null;
let versionReady = fetch('/version.json?t=' + Date.now()).then(r => r.json()).then(d => {
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

function showAnnouncement(sinceVersion) {
  const el = $('announce-content');
  let html = '';
  for (const entry of versionData.changelog) {
    if (sinceVersion && compareVersions(entry.version, sinceVersion) <= 0) continue;
    html += `<div class="announce-version">v${entry.version}<span class="announce-date">${entry.date}</span></div>`;
    html += '<ul class="announce-list">';
    for (const c of entry.changes) html += `<li>${c}</li>`;
    html += '</ul>';
  }
  if (!html) return false;
  el.innerHTML = html;
  $('announce-overlay').classList.remove('hidden');
  return true;
}

$('announce-close').onclick = () => $('announce-overlay').classList.add('hidden');
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
