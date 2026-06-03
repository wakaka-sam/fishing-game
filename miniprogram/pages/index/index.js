const GAME_DATA = require('../../utils/game-data');
const VERSION_DATA = require('../../utils/version');
const CODES = require('../../utils/codes');
const API = require('../../utils/api');

const {
  BAITS,
  HITS_BY_RARITY,
  RARITY_COLOR,
  RARITY_NAME,
} = GAME_DATA;

const CANVAS_W = 340;
const CANVAS_H = 191;
const SAVE_PREFIX = 'fishing_user_';
const USERNAME_KEY = 'fishing_username';
const LAST_VERSION_KEY = 'fishing_last_version';
const USED_CODES_KEY = 'fishing_used_codes';
const AD_REWARD_DIAMONDS = 50;
const AD_COOLDOWN_MS = 120000;
const DIAMOND_JACKPOT_CHANCE = 0.01;
const DIVINE_BAIT_ID = 'divine';
const JB_BAIT_ID = 'jb';
const DIVINE_BAIT_DROP_CHANCE = 0.0001;
const JB_BAIT_DROP_CHANCE = 0.05;
const BLACK_SILK_BAIT_ID = 'black_silk';
const BLACK_SILK_ROD_ID = 'black_silk_rod';
const VIP_AUTO_USERNAMES = ['wakaka'];
const VIP_AUTO_FIRST_IDLE_MS = 1000;
const VIP_AUTO_RESUME_IDLE_MS = 3000;
const VIP_AUTO_TICK_MS = 500;

const PET_BONUS = {
  cat: { coins: 10 },
  dog: { coins: 10 },
  parrot: { diamonds: 1 },
  penguin: { diamonds: 1 },
  rabbit: { diamonds: 1 },
  fox: { diamonds: 1 },
  dragon: { diamonds: 5 },
  unicorn: { diamonds: 5 },
};

const GACHA_ACCESSORIES = ['scale_charm', 'tide_bracelet', 'star_brooch'];

function todayCN() {
  return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
}

function sanitizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
}

function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1800 });
}

function makeAccessoryUid() {
  return 'acc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function createAccessory(type) {
  return { uid: makeAccessoryUid(), type, star: 1 };
}

function mergeUserData(name, existing) {
  const defaults = defaultUser(name);
  const source = existing || {};
  return {
    ...defaults,
    ...source,
    username: name,
    vip: source.vip === true,
    baits: { ...defaults.baits, ...(source.baits || {}) },
    stats: { ...defaults.stats, ...(source.stats || {}) },
    dailyStats: source.dailyStats || defaults.dailyStats,
    ownedRods: source.ownedRods || [],
    ownedPets: source.ownedPets || [],
    ownedCharacters: Array.isArray(source.ownedCharacters) ? source.ownedCharacters : defaults.ownedCharacters,
    characterFragments: source.characterFragments || {},
    accessories: Array.isArray(source.accessories) ? source.accessories : [],
  };
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
    lastShareDate: '',
    rodSkin: '',
    dailyStats: { date: '', catches: 0, weight: 0 },
    ownedRods: [],
    ownedPets: [],
    activePet: null,
    ownedCharacters: [GAME_DATA.DEFAULT_CHARACTER_ID || 'fishing_master'],
    activeCharacter: GAME_DATA.DEFAULT_CHARACTER_ID || 'fishing_master',
    characterFragments: {},
    accessories: [],
    equippedAccessory: null,
    rankRewards: [],
  };
}

function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

Page({
  data: {
    isLoggedIn: false,
    usernameInput: '',
    loginError: '',
    version: VERSION_DATA.version || 'dev',
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    userView: { username: '', money: 0, diamonds: 0 },
    menuButtons: [
      { key: 'shop', label: '商店' },
      { key: 'dex', label: '图鉴' },
      { key: 'rod', label: '鱼竿' },
      { key: 'character', label: '角色' },
      { key: 'accessory', label: '首饰' },
      { key: 'pet', label: '宠物' },
      { key: 'rank', label: '排行' },
      { key: 'gacha', label: '抽奖' },
      { key: 'redeem', label: '兑换' },
      { key: 'share', label: '分享' },
    ],
    baitOptions: [],
    selectedBaitIndex: 0,
    selectedBaitLabel: '',
    baitCountText: '',
    rodInfo: '',
    castDisabled: true,
    status: '准备好后选择鱼饵抛竿',
    mobileButtonText: '抛竿',
    mobileButtonBg: 'linear-gradient(135deg, #d35400, #ff6f00)',
    canUseVipAuto: false,
    vipAutoText: 'VIP自动: 关',
    vipAutoClass: '',
    hitbarVisible: false,
    hitbar: {
      message: '',
      color: '#ffae42',
      hits: 0,
      hitsNeeded: 0,
      timeLeft: '12.0',
      zoneLeft: 0,
      zoneWidth: 20,
      cursorLeft: 0,
    },
    modal: '',
    modalWide: false,
    result: {},
    shopItems: [],
    adRewardDisabled: false,
    adRewardText: '免费领取',
    dexTabs: [],
    dexItems: [],
    dexStats: [],
    rodItems: [],
    characterItems: [],
    petItems: [],
    accessorySummary: '',
    accessoryStatus: '',
    accessoryStatusClass: '',
    accessoryItems: [],
    accessoryCatalog: [],
    rankItems: [],
    activeGachaCurrency: 'coins',
    activeGachaCoinSeason: 1,
    activeGachaDiamondSeason: 1,
    gachaSeasons: [],
    gachaPrizes: [],
    gachaSingleCost: '',
    gachaTenCost: '',
    gachaResults: [],
    gachaSummary: '',
    redeemInput: '',
    redeemStatus: '',
    redeemStatusClass: '',
    shareStatus: '',
    announceEntries: [],
    syncStatus: '',
  },

  onLoad() {
    this.user = null;
    this.ctx = null;
    this.loopTimer = null;
    this.waitTimer = null;
    this.hitbarTimer = null;
    this.hitbarLoop = null;
    this.saveTimer = null;
    this.saveQueue = Promise.resolve();
    this.adLastWatchTime = 0;
    this.activeDexBait = 'worm';
    const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : { windowWidth: 375 };
    const canvasWidth = Math.max(300, Math.min((info.windowWidth || 375) - 24, 380));
    const canvasHeight = Math.round(canvasWidth * 9 / 16);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.setData({ canvasWidth, canvasHeight });
    this.state = {
      phase: 'idle',
      castBait: null,
      hookX: canvasWidth / 2,
      hookY: canvasHeight * 0.55,
    };
    this.hb = {
      catch: null,
      hitsNeeded: 0,
      hits: 0,
      cursorPos: 0,
      cursorDir: 1,
      cursorSpeed: 0,
      zoneStart: 0,
      zoneWidth: 0,
      timeLeft: 0,
      active: false,
    };
    this.vipAuto = {
      enabled: false,
      running: false,
      idleTimer: null,
      tickTimer: null,
      baitId: null,
      nextDelay: VIP_AUTO_FIRST_IDLE_MS,
      noBaitNotified: false,
    };

    const saved = wx.getStorageSync(USERNAME_KEY);
    if (saved) this.setData({ usernameInput: saved });
    this.initCanvas();
    if (saved) this.loadUser(saved, true);
  },

  onUnload() {
    this.saveUser(true);
    this.clearTimers();
  },

  onHide() {
    this.saveUser(true);
  },

  onShareAppMessage() {
    if (this.user) {
      const todayKey = todayCN();
      if (this.user.lastShareDate !== todayKey) {
        this.user.money += 10;
        this.user.lastShareDate = todayKey;
        this.saveUser();
        this.refreshUI();
        this.setData({ shareStatus: '今日首次分享，获得 10 金币' });
      }
    }
    return {
      title: '像素钓鱼',
      path: this.user ? `/pages/index/index?ref=${encodeURIComponent(this.user.username)}` : '/pages/index/index',
      imageUrl: '/assets/app-icon-144.png',
    };
  },

  noop() {},

  onUsernameInput(e) {
    this.setData({ usernameInput: e.detail.value });
  },

  login() {
    const name = sanitizeName(this.data.usernameInput);
    if (!name) {
      this.setData({ loginError: '请输入有效用户名（字母数字下划线）' });
      return;
    }
    this.loadUser(name, false);
  },

  async loadUser(name, silent) {
    const localUser = wx.getStorageSync(SAVE_PREFIX + name);
    let source = localUser;
    let online = false;
    try {
      source = await API.login(name);
      online = true;
    } catch (err) {
      if (!silent) showToast('网络不可用，使用本地缓存');
      console.warn('login fallback to local cache', err);
    }
    this.user = mergeUserData(name, source);
    this.ensureUserDefaults();
    wx.setStorageSync(USERNAME_KEY, name);
    wx.setStorageSync(SAVE_PREFIX + name, this.user);
    this.setData({ isLoggedIn: true, loginError: '', usernameInput: name });
    this.resetVipAutoForUser();
    this.refreshUI();
    this.saveUser(online);
    this.checkAnnouncement();
    if (!silent) showToast('欢迎回来');
  },

  logout() {
    this.saveUser();
    this.resetVipAutoForUser();
    this.user = null;
    wx.removeStorageSync(USERNAME_KEY);
    this.setData({ isLoggedIn: false, modal: '', usernameInput: '', loginError: '' });
  },

  saveUser(immediate = false) {
    if (!this.user) return;
    wx.setStorageSync(SAVE_PREFIX + this.user.username, this.user);
    if (!API.REMOTE_ENABLED) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    const delay = immediate ? 0 : 500;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.syncUserToServer();
    }, delay);
  },

  syncUserToServer() {
    if (!this.user) return;
    const snapshot = JSON.parse(JSON.stringify(this.user));
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(() => API.save(snapshot.username, snapshot))
      .then((saved) => {
        if (!this.user || this.user.username !== snapshot.username) return;
        this.user = mergeUserData(snapshot.username, saved || snapshot);
        wx.setStorageSync(SAVE_PREFIX + this.user.username, this.user);
        this.setData({ syncStatus: '已同步' });
        this.refreshUI();
      })
      .catch((err) => {
        console.warn('save remote failed', err);
        this.setData({ syncStatus: '本地已保存，稍后同步' });
      });
  },

  ensureUserDefaults() {
    if (!this.user) return;
    this.user.money = Math.max(0, Math.floor(this.user.money || 0));
    this.user.diamonds = Math.max(0, Math.floor(this.user.diamonds || 0));
    this.user.baits = this.user.baits || {};
    Object.keys(BAITS).forEach((id) => {
      this.user.baits[id] = Math.max(0, Math.floor(this.user.baits[id] || 0));
    });
    this.user.dex = this.user.dex || {};
    this.user.stats = this.user.stats || {};
    this.user.history = this.user.history || [];
    this.user.ownedRods = this.user.ownedRods || [];
    this.user.ownedPets = this.user.ownedPets || [];
    this.user.activePet = this.user.activePet || null;
    this.normalizeCharacters();
    this.normalizeCharacterFragments();
    this.normalizeAccessories();
    this.unlockBlackSilkRodIfComplete();
  },

  normalizeCharacters() {
    const defaultId = GAME_DATA.DEFAULT_CHARACTER_ID || 'fishing_master';
    const validIds = new Set(GAME_DATA.CHARACTERS.map((c) => c.id));
    this.user.ownedCharacters = Array.isArray(this.user.ownedCharacters)
      ? this.user.ownedCharacters.filter((id) => validIds.has(id))
      : [];
    if (!this.user.ownedCharacters.includes(defaultId)) this.user.ownedCharacters.unshift(defaultId);
    if (!validIds.has(this.user.activeCharacter) || !this.user.ownedCharacters.includes(this.user.activeCharacter)) {
      this.user.activeCharacter = defaultId;
    }
  },

  normalizeCharacterFragments() {
    const incoming = this.user.characterFragments || {};
    const normalized = {};
    GAME_DATA.CHARACTER_SHARD_TARGETS.forEach((target) => {
      const count = incoming[target.characterId] || incoming[target.id] || 0;
      normalized[target.characterId] = Math.max(0, Math.floor(count || 0));
    });
    this.user.characterFragments = normalized;
  },

  normalizeAccessories() {
    const validTypes = new Set(GAME_DATA.ACCESSORIES.map((a) => a.id));
    this.user.accessories = (Array.isArray(this.user.accessories) ? this.user.accessories : [])
      .map((item) => {
        const type = typeof item === 'string' ? item : (item.type || item.id);
        if (!validTypes.has(type)) return null;
        return {
          uid: item.uid || makeAccessoryUid(),
          type,
          star: GAME_DATA.clampAccessoryStar(item.star || 1),
        };
      })
      .filter(Boolean);
    if (!this.user.accessories.some((item) => item.uid === this.user.equippedAccessory)) {
      this.user.equippedAccessory = null;
    }
  },

  refreshUI() {
    if (!this.user) return;
    this.ensureUserDefaults();
    const baitOptions = Object.keys(BAITS).map((id) => ({
      id,
      label: `${BAITS[id].name} (x${this.user.baits[id] || 0})`,
      disabled: (this.user.baits[id] || 0) <= 0,
    }));
    let selectedId = this.state.castBait || this.user.currentBait;
    if (!BAITS[selectedId] || (!this.state.castBait && (this.user.baits[selectedId] || 0) <= 0)) {
      selectedId = Object.keys(this.user.baits).find((id) => (this.user.baits[id] || 0) > 0) || 'worm';
      this.user.currentBait = selectedId;
    }
    const selectedBaitIndex = Math.max(0, baitOptions.findIndex((b) => b.id === selectedId));
    const selectedBait = baitOptions[selectedBaitIndex] || baitOptions[0];
    const baitCount = this.user.baits[selectedBait.id] || 0;
    const rodInfo = this.getRodInfo();
    const canUseVipAuto = this.canUseVipAuto();
    this.setData({
      userView: {
        username: this.user.username,
        money: this.user.money,
        diamonds: this.user.diamonds,
      },
      baitOptions,
      selectedBaitIndex,
      selectedBaitLabel: selectedBait.label,
      baitCountText: baitCount > 0 ? `剩余 ${baitCount} 个` : '没有鱼饵',
      castDisabled: !(baitCount > 0 && this.state.phase === 'idle'),
      rodInfo,
      canUseVipAuto,
      vipAutoText: this.getVipAutoText(),
      vipAutoClass: this.getVipAutoClass(),
      ...this.getMobileButtonData(),
    });
    this.updateOpenModal();
  },

  updateOpenModal() {
    const modal = this.data.modal;
    if (!modal || modal === 'result') return;
    if (modal === 'shop') this.renderShop();
    if (modal === 'dex') this.renderDex();
    if (modal === 'rod') this.renderRodSkins();
    if (modal === 'character') this.renderCharacters();
    if (modal === 'pet') this.renderPets();
    if (modal === 'accessory') this.renderAccessories(this.data.accessoryStatus || '');
    if (modal === 'rank') this.renderRank();
    if (modal === 'gacha') this.renderGacha();
  },

  getMobileButtonData() {
    if (this.state.phase === 'idle') {
      return { mobileButtonText: '抛竿', mobileButtonBg: 'linear-gradient(135deg, #d35400, #ff6f00)' };
    }
    if (this.state.phase === 'waiting') {
      return { mobileButtonText: '等待...', mobileButtonBg: 'linear-gradient(135deg, #2c3e50, #34495e)' };
    }
    if (this.state.phase === 'hooked') {
      return { mobileButtonText: '拉!', mobileButtonBg: 'linear-gradient(135deg, #c0392b, #e74c3c)' };
    }
    return { mobileButtonText: '击中!', mobileButtonBg: 'linear-gradient(135deg, #c0392b, #e74c3c)' };
  },

  getRodInfo() {
    const skin = GAME_DATA.getCurrentRodSkin(this.user.dex, this.user.rodSkin, this.user.ownedRods);
    const next = GAME_DATA.getNextRodSkin(this.user.dex);
    const dexCount = Object.keys(this.user.dex || {}).length;
    const character = GAME_DATA.CHARACTERS.find((c) => c.id === this.user.activeCharacter);
    const accessory = this.getEquippedAccessory();
    const parts = [`鱼竿 ${skin.name}`];
    if (character) parts.push(`角色 ${character.name}`);
    if (accessory) {
      const def = GAME_DATA.getAccessoryDef(accessory.type);
      if (def) parts.push(`${def.name} ${accessory.star}星`);
    }
    if (next) parts.push(`下一把 ${next.name} (${dexCount}/${next.threshold})`);
    return parts.join(' | ');
  },

  onBaitChange(e) {
    if (!this.user || this.state.phase !== 'idle') return;
    const index = Number(e.detail.value);
    const option = this.data.baitOptions[index];
    if (!option) return;
    if ((this.user.baits[option.id] || 0) <= 0) {
      showToast('这个鱼饵没有库存');
      return;
    }
    this.user.currentBait = option.id;
    if (this.vipAuto.enabled) this.vipAuto.baitId = option.id;
    this.saveUser();
    this.refreshUI();
  },

  openMenu(e) {
    const modal = e.currentTarget.dataset.menu;
    this.setData({ modal, modalWide: modal !== 'redeem' && modal !== 'share', gachaResults: [], gachaSummary: '' }, () => {
      this.updateOpenModal();
    });
  },

  closeModal() {
    this.setData({ modal: '', modalWide: false });
  },

  openAnnouncement() {
    this.setData({
      modal: 'announce',
      modalWide: true,
      announceEntries: VERSION_DATA.changelog || [],
    });
  },

  checkAnnouncement() {
    const lastSeen = wx.getStorageSync(LAST_VERSION_KEY) || '';
    if (lastSeen === VERSION_DATA.version) return;
    const entries = (VERSION_DATA.changelog || []).filter((entry) => !lastSeen || compareVersions(entry.version, lastSeen) > 0);
    if (!entries.length) return;
    wx.setStorageSync(LAST_VERSION_KEY, VERSION_DATA.version);
    this.setData({ modal: 'announce', modalWide: true, announceEntries: entries });
  },

  clearTimers() {
    if (this.loopTimer) clearTimeout(this.loopTimer);
    if (this.waitTimer) clearTimeout(this.waitTimer);
    if (this.hitbarTimer) clearInterval(this.hitbarTimer);
    if (this.hitbarLoop) clearTimeout(this.hitbarLoop);
    if (this.vipAuto.idleTimer) clearTimeout(this.vipAuto.idleTimer);
    if (this.vipAuto.tickTimer) clearInterval(this.vipAuto.tickTimer);
  },

  initCanvas() {
    this.ctx = wx.createCanvasContext('gameCanvas', this);
    this.renderLoop();
  },

  renderLoop() {
    this.drawScene();
    this.loopTimer = setTimeout(() => this.renderLoop(), 33);
  },

  drawScene() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = Date.now() / 1000;
    const W = this.canvasWidth || CANVAS_W;
    const H = this.canvasHeight || CANVAS_H;
    const px = (x, y, w, h, color) => {
      ctx.setFillStyle(color);
      ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    };

    const skyH = H * 0.4;
    for (let i = 0; i < skyH; i += 4) {
      const r = 135 + (255 - 135) * (i / skyH) * 0.1;
      const g = 206 + (200 - 206) * (i / skyH) * 0.1;
      const b = 235 - (235 - 180) * (i / skyH) * 0.3;
      px(0, i, W, 4, `rgb(${r | 0},${g | 0},${b | 0})`);
    }

    ctx.setFillStyle('#3d5a73');
    ctx.beginPath();
    ctx.moveTo(0, skyH);
    for (let x = 0; x <= W; x += 20) {
      const h = 30 + Math.sin(x * 0.02) * 15 + Math.sin(x * 0.05) * 8;
      ctx.lineTo(x, skyH - h);
    }
    ctx.lineTo(W, skyH);
    ctx.fill();

    px(0, skyH, W, H - skyH, '#1e6091');
    for (let y = skyH; y < H; y += 6) {
      const wave = Math.sin(t * 2 + y * 0.1) * 2;
      const shade = 30 + ((y - skyH) / (H - skyH)) * 60;
      px(0, y + wave, W, 2, `rgb(${(20 + shade * 0.3) | 0},${(60 + shade * 0.5) | 0},${(120 + shade * 0.4) | 0})`);
    }
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 47 + t * 30) % W;
      const y = skyH + ((i * 31) % (H - skyH));
      px(x, y, 3, 1, 'rgba(255,255,255,0.5)');
    }

    px(W - 80, 40, 24, 24, '#ffeb3b');
    px(W - 84, 48, 32, 8, '#ffeb3b');
    px(W - 80, 36, 24, 4, '#ffeb3b');

    const rodSkin = this.user
      ? GAME_DATA.getCurrentRodSkin(this.user.dex, this.user.rodSkin, this.user.ownedRods)
      : GAME_DATA.ROD_SKINS[0];
    const rodTipX = W * 0.45 + Math.sin(t * 1.5) * 4;
    const rodTipY = H * 0.35;
    const rodBaseX = W * 0.95;
    const rodBaseY = H + 10;

    if (rodSkin.fx === 'night') {
      ctx.setStrokeStyle('#8b5cf6');
      ctx.setLineWidth(8);
      ctx.beginPath();
      ctx.moveTo(rodBaseX, rodBaseY);
      ctx.lineTo(rodTipX, rodTipY);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const frac = (i + t * 0.5) % 1;
        const x = rodBaseX + (rodTipX - rodBaseX) * frac;
        const y = rodBaseY + (rodTipY - rodBaseY) * frac + Math.sin(t * 4 + i * 2) * 4;
        px(x - 2, y - 2, 4, 4, 'rgba(139,92,246,0.65)');
      }
    }

    ctx.setStrokeStyle(rodSkin.rodColor);
    ctx.setLineWidth(6);
    ctx.beginPath();
    ctx.moveTo(rodBaseX, rodBaseY);
    ctx.lineTo(rodTipX, rodTipY);
    ctx.stroke();
    ctx.setStrokeStyle(rodSkin.rodHighlight);
    ctx.setLineWidth(2);
    ctx.beginPath();
    ctx.moveTo(rodBaseX, rodBaseY);
    ctx.lineTo(rodTipX, rodTipY);
    ctx.stroke();
    this.drawAccessoryRodParticles(ctx, rodBaseX, rodBaseY, rodTipX, rodTipY, t, px);

    if (this.state.phase !== 'idle' || this.state.hookY > rodTipY + 10) {
      ctx.setStrokeStyle(rodSkin.lineColor);
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      const midX = (rodTipX + this.state.hookX) / 2;
      const midY = (rodTipY + this.state.hookY) / 2 + 10 + Math.sin(t * 3) * 2;
      ctx.quadraticCurveTo(midX, midY, this.state.hookX, this.state.hookY);
      ctx.stroke();
      const bobX = this.state.hookX;
      const bobY = this.state.hookY + Math.sin(t * 4) * (this.state.phase === 'hooked' ? 5 : 1);
      px(bobX - 4, bobY - 8, 8, 8, '#ff5722');
      px(bobX - 2, bobY - 8, 4, 4, '#fff');
      px(bobX - 1, bobY, 2, 6, '#3e2723');
    }

    px(W * 0.78, H - 30, 30, 30, '#fdbcb4');
    px(W * 0.78, H - 30, 30, 6, '#d99086');
    px(W * 0.85, H - 24, 18, 18, '#fdbcb4');
    this.drawPet(ctx, t, px);

    if (this.state.phase === 'waiting') {
      this.drawCanvasText(ctx, '等待鱼上钩...', W / 2, H - 24, '#fff', 12);
    } else if (this.state.phase === 'hooked') {
      this.drawCanvasText(ctx, '!!! 鱼上钩了 !!!', W / 2, H - 24, '#ff5722', 16);
    }

    ctx.draw();
  },

  drawAccessoryRodParticles(ctx, rodBaseX, rodBaseY, rodTipX, rodTipY, t, px) {
    const accessory = this.getEquippedAccessory();
    const def = accessory && GAME_DATA.getAccessoryDef(accessory.type);
    if (!def) return;
    const star = GAME_DATA.clampAccessoryStar(accessory.star);
    const count = Math.min(18, 5 + Math.floor(star / 2));
    for (let i = 0; i < count; i += 1) {
      const frac = (i / count + t * (0.22 + star * 0.004)) % 1;
      const wave = Math.sin(t * 4 + i * 1.7) * (3 + star * 0.12);
      const x = rodBaseX + (rodTipX - rodBaseX) * frac + wave;
      const y = rodBaseY + (rodTipY - rodBaseY) * frac + Math.cos(t * 3 + i) * 3;
      if (def.particle === 'tide') {
        px(x - 3, y - 1, 6, 2, 'rgba(78,201,176,0.6)');
        px(x - 1, y - 3, 2, 6, 'rgba(102,230,255,0.5)');
      } else if (def.particle === 'star') {
        px(x - 1, y - 5, 2, 10, 'rgba(255,215,0,0.65)');
        px(x - 5, y - 1, 10, 2, 'rgba(255,215,0,0.65)');
      } else {
        px(x - 2, y - 2, 4, 4, 'rgba(102,230,255,0.65)');
        px(x + 2, y, 2, 2, 'rgba(255,255,255,0.55)');
      }
    }
  },

  drawPet(ctx, t, px) {
    if (!this.user || !this.user.activePet) return;
    const pet = GAME_DATA.PETS.find((p) => p.id === this.user.activePet);
    if (!pet) return;
    const bx = pet.canvasX * (this.canvasWidth || CANVAS_W);
    const by = pet.canvasY * (this.canvasHeight || CANVAS_H) + Math.sin(t * 2) * 2;
    const s = 4;
    const c = pet.colors;
    const legSwing = Math.sin(t * 4) * 2;
    if (c.ear) {
      px(bx - s * 2, by - s * 7, s, s * 2, c.ear);
      px(bx + s * 2, by - s * 7, s, s * 2, c.ear);
    }
    px(bx - s * 2, by - s * 5, s * 5, s * 4, c.body);
    px(bx - s, by - s * 4, s, s, c.eye || '#111');
    px(bx + s, by - s * 4, s, s, c.eye || '#111');
    px(bx, by - s * 2.5, s, Math.ceil(s * 0.5), c.nose || '#333');
    px(bx - s * 1.5, by - s, s * 4, s * 4, c.body);
    if (c.belly) px(bx - s * 0.5, by, s * 2, s * 2, c.belly);
    const armSwing = Math.sin(t * 3) * 1.5;
    px(bx - s * 3, by - s * 0.5 + armSwing, s, s * 3, c.limb || c.body);
    px(bx + s * 2.5, by - s * 0.5 - armSwing, s, s * 3, c.limb || c.body);
    px(bx - s, by + s * 3 + legSwing, s, s * 2, c.limb || c.body);
    px(bx + s, by + s * 3 - legSwing, s, s * 2, c.limb || c.body);
    if (c.tail) {
      const tailY = Math.sin(t * 5) * 2;
      px(bx + s * 2.5, by + s, s * 2, s, c.tail);
      px(bx + s * 3.5, by + s * 0.5 + tailY, s, s, c.tail);
    }
    if (typeof c.extra === 'function') c.extra(ctx, bx, by, s, t);
  },

  drawCanvasText(ctx, txt, x, y, color, size) {
    ctx.setFillStyle('rgba(0,0,0,0.6)');
    ctx.fillRect(x - 100, y - size, 200, size + 4);
    ctx.setFillStyle(color);
    ctx.setFontSize(size);
    ctx.setTextAlign('center');
    ctx.fillText(txt, x, y);
  },

  startCastTap() {
    this.noteVipAutoManualActivity();
    this.startCast();
  },

  mobileAction() {
    this.noteVipAutoManualActivity();
    if (this.state.phase === 'idle') this.startCast();
    else if (this.state.phase === 'hooked') this.startHitbar();
    else if (this.state.phase === 'reeling') this.hitbarTap();
  },

  onCanvasTap() {
    this.noteVipAutoManualActivity();
    if (this.state.phase === 'hooked') this.startHitbar();
  },

  startCast(preferredBaitId = null, options = {}) {
    if (!this.user || this.state.phase !== 'idle') return false;
    const baitId = BAITS[preferredBaitId] ? preferredBaitId : (this.user.currentBait || 'worm');
    if (!this.user.baits[baitId] || this.user.baits[baitId] <= 0) {
      if (!options.silent) showToast('没有鱼饵了，去商店买点吧');
      return false;
    }
    this.user.currentBait = baitId;
    this.state.castBait = baitId;
    this.user.baits[baitId] -= 1;
    this.state.phase = 'waiting';
    const W = this.canvasWidth || CANVAS_W;
    const H = this.canvasHeight || CANVAS_H;
    this.state.hookX = W / 2 + (Math.random() - 0.5) * 60;
    this.state.hookY = H * 0.55 + Math.random() * 18;
    this.setData({ status: '已抛竿，等待鱼上钩...' });
    this.refreshUI();
    this.saveUser();

    const wait = 2000 + Math.random() * 5000;
    if (this.waitTimer) clearTimeout(this.waitTimer);
    this.waitTimer = setTimeout(() => {
      this.state.phase = 'hooked';
      this.setData({ status: '鱼上钩了！点击响应', ...this.getMobileButtonData() });
      this.waitTimer = setTimeout(() => {
        this.state.phase = 'idle';
        this.state.castBait = null;
        this.setData({ status: '反应太慢，鱼跑了' });
        this.refreshUI();
      }, 3000);
    }, wait);
    return true;
  },

  startHitbar() {
    if (this.state.phase !== 'hooked') return;
    if (this.waitTimer) clearTimeout(this.waitTimer);
    this.state.phase = 'reeling';
    const currentRodId = GAME_DATA.getCurrentRodSkin(this.user.dex, this.user.rodSkin, this.user.ownedRods).id;
    const accessoryEffects = this.getEquippedAccessoryEffects();
    const result = GAME_DATA.rollCatch(this.state.castBait || this.user.currentBait, currentRodId, accessoryEffects, this.user.ownedCharacters);
    const rarity = result.kind === 'fish' ? result.item.rarity : result.kind;
    this.hb.catch = result;
    this.hb.hitsNeeded = HITS_BY_RARITY[rarity] || 2;
    this.hb.hits = 0;
    this.hb.cursorPos = 0;
    this.hb.cursorDir = 1;
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
    this.hb.cursorSpeed = difficulty.speed;
    const rodSkin = GAME_DATA.getCurrentRodSkin(this.user.dex, this.user.rodSkin, this.user.ownedRods);
    if (rodSkin.speedBonus && rodSkin.speedBonus[difficultyRarity]) {
      this.hb.cursorSpeed *= 1 + rodSkin.speedBonus[difficultyRarity];
    }
    if (accessoryEffects.speedSlow) {
      this.hb.cursorSpeed *= Math.max(0.35, 1 - accessoryEffects.speedSlow);
    }
    this.hb.zoneWidth = difficulty.zone;
    this.hb.timeLeft = 12;
    this.hb.active = true;
    this.randomizeZone();
    this.setData({
      hitbarVisible: true,
      hitbar: {
        message: result.kind === 'character_shard'
          ? `角色碎片上钩了！连续命中红区 ${this.hb.hitsNeeded} 次！`
          : `${RARITY_NAME[rarity]}级鱼上钩了！连续命中红区 ${this.hb.hitsNeeded} 次！`,
        color: RARITY_COLOR[rarity],
        hits: 0,
        hitsNeeded: this.hb.hitsNeeded,
        timeLeft: '12.0',
        zoneLeft: this.hb.zoneStart * 100,
        zoneWidth: this.hb.zoneWidth * 100,
        cursorLeft: 0,
      },
      ...this.getMobileButtonData(),
    });
    if (this.hitbarTimer) clearInterval(this.hitbarTimer);
    if (this.hitbarLoop) clearTimeout(this.hitbarLoop);
    this.hitbarTimer = setInterval(() => this.tickHitbarTimer(), 100);
    this.hitbarFrame();
  },

  randomizeZone() {
    this.hb.zoneStart = Math.random() * (1 - this.hb.zoneWidth);
  },

  tickHitbarTimer() {
    if (!this.hb.active) return;
    this.hb.timeLeft -= 0.1;
    this.setData({ 'hitbar.timeLeft': this.hb.timeLeft.toFixed(1) });
    if (this.hb.timeLeft <= 0) this.endHitbar(false, '时间到，鱼跑了');
  },

  hitbarFrame() {
    if (!this.hb.active) return;
    this.hb.cursorPos += this.hb.cursorDir * this.hb.cursorSpeed * 0.012;
    if (this.hb.cursorPos >= 1) {
      this.hb.cursorPos = 1;
      this.hb.cursorDir = -1;
    }
    if (this.hb.cursorPos <= 0) {
      this.hb.cursorPos = 0;
      this.hb.cursorDir = 1;
    }
    this.setData({
      'hitbar.cursorLeft': this.hb.cursorPos * 100,
      'hitbar.zoneLeft': this.hb.zoneStart * 100,
      'hitbar.zoneWidth': this.hb.zoneWidth * 100,
    });
    this.hitbarLoop = setTimeout(() => this.hitbarFrame(), 16);
  },

  hitbarTap() {
    this.noteVipAutoManualActivity();
    this.hitbarClick();
  },

  hitbarClick() {
    if (!this.hb.active) return;
    const inZone = this.hb.cursorPos >= this.hb.zoneStart && this.hb.cursorPos <= this.hb.zoneStart + this.hb.zoneWidth;
    if (inZone) {
      this.hb.hits += 1;
      if (this.hb.hits >= this.hb.hitsNeeded) {
        this.endHitbar(true);
        return;
      }
      this.randomizeZone();
      this.hb.cursorSpeed *= 1.05;
      this.setData({
        'hitbar.hits': this.hb.hits,
        'hitbar.zoneLeft': this.hb.zoneStart * 100,
      });
    } else {
      this.hb.hits = 0;
      this.randomizeZone();
      this.setData({
        'hitbar.hits': 0,
        'hitbar.message': '没中！计数清零，再试',
        'hitbar.zoneLeft': this.hb.zoneStart * 100,
      });
    }
  },

  vipAutoHitbarClick() {
    if (!this.hb.active) return;
    this.hb.cursorPos = Math.random();
    this.hitbarClick();
  },

  endHitbar(success, failMsg) {
    this.hb.active = false;
    if (this.hitbarTimer) clearInterval(this.hitbarTimer);
    if (this.hitbarLoop) clearTimeout(this.hitbarLoop);
    this.setData({ hitbarVisible: false });
    this.state.phase = 'idle';
    this.state.castBait = null;
    if (success) {
      this.applyCatch(this.hb.catch);
      this.showResult(this.hb.catch);
    } else {
      this.showMiss(failMsg || '操作失败，鱼跑了');
    }
    this.hb.catch = null;
    this.refreshUI();
  },

  getPetBonus() {
    if (!this.user || !this.user.activePet) return { coins: 0, diamonds: 0 };
    const bonus = PET_BONUS[this.user.activePet];
    return bonus ? { coins: bonus.coins || 0, diamonds: bonus.diamonds || 0 } : { coins: 0, diamonds: 0 };
  },

  applyCatch(c) {
    const isCharacterShardCatch = c.kind === 'character_shard';
    const bonusDiamonds = isCharacterShardCatch ? 0 : this.rollDiamondReward();
    const saleDiamonds = c.diamondValue || 0;
    const baitDrops = isCharacterShardCatch ? [] : this.rollBonusBaitDrops();
    const petBonus = isCharacterShardCatch ? { coins: 0, diamonds: 0 } : this.getPetBonus();
    const shardUnlock = this.applyCharacterShardCatch(c);
    c.petBonusCoins = petBonus.coins;
    c.petBonusDiamonds = petBonus.diamonds;
    c.value += petBonus.coins;
    this.user.money += c.value;
    this.user.diamonds = (this.user.diamonds || 0) + saleDiamonds + bonusDiamonds + petBonus.diamonds;
    baitDrops.forEach((drop) => {
      this.user.baits[drop.id] = (this.user.baits[drop.id] || 0) + drop.count;
    });
    this.user.stats.totalCatches = (this.user.stats.totalCatches || 0) + 1;
    this.user.stats.totalEarned = (this.user.stats.totalEarned || 0) + c.value;
    this.user.stats.totalDiamonds = (this.user.stats.totalDiamonds || 0) + saleDiamonds + bonusDiamonds + petBonus.diamonds;
    this.user.stats.totalWeight = +(((this.user.stats.totalWeight || 0) + (c.weight || 0)).toFixed(2));
    const todayKey = todayCN();
    if (!this.user.dailyStats || this.user.dailyStats.date !== todayKey) {
      this.user.dailyStats = { date: todayKey, catches: 0, weight: 0 };
    }
    this.user.dailyStats.catches += 1;
    this.user.dailyStats.weight = +((this.user.dailyStats.weight + (c.weight || 0)).toFixed(2));
    if (c.kind === 'fish') {
      const id = c.item.id;
      if (!this.user.dex[id]) this.user.dex[id] = { count: 0, maxWeight: 0 };
      this.user.dex[id].count += 1;
      if (c.weight > this.user.dex[id].maxWeight) this.user.dex[id].maxWeight = c.weight;
    }
    const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
    this.user.history.push({
      t: Date.now(),
      kind: c.kind,
      name: c.item.name,
      rarity,
      weight: c.weight,
      value: c.value,
      diamondValue: saleDiamonds,
      diamonds: bonusDiamonds,
      baitDrops,
      characterId: c.characterId || null,
      shardCount: c.shardCount || 0,
    });
    if (this.user.history.length > 50) this.user.history.shift();
    const unlockedBlackSilkRod = this.unlockBlackSilkRodIfComplete();
    c.diamonds = bonusDiamonds;
    c.baitDrops = baitDrops;
    c.unlockedCharacter = shardUnlock;
    c.unlockedRod = unlockedBlackSilkRod ? BLACK_SILK_ROD_ID : null;
    this.saveUser();
  },

  rollDiamondReward() {
    if (Math.random() < DIAMOND_JACKPOT_CHANCE) return 100;
    return 1 + Math.floor(Math.random() * 3);
  },

  rollBonusBaitDrops() {
    const drops = [];
    if (Math.random() < DIVINE_BAIT_DROP_CHANCE) drops.push({ id: DIVINE_BAIT_ID, count: 1 });
    if (Math.random() < JB_BAIT_DROP_CHANCE) drops.push({ id: JB_BAIT_ID, count: 1 });
    return drops;
  },

  applyCharacterShardCatch(c) {
    if (c.kind !== 'character_shard' || !c.characterId) return null;
    this.normalizeCharacters();
    this.normalizeCharacterFragments();
    const target = this.getCharacterShardTarget(c.characterId);
    const character = GAME_DATA.CHARACTERS.find((ch) => ch.id === c.characterId);
    if (!target || !character) return null;
    if (!this.user.ownedCharacters.includes(c.characterId)) {
      this.user.characterFragments[c.characterId] = (this.user.characterFragments[c.characterId] || 0) + (c.shardCount || 1);
    }
    c.character = character;
    c.shardName = target.name;
    c.shardProgress = this.user.characterFragments[c.characterId] || 0;
    c.shardsRequired = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
    if (!this.user.ownedCharacters.includes(c.characterId) && c.shardProgress >= c.shardsRequired) {
      this.user.characterFragments[c.characterId] -= c.shardsRequired;
      this.user.ownedCharacters.push(c.characterId);
      this.user.activeCharacter = c.characterId;
      c.shardProgress = this.user.characterFragments[c.characterId] || 0;
      return c.characterId;
    }
    return null;
  },

  getCharacterShardTarget(characterId) {
    return GAME_DATA.CHARACTER_SHARD_TARGETS.find((t) => t.characterId === characterId) || null;
  },

  getCharacterShardCount(characterId) {
    this.normalizeCharacterFragments();
    return this.user.characterFragments[characterId] || 0;
  },

  isBaitDexComplete(baitId) {
    const bait = BAITS[baitId];
    return !!bait && bait.fishes.every((f) => this.user.dex[f.id] && this.user.dex[f.id].count > 0);
  },

  unlockBlackSilkRodIfComplete() {
    if (!this.user || !this.isBaitDexComplete(BLACK_SILK_BAIT_ID)) return false;
    if (this.user.ownedRods.includes(BLACK_SILK_ROD_ID)) return false;
    this.user.ownedRods.push(BLACK_SILK_ROD_ID);
    return true;
  },

  showResult(c) {
    const rarity = c.kind === 'fish' ? c.item.rarity : c.kind;
    const lines = [];
    const rewards = [];
    const character = c.character || (c.characterId ? GAME_DATA.CHARACTERS.find((ch) => ch.id === c.characterId) : null);
    if (c.kind === 'fish') {
      lines.push(`重量：${c.weight} kg`);
      lines.push(c.diamondValue ? `售价：${c.diamondValue} 钻石` : `单价：${c.item.price} 金/kg`);
    } else if (c.kind === 'character_shard') {
      const required = c.shardsRequired || GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
      const progress = c.unlockedCharacter ? required : (c.shardProgress || 0);
      lines.push(`${character ? character.name : c.item.name} 碎片：${progress} / ${required}`);
    }
    if (c.value) rewards.push(`+${c.value} 金币`);
    if (c.diamondValue) rewards.push(`+${c.diamondValue} 钻石`);
    if (c.diamonds) rewards.push(`额外 +${c.diamonds} 钻石`);
    (c.baitDrops || []).forEach((drop) => rewards.push(`获得 ${BAITS[drop.id].name} x${drop.count}`));
    if (c.unlockedRod) rewards.push('解锁黑丝鱼竿');
    if (c.unlockedCharacter && character) rewards.push(`解锁角色 ${character.name}`);
    if (c.petBonusCoins) rewards.push(`宠物加成 +${c.petBonusCoins} 金币`);
    if (c.petBonusDiamonds) rewards.push(`宠物加成 +${c.petBonusDiamonds} 钻石`);
    this.setData({
      modal: 'result',
      modalWide: false,
      result: {
        isMiss: false,
        icon: c.item.icon || '🐟',
        name: c.item.name,
        rarityName: RARITY_NAME[rarity],
        color: RARITY_COLOR[rarity],
        lines,
        rewards,
        canRetry: false,
      },
      status: `钓到了 ${c.item.name}！${rewards.join('，')}`,
    });
  },

  showMiss(msg) {
    this.setData({
      modal: 'result',
      modalWide: false,
      result: {
        isMiss: true,
        icon: '💧',
        name: msg,
        color: '#9ca3af',
        lines: [],
        rewards: [],
        canRetry: !this.isAdOnCooldown(),
      },
      status: msg,
    });
  },

  isAdOnCooldown() {
    return Date.now() - this.adLastWatchTime < AD_COOLDOWN_MS;
  },

  getAdCooldownRemain() {
    return Math.max(0, Math.ceil((AD_COOLDOWN_MS - (Date.now() - this.adLastWatchTime)) / 1000));
  },

  claimAdReward() {
    if (this.isAdOnCooldown()) {
      showToast(`冷却中，请${this.getAdCooldownRemain()}秒后再试`);
      this.renderShop();
      return;
    }
    this.adLastWatchTime = Date.now();
    this.user.diamonds += AD_REWARD_DIAMONDS;
    this.user.stats.totalDiamonds = (this.user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
    this.saveUser();
    this.refreshUI();
    showToast(`获得 ${AD_REWARD_DIAMONDS} 钻石`);
  },

  retryAfterReward() {
    if (this.isAdOnCooldown()) {
      showToast(`冷却中，请${this.getAdCooldownRemain()}秒后再试`);
      return;
    }
    this.adLastWatchTime = Date.now();
    this.user.diamonds += AD_REWARD_DIAMONDS;
    this.user.stats.totalDiamonds = (this.user.stats.totalDiamonds || 0) + AD_REWARD_DIAMONDS;
    this.saveUser();
    this.refreshUI();
    this.closeModal();
    this.startCast();
  },

  renderShop() {
    const shopItems = Object.entries(BAITS)
      .filter(([, bait]) => bait.purchasable !== false)
      .map(([id, bait]) => ({
        id,
        name: bait.name,
        desc: bait.desc,
        color: bait.color,
        owned: this.user.baits[id] || 0,
        priceText: `${bait.currency === 'diamonds' ? '钻石' : '金币'} ${bait.price}`,
      }));
    this.setData({
      shopItems,
      adRewardDisabled: this.isAdOnCooldown(),
      adRewardText: this.isAdOnCooldown() ? `冷却 ${this.getAdCooldownRemain()}s` : '免费领取',
    });
  },

  buyBait(e) {
    const id = e.currentTarget.dataset.id;
    const n = parseInt(e.currentTarget.dataset.n, 10);
    const bait = BAITS[id];
    if (!bait) return;
    const cost = bait.price * n;
    if (bait.currency === 'diamonds') {
      if ((this.user.diamonds || 0) < cost) {
        showToast('钻石不足');
        return;
      }
      this.user.diamonds -= cost;
    } else {
      if (this.user.money < cost) {
        showToast('金币不足');
        return;
      }
      this.user.money -= cost;
    }
    this.user.baits[id] = (this.user.baits[id] || 0) + n;
    this.saveUser();
    this.refreshUI();
    this.renderShop();
    this.maybeResumeVipAutoAfterInventoryChange();
  },

  renderDex() {
    const dexTabs = Object.entries(BAITS)
      .filter(([, bait]) => !bait.hideDex)
      .map(([id, bait]) => ({ id, label: bait.dexName || bait.name, active: id === this.activeDexBait }));
    dexTabs.push({ id: '_rod_exclusive', label: '鱼竿专属', active: this.activeDexBait === '_rod_exclusive' });
    const dexItems = [];
    let unlocked = 0;
    let total = 0;
    if (this.activeDexBait === '_rod_exclusive') {
      total = GAME_DATA.ALL_ROD_FISH.length;
      GAME_DATA.ALL_ROD_FISH.forEach((fish) => {
        const dex = this.user.dex[fish.id];
        const isUnlocked = !!dex;
        if (isUnlocked) unlocked += 1;
        const rod = GAME_DATA.ALL_RODS.find((r) => r.id === fish.rodId);
        dexItems.push({
          id: fish.id,
          icon: isUnlocked ? fish.icon : '❓',
          name: isUnlocked ? fish.name : '???',
          color: RARITY_COLOR.rod_exclusive,
          rarityName: RARITY_NAME.rod_exclusive,
          unlocked: isUnlocked,
          infoLines: [`鱼竿 ${rod ? rod.name : fish.rodId}`, isUnlocked ? `x${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁'],
        });
      });
    } else {
      const bait = BAITS[this.activeDexBait] || BAITS.worm;
      total = bait.fishes.length;
      bait.fishes.forEach((fish) => {
        const dex = this.user.dex[fish.id];
        const isUnlocked = !!dex;
        if (isUnlocked) unlocked += 1;
        const infoLines = [];
        if (fish.timeSlot) infoLines.push(GAME_DATA.TIME_SLOT_NAMES[fish.timeSlot]);
        infoLines.push(isUnlocked ? `x${dex.count} | 最大 ${dex.maxWeight}kg` : '未解锁');
        dexItems.push({
          id: fish.id,
          icon: isUnlocked ? fish.icon : '❓',
          name: isUnlocked ? fish.name : '???',
          color: RARITY_COLOR[fish.rarity],
          rarityName: RARITY_NAME[fish.rarity],
          unlocked: isUnlocked,
          infoLines,
        });
      });
    }
    const title = this.activeDexBait === '_rod_exclusive'
      ? '鱼竿专属图鉴'
      : (BAITS[this.activeDexBait].dexName || '当前鱼饵图鉴');
    this.setData({
      dexTabs,
      dexItems,
      dexStats: [
        `${title}：${unlocked} / ${total}`,
        `累计钓获：${this.user.stats.totalCatches || 0} 次`,
        `累计收入：${this.user.stats.totalEarned || 0} 金币`,
        `累计钻石：${this.user.stats.totalDiamonds || 0} 钻石`,
      ],
    });
  },

  selectDexTab(e) {
    this.activeDexBait = e.currentTarget.dataset.id;
    this.renderDex();
  },

  countUnlockedBaitDex(baitId) {
    const bait = BAITS[baitId];
    if (!bait) return 0;
    return bait.fishes.filter((f) => this.user.dex[f.id] && this.user.dex[f.id].count > 0).length;
  },

  renderRodSkins() {
    const dexCount = Object.keys(this.user.dex || {}).length;
    const current = GAME_DATA.getCurrentRodSkin(this.user.dex, this.user.rodSkin, this.user.ownedRods);
    const owned = this.user.ownedRods || [];
    const rodItems = GAME_DATA.ALL_RODS.map((skin) => {
      const isGacha = GAME_DATA.GACHA_RODS.some((g) => g.id === skin.id);
      const isSpecial = (GAME_DATA.SPECIAL_RODS || []).some((s) => s.id === skin.id);
      const unlocked = (isGacha || isSpecial) ? owned.includes(skin.id) : dexCount >= skin.threshold;
      let reqText;
      if (unlocked) reqText = skin.id === current.id ? '装备中' : '点击装备';
      else if (isGacha) reqText = '抽奖限定';
      else if (skin.unlock === 'black_silk_dex') reqText = `集齐黑丝图鉴解锁 (${this.countUnlockedBaitDex(BLACK_SILK_BAIT_ID)}/${BAITS[BLACK_SILK_BAIT_ID].fishes.length})`;
      else reqText = `收集 ${skin.threshold} 种鱼解锁 (${dexCount}/${skin.threshold})`;
      return {
        ...skin,
        unlocked,
        active: skin.id === current.id,
        reqText,
      };
    });
    this.setData({ rodItems });
  },

  equipRod(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.rodItems.find((r) => r.id === id);
    if (!item || !item.unlocked || item.active) return;
    this.user.rodSkin = id;
    this.saveUser();
    this.refreshUI();
    this.renderRodSkins();
  },

  renderCharacters() {
    this.normalizeCharacters();
    this.normalizeCharacterFragments();
    const owned = this.user.ownedCharacters || [];
    const required = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
    const characterItems = GAME_DATA.CHARACTERS.map((character) => {
      const isOwned = owned.includes(character.id);
      const shardTarget = this.getCharacterShardTarget(character.id);
      const shardCount = shardTarget ? this.getCharacterShardCount(character.id) : 0;
      const canSynthesize = !!shardTarget && !isOwned && shardCount >= required;
      let obtainLine;
      if (isOwned) obtainLine = this.user.activeCharacter === character.id ? '已装备' : '点击装备';
      else if (shardTarget) obtainLine = `碎片 ${shardCount} / ${required}`;
      else obtainLine = `锁定：${character.obtain || '暂未开放'}`;
      return {
        id: character.id,
        name: character.name,
        title: character.title,
        bio: character.bio,
        owned: isOwned,
        active: this.user.activeCharacter === character.id,
        canSynthesize,
        obtainLine,
        spriteImage: character.spriteImage ? `/${character.spriteImage}` : '',
        coat: character.colors && character.colors.coat,
        trim: character.colors && character.colors.trim,
      };
    });
    this.setData({ characterItems });
  },

  equipCharacter(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.user.ownedCharacters.includes(id)) return;
    this.user.activeCharacter = id;
    this.saveUser();
    this.refreshUI();
    this.renderCharacters();
  },

  synthesizeCharacter(e) {
    const id = e.currentTarget.dataset.id;
    const required = GAME_DATA.CHARACTER_SHARDS_REQUIRED || 10;
    const target = this.getCharacterShardTarget(id);
    const character = GAME_DATA.CHARACTERS.find((c) => c.id === id);
    if (!target || !character || this.user.ownedCharacters.includes(id)) return;
    if ((this.user.characterFragments[id] || 0) < required) return;
    this.user.characterFragments[id] -= required;
    this.user.ownedCharacters.push(id);
    this.user.activeCharacter = id;
    this.saveUser();
    this.refreshUI();
    this.renderCharacters();
    showToast(`已解锁 ${character.name}`);
  },

  renderPets() {
    const owned = this.user.ownedPets || [];
    const petItems = GAME_DATA.PETS.map((pet) => {
      const bonus = PET_BONUS[pet.id];
      const isOwned = owned.includes(pet.id);
      return {
        ...pet,
        owned: isOwned,
        active: this.user.activePet === pet.id,
        ability: bonus ? (bonus.coins ? `钓鱼金币+${bonus.coins}` : `钓鱼钻石+${bonus.diamonds}`) : '',
        badge: isOwned ? (this.user.activePet === pet.id ? '已装备' : '点击装备') : `锁定：${pet.obtain || '活动获取'}`,
      };
    });
    this.setData({ petItems });
  },

  equipPet(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.user.ownedPets.includes(id)) return;
    this.user.activePet = this.user.activePet === id ? null : id;
    this.saveUser();
    this.refreshUI();
    this.renderPets();
  },

  getEquippedAccessory() {
    if (!this.user || !this.user.equippedAccessory) return null;
    return (this.user.accessories || []).find((item) => item.uid === this.user.equippedAccessory) || null;
  },

  getEquippedAccessoryEffects() {
    return GAME_DATA.getAccessoryEffects(this.getEquippedAccessory());
  },

  formatAccessoryEffect(accessory) {
    const effects = GAME_DATA.getAccessoryEffects(accessory);
    const parts = [];
    if (effects.rarityBoost) parts.push(`稀有鱼概率 +${Math.round(effects.rarityBoost * 1000) / 10}%`);
    if (effects.speedSlow) parts.push(`钓鱼条速度 -${Math.round(effects.speedSlow * 1000) / 10}%`);
    return parts.join(' / ') || '无加成';
  },

  findAccessoryUpgradeMaterial(target) {
    return (this.user.accessories || []).find((item) =>
      item.uid !== target.uid &&
      item.type === target.type &&
      GAME_DATA.clampAccessoryStar(item.star) === GAME_DATA.clampAccessoryStar(target.star));
  },

  renderAccessories(message = '') {
    this.normalizeAccessories();
    const equipped = this.getEquippedAccessory();
    let accessorySummary = '未装备首饰';
    if (equipped) {
      const def = GAME_DATA.getAccessoryDef(equipped.type);
      accessorySummary = `装备中：${def.icon} ${def.name} ${equipped.star}星 | ${this.formatAccessoryEffect(equipped)}`;
    }
    const sorted = [...this.user.accessories].sort((a, b) => {
      if (a.uid === this.user.equippedAccessory) return -1;
      if (b.uid === this.user.equippedAccessory) return 1;
      return b.star - a.star || a.type.localeCompare(b.type);
    });
    const accessoryItems = sorted.map((item) => {
      const def = GAME_DATA.getAccessoryDef(item.type);
      const material = this.findAccessoryUpgradeMaterial(item);
      const cost = GAME_DATA.getAccessoryUpgradeCost(item.star);
      const chance = GAME_DATA.getAccessoryUpgradeChance(item.star);
      const lacksMoney = this.user.money < cost;
      return {
        uid: item.uid,
        icon: def.icon,
        name: def.name,
        color: def.color,
        desc: def.desc,
        stars: '★'.repeat(item.star),
        effect: this.formatAccessoryEffect(item),
        active: item.uid === this.user.equippedAccessory,
        upgradeDisabled: !material || item.star >= 20 || lacksMoney,
        upgradeText: item.star >= 20 ? '已满星' : `强化 ${Math.round(chance * 100)}%`,
        materialText: item.star >= 20
          ? '已达到最高星级'
          : `消耗：${cost} 金币 + 同款同星首饰 x1${!material ? '（缺材料）' : (lacksMoney ? '（金币不足）' : '')}`,
      };
    });
    this.setData({
      accessorySummary,
      accessoryStatus: message,
      accessoryStatusClass: message.includes('失败') || message.includes('不足') || message.includes('缺少') ? 'fail' : '',
      accessoryItems,
      accessoryCatalog: GAME_DATA.ACCESSORIES,
    });
  },

  equipAccessory(e) {
    const uid = e.currentTarget.dataset.uid;
    this.user.equippedAccessory = this.user.equippedAccessory === uid ? null : uid;
    this.saveUser();
    this.refreshUI();
    this.renderAccessories(this.user.equippedAccessory ? '已装备首饰' : '已卸下首饰');
  },

  upgradeAccessory(e) {
    const uid = e.currentTarget.dataset.uid;
    this.normalizeAccessories();
    const target = this.user.accessories.find((item) => item.uid === uid);
    if (!target || target.star >= 20) return;
    const material = this.findAccessoryUpgradeMaterial(target);
    if (!material) {
      this.renderAccessories('缺少同款同星首饰');
      return;
    }
    const def = GAME_DATA.getAccessoryDef(target.type);
    const cost = GAME_DATA.getAccessoryUpgradeCost(target.star);
    if (this.user.money < cost) {
      this.renderAccessories(`金币不足，需要 ${cost} 金币`);
      return;
    }
    const success = Math.random() < GAME_DATA.getAccessoryUpgradeChance(target.star);
    this.user.money -= cost;
    if (success) target.star = GAME_DATA.clampAccessoryStar(target.star + 1);
    this.user.accessories = this.user.accessories.filter((item) => item.uid !== material.uid);
    this.saveUser();
    this.refreshUI();
    this.renderAccessories(success
      ? `${def.name} 强化成功，升至 ${target.star} 星`
      : `${def.name} 强化失败，消耗材料`);
  },

  renderRank() {
    const daily = this.user.dailyStats && this.user.dailyStats.date === todayCN()
      ? this.user.dailyStats
      : { catches: 0, weight: 0 };
    this.setData({
      rankItems: [
        { label: '今日钓鱼数', value: `${daily.catches || 0} 次` },
        { label: '今日总重量', value: `${(daily.weight || 0).toFixed(2)} kg` },
        { label: '累计钓鱼数', value: `${this.user.stats.totalCatches || 0} 次` },
        { label: '累计总重量', value: `${(this.user.stats.totalWeight || 0).toFixed(2)} kg` },
        { label: '累计收入', value: `${this.user.stats.totalEarned || 0} 金币` },
        { label: '累计钻石', value: `${this.user.stats.totalDiamonds || 0} 钻石` },
      ],
    });
    API.leaderboard().then((list) => {
      const me = Array.isArray(list) ? list.find((item) => item.username === this.user.username) : null;
      if (!me) return;
      this.setData({
        rankItems: [
          { label: '今日钓鱼数', value: `${me.todayCatches || 0} 次` },
          { label: '今日总重量', value: `${(me.todayWeight || 0).toFixed(2)} kg` },
          { label: '累计钓鱼数', value: `${me.totalCatches || 0} 次` },
          { label: '累计总重量', value: `${(me.totalWeight || 0).toFixed(2)} kg` },
        ],
      });
    }).catch((err) => console.warn('leaderboard remote failed', err));
  },

  setGachaCurrency(e) {
    this.setData({ activeGachaCurrency: e.currentTarget.dataset.currency, gachaResults: [], gachaSummary: '' }, () => this.renderGacha());
  },

  setGachaSeason(e) {
    const season = parseInt(e.currentTarget.dataset.season, 10);
    if (this.data.activeGachaCurrency === 'coins') {
      this.setData({ activeGachaCoinSeason: season, gachaResults: [], gachaSummary: '' }, () => this.renderGacha());
    } else {
      this.setData({ activeGachaDiamondSeason: season, gachaResults: [], gachaSummary: '' }, () => this.renderGacha());
    }
  },

  renderGacha() {
    const currency = this.data.activeGachaCurrency;
    const season = currency === 'coins' ? this.data.activeGachaCoinSeason : this.data.activeGachaDiamondSeason;
    const maxSeason = currency === 'coins' ? 2 : 3;
    const gachaSeasons = Array.from({ length: maxSeason }, (_, i) => ({
      value: i + 1,
      label: `第${i + 1}期`,
      active: season === i + 1,
    }));
    this.setData({
      gachaSeasons,
      gachaPrizes: this.getGachaPrizes(currency, season),
      gachaSingleCost: this.formatGachaCost(this.getGachaCost(1, currency, season), currency),
      gachaTenCost: this.formatGachaCost(this.getGachaCost(10, currency, season), currency),
    });
  },

  getGachaPrizes(currency, season) {
    if (currency === 'coins' && season === 2) {
      return [
        { name: '小猫咪 / 小狗狗', rate: '各0.1%', className: 'ultimate' },
        { name: '鹦鹉 / 企鹅 / 兔子 / 狐狸', rate: '各0.05%', className: 'legendary' },
        { name: '小龙 / 独角兽', rate: '各0.01%', className: 'legendary' },
        { name: '10钻石', rate: '10%', className: 'diamond-prize' },
        { name: '1金币', rate: '89.58%', className: 'coin-prize' },
      ];
    }
    if (currency === 'diamonds' && season === 3) {
      return [
        { name: '鳞光坠', rate: '10%', className: 'rare' },
        { name: '潮汐环', rate: '10%', className: 'rare' },
        { name: '星砂针', rate: '10%', className: 'legendary' },
        { name: '100金币', rate: '70%', className: 'coin-prize' },
      ];
    }
    if (currency === 'diamonds' && season === 2) {
      return [
        { name: '耳机竿', rate: '0.01%', className: 'ultimate' },
        { name: 'Candy竿', rate: '0.99%', className: 'legendary' },
        { name: '10钻石', rate: '10%', className: 'diamond-prize' },
        { name: '1000金币', rate: '90%', className: 'coin-prize' },
      ];
    }
    if (currency === 'diamonds') {
      return [
        { name: '极品火麒麟鱼竿', rate: '1%', className: 'ultimate' },
        { name: '极品绿玄武鱼竿', rate: '1%', className: 'ultimate' },
        { name: '10钻石', rate: '8%', className: 'diamond-prize' },
        { name: '1000金币', rate: '90%', className: 'coin-prize' },
      ];
    }
    return [
      { name: '神秘暗夜竿', rate: '0.1%', className: 'legendary' },
      { name: '熊猫竿', rate: '1%', className: 'rare' },
      { name: '1000金币', rate: '8.9%', className: 'coin-prize' },
      { name: '1金币', rate: '90%', className: 'coin-prize' },
    ];
  },

  getGachaCost(count, currency, season) {
    if (currency === 'diamonds') return count === 1 ? 10 : 90;
    if (season === 2) return count === 1 ? 10000 : 100000;
    return count === 1 ? 1000 : 9000;
  },

  formatGachaCost(cost, currency) {
    return `${currency === 'diamonds' ? '钻石' : '金币'} ${cost}`;
  },

  doGacha(e) {
    const count = parseInt(e.currentTarget.dataset.count, 10);
    const currency = this.data.activeGachaCurrency;
    const season = currency === 'coins' ? this.data.activeGachaCoinSeason : this.data.activeGachaDiamondSeason;
    const cost = this.getGachaCost(count, currency, season);
    if (currency === 'diamonds') {
      if ((this.user.diamonds || 0) < cost) {
        showToast(`钻石不足，需要 ${cost}`);
        return;
      }
      this.user.diamonds -= cost;
    } else {
      if (this.user.money < cost) {
        showToast(`金币不足，需要 ${cost}`);
        return;
      }
      this.user.money -= cost;
    }
    const results = [];
    for (let i = 0; i < count; i += 1) {
      results.push(this.rollGachaOne(currency, season));
    }
    this.saveUser();
    this.refreshUI();
    this.showGachaResult(results);
  },

  rollGachaOne(currency, season) {
    const roll = Math.random() * 100;
    if (currency === 'coins' && season === 2) {
      const petRolls = [
        { threshold: 0.1, id: 'cat' },
        { threshold: 0.2, id: 'dog' },
        { threshold: 0.25, id: 'parrot' },
        { threshold: 0.30, id: 'penguin' },
        { threshold: 0.35, id: 'rabbit' },
        { threshold: 0.40, id: 'fox' },
        { threshold: 0.41, id: 'dragon' },
        { threshold: 0.42, id: 'unicorn' },
      ];
      const matched = petRolls.find((p) => roll < p.threshold);
      if (matched) {
        if (!this.user.ownedPets.includes(matched.id)) this.user.ownedPets.push(matched.id);
        return { type: 'pet', id: matched.id };
      }
      if (roll < 10.42) {
        this.user.diamonds += 10;
        return { type: 'diamonds', diamonds: 10 };
      }
      this.user.money += 1;
      return { type: 'coins', coins: 1 };
    }
    if (currency === 'diamonds' && season === 3) {
      if (roll < 10) {
        const item = createAccessory(GACHA_ACCESSORIES[0]);
        this.user.accessories.push(item);
        return { type: 'accessory', id: item.type, star: item.star };
      }
      if (roll < 20) {
        const item = createAccessory(GACHA_ACCESSORIES[1]);
        this.user.accessories.push(item);
        return { type: 'accessory', id: item.type, star: item.star };
      }
      if (roll < 30) {
        const item = createAccessory(GACHA_ACCESSORIES[2]);
        this.user.accessories.push(item);
        return { type: 'accessory', id: item.type, star: item.star };
      }
      this.user.money += 100;
      return { type: 'coins', coins: 100 };
    }
    if (currency === 'diamonds' && season === 2) {
      if (roll < 0.01) {
        if (!this.user.ownedRods.includes('headphone')) this.user.ownedRods.push('headphone');
        return { type: 'rod', id: 'headphone' };
      }
      if (roll < 1) {
        if (!this.user.ownedRods.includes('candy')) this.user.ownedRods.push('candy');
        return { type: 'rod', id: 'candy' };
      }
      if (roll < 11) {
        this.user.diamonds += 10;
        return { type: 'diamonds', diamonds: 10 };
      }
      this.user.money += 1000;
      return { type: 'coins', coins: 1000 };
    }
    if (currency === 'diamonds') {
      if (roll < 1) {
        if (!this.user.ownedRods.includes('firekirin')) this.user.ownedRods.push('firekirin');
        return { type: 'rod', id: 'firekirin' };
      }
      if (roll < 2) {
        if (!this.user.ownedRods.includes('greenxuanwu')) this.user.ownedRods.push('greenxuanwu');
        return { type: 'rod', id: 'greenxuanwu' };
      }
      if (roll < 10) {
        this.user.diamonds += 10;
        return { type: 'diamonds', diamonds: 10 };
      }
      this.user.money += 1000;
      return { type: 'coins', coins: 1000 };
    }
    if (roll < 10) {
      if (roll < 0.1) {
        if (!this.user.ownedRods.includes('nightmyst')) this.user.ownedRods.push('nightmyst');
        return { type: 'rod', id: 'nightmyst' };
      }
      if (roll < 1.1) {
        if (!this.user.ownedRods.includes('panda')) this.user.ownedRods.push('panda');
        return { type: 'rod', id: 'panda' };
      }
      this.user.money += 1000;
      return { type: 'coins', coins: 1000 };
    }
    this.user.money += 1;
    return { type: 'coins', coins: 1 };
  },

  showGachaResult(results) {
    const view = results.map((r, index) => {
      if (r.type === 'pet') {
        const pet = GAME_DATA.PETS.find((p) => p.id === r.id);
        return { index, icon: pet ? pet.icon : '🐾', name: pet ? pet.name : r.id, className: 'gi-ultimate' };
      }
      if (r.type === 'rod') {
        const rod = GAME_DATA.GACHA_RODS.find((g) => g.id === r.id);
        return { index, icon: (rod && rod.emoji) || '🎣', name: rod ? rod.name : r.id, className: `gi-${(rod && rod.rarity) || 'rare'}` };
      }
      if (r.type === 'accessory') {
        const accessory = GAME_DATA.ACCESSORIES.find((a) => a.id === r.id);
        return { index, icon: accessory ? accessory.icon : '💍', name: `${accessory ? accessory.name : r.id} ${r.star || 1}星`, className: 'gi-accessory' };
      }
      if (r.type === 'diamonds') return { index, icon: '💎', name: `${r.diamonds} 钻石`, className: 'gi-diamond' };
      return { index, icon: r.coins >= 1000 ? '💰' : '🪙', name: `${r.coins} 金币`, className: r.coins >= 1000 ? 'gi-coin' : 'gi-common' };
    });
    const totalCoins = results.filter((r) => r.type === 'coins').reduce((sum, r) => sum + r.coins, 0);
    const totalDiamonds = results.filter((r) => r.type === 'diamonds').reduce((sum, r) => sum + r.diamonds, 0);
    const rareCount = results.filter((r) => r.type === 'rod' || r.type === 'pet' || r.type === 'accessory').length;
    const summary = [
      rareCount ? `获得稀有奖励 ${rareCount} 个` : '',
      totalDiamonds ? `共获得 ${totalDiamonds} 钻石` : '',
      totalCoins ? `共获得 ${totalCoins} 金币` : '',
    ].filter(Boolean).join('，') || '继续试试手气';
    this.setData({ gachaResults: view, gachaSummary: summary });
    this.renderGacha();
  },

  onRedeemInput(e) {
    this.setData({ redeemInput: e.detail.value });
  },

  async redeemCode() {
    const code = String(this.data.redeemInput || '').trim().toUpperCase();
    if (!code) {
      this.setData({ redeemStatus: '请输入兑换码', redeemStatusClass: 'error' });
      return;
    }
    try {
      const data = await API.redeem(this.user.username, code);
      Object.assign(this.user, data.patch || data.user || {});
      this.ensureUserDefaults();
      wx.setStorageSync(SAVE_PREFIX + this.user.username, this.user);
      this.refreshUI();
      const rewardData = data.reward || data;
      const reward = [
        rewardData.coins ? `+${rewardData.coins} 金币` : '',
        rewardData.diamonds ? `+${rewardData.diamonds} 钻石` : '',
      ].filter(Boolean).join(' ');
      this.setData({
        redeemInput: '',
        redeemStatus: `兑换成功！${data.desc || ''} ${reward}`,
        redeemStatusClass: 'success',
      });
      return;
    } catch (err) {
      console.warn('redeem remote failed, fallback to local codes', err);
    }
    const entry = CODES[code];
    if (!entry) {
      this.setData({ redeemStatus: '兑换码不存在', redeemStatusClass: 'error' });
      return;
    }
    const usedCodes = wx.getStorageSync(USED_CODES_KEY) || {};
    const mine = usedCodes[this.user.username] || [];
    if (mine.includes(code)) {
      this.setData({ redeemStatus: '你已经使用过这个兑换码了', redeemStatusClass: 'error' });
      return;
    }
    if (entry.coins) this.user.money += entry.coins;
    if (entry.diamonds) this.user.diamonds += entry.diamonds;
    usedCodes[this.user.username] = [...mine, code];
    wx.setStorageSync(USED_CODES_KEY, usedCodes);
    this.saveUser();
    this.refreshUI();
    const reward = [entry.coins ? `+${entry.coins} 金币` : '', entry.diamonds ? `+${entry.diamonds} 钻石` : ''].filter(Boolean).join(' ');
    this.setData({
      redeemInput: '',
      redeemStatus: `兑换成功！${entry.desc} ${reward}`,
      redeemStatusClass: 'success',
    });
  },

  canUseVipAuto() {
    return !!this.user && (this.user.vip === true || VIP_AUTO_USERNAMES.includes(this.user.username));
  },

  getSelectedVipAutoBait() {
    const option = this.data.baitOptions[this.data.selectedBaitIndex];
    const baitId = option ? option.id : this.user && this.user.currentBait;
    return BAITS[baitId] ? baitId : null;
  },

  getVipAutoBait() {
    if (!this.user || !this.user.baits) return null;
    const baitId = this.vipAuto.baitId || this.getSelectedVipAutoBait();
    if (!baitId || !BAITS[baitId]) return null;
    return (this.user.baits[baitId] || 0) > 0 ? baitId : null;
  },

  getVipAutoText() {
    if (!this.vipAuto.enabled) return 'VIP自动: 关';
    if (this.vipAuto.running) return 'VIP自动: 中';
    return this.getVipAutoBait() ? 'VIP自动: 待' : 'VIP自动: 缺饵';
  },

  getVipAutoClass() {
    if (!this.vipAuto.enabled) return '';
    if (this.vipAuto.running) return 'is-enabled is-running';
    return 'is-enabled is-paused';
  },

  toggleVipAuto() {
    if (!this.user) return;
    if (!this.canUseVipAuto()) {
      showToast('需要 VIP 才能使用');
      return;
    }
    this.vipAuto.enabled = !this.vipAuto.enabled;
    this.vipAuto.baitId = this.vipAuto.enabled ? this.getSelectedVipAutoBait() : null;
    this.vipAuto.noBaitNotified = false;
    this.stopVipAutoRunning();
    if (this.vipAuto.enabled) {
      this.scheduleVipAutoStart(VIP_AUTO_FIRST_IDLE_MS);
      this.setData({ status: 'VIP自动钓鱼已开启，1秒无操作后启动' });
    } else {
      if (this.vipAuto.idleTimer) clearTimeout(this.vipAuto.idleTimer);
      this.vipAuto.idleTimer = null;
      this.setData({ status: 'VIP自动钓鱼已关闭' });
      this.refreshUI();
    }
  },

  resetVipAutoForUser() {
    if (this.vipAuto.idleTimer) clearTimeout(this.vipAuto.idleTimer);
    if (this.vipAuto.tickTimer) clearInterval(this.vipAuto.tickTimer);
    this.vipAuto = {
      enabled: false,
      running: false,
      idleTimer: null,
      tickTimer: null,
      baitId: null,
      nextDelay: VIP_AUTO_FIRST_IDLE_MS,
      noBaitNotified: false,
    };
  },

  stopVipAutoRunning() {
    this.vipAuto.running = false;
    if (this.vipAuto.tickTimer) clearInterval(this.vipAuto.tickTimer);
    this.vipAuto.tickTimer = null;
    this.refreshUI();
  },

  stopVipAutoDueToNoBait() {
    this.vipAuto.enabled = false;
    this.vipAuto.running = false;
    this.vipAuto.baitId = null;
    if (this.vipAuto.idleTimer) clearTimeout(this.vipAuto.idleTimer);
    if (this.vipAuto.tickTimer) clearInterval(this.vipAuto.tickTimer);
    this.vipAuto.idleTimer = null;
    this.vipAuto.tickTimer = null;
    this.setData({ status: 'VIP自动钓鱼：当前鱼饵不足，已停止' });
    this.refreshUI();
  },

  scheduleVipAutoStart(delayMs = VIP_AUTO_RESUME_IDLE_MS) {
    if (this.vipAuto.idleTimer) clearTimeout(this.vipAuto.idleTimer);
    if (!this.vipAuto.enabled || !this.user || !this.canUseVipAuto()) {
      this.refreshUI();
      return;
    }
    this.vipAuto.nextDelay = delayMs;
    this.vipAuto.idleTimer = setTimeout(() => {
      this.vipAuto.idleTimer = null;
      this.startVipAutoRunning();
    }, delayMs);
    this.refreshUI();
  },

  startVipAutoRunning() {
    if (!this.vipAuto.enabled || !this.user || !this.canUseVipAuto()) {
      this.stopVipAutoRunning();
      return;
    }
    if (this.state.phase === 'idle' && !this.vipAuto.baitId) this.vipAuto.baitId = this.getSelectedVipAutoBait();
    if (this.state.phase === 'idle' && !this.getVipAutoBait()) {
      this.stopVipAutoDueToNoBait();
      return;
    }
    this.vipAuto.running = true;
    if (this.vipAuto.tickTimer) clearInterval(this.vipAuto.tickTimer);
    this.vipAuto.tickTimer = setInterval(() => this.runVipAutoTick(), VIP_AUTO_TICK_MS);
    this.runVipAutoTick();
    this.refreshUI();
  },

  noteVipAutoManualActivity() {
    if (!this.vipAuto.enabled || !this.user || !this.canUseVipAuto()) return;
    this.stopVipAutoRunning();
    this.scheduleVipAutoStart(VIP_AUTO_RESUME_IDLE_MS);
  },

  maybeResumeVipAutoAfterInventoryChange() {
    if (!this.vipAuto.enabled || this.vipAuto.running || !this.getVipAutoBait()) return;
    this.scheduleVipAutoStart(VIP_AUTO_RESUME_IDLE_MS);
  },

  runVipAutoTick() {
    if (!this.vipAuto.enabled || !this.vipAuto.running || !this.user || !this.canUseVipAuto()) {
      this.stopVipAutoRunning();
      return;
    }
    if (this.state.phase === 'idle') {
      if (!this.vipAuto.baitId) this.vipAuto.baitId = this.getSelectedVipAutoBait();
      const baitId = this.getVipAutoBait();
      if (!baitId) {
        this.stopVipAutoDueToNoBait();
        return;
      }
      if (this.data.modal === 'result') this.closeModal();
      this.startCast(baitId, { silent: true });
    } else if (this.state.phase === 'hooked') {
      this.startHitbar();
    } else if (this.state.phase === 'reeling') {
      this.vipAutoHitbarClick();
    }
  },
});
