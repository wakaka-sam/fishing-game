// 稀有度对应的连续命中次数
const HITS_BY_RARITY = {
  trash: 1,
  common: 2,
  rare: 3,
  legendary: 5,
  hidden: 7,
  treasure: 4,
  limited: 4,
  rod_exclusive: 5,
};

// 稀有度颜色
const RARITY_COLOR = {
  trash: '#888',
  common: '#bbb',
  rare: '#4ec9b0',
  legendary: '#c586c0',
  hidden: '#ffd700',
  treasure: '#ff8c42',
  limited: '#ff7ac8',
  rod_exclusive: '#ff4500',
};

const RARITY_NAME = {
  trash: '垃圾',
  common: '普通',
  rare: '稀有',
  legendary: '传说',
  hidden: '隐藏',
  treasure: '宝藏',
  limited: '限定',
  rod_exclusive: '鱼竿专属',
};

const FISH_PIXEL_ICONS = {
  sardine: 'sardine',
  crucian_s: 'crucian-small',
  tadpole: 'tadpole',
  minnow: 'minnow',
  frog: 'frog',
  catfish_s: 'catfish-small',
  eel_s: 'eel-small',
  crucian_k: 'crucian-king',
  dawn_carp: 'dawn-carp',
  dusk_catfish: 'dusk-catfish',
  glow_eel: 'glow-eel',
  koi: 'koi',
  old_turtle: 'old-turtle',
  mud_dragon: 'mud-dragon',
  mackerel: 'mackerel',
  flounder_s: 'flounder-small',
  squid_s: 'squid-small',
  snapper: 'snapper',
  crab: 'crab',
  tuna_s: 'tuna-small',
  octopus: 'octopus',
  lobster: 'lobster',
  dawn_crab: 'dawn-crab',
  sunset_ray: 'sunset-ray',
  moon_jelly: 'moon-jelly',
  sword: 'swordfish',
  manta: 'manta',
  kraken_baby: 'kraken-baby',
  bass: 'bass',
  pike: 'pike',
  salmon: 'salmon',
  trout: 'trout',
  walleye: 'walleye',
  marlin_s: 'marlin-small',
  shark_s: 'shark-small',
  barracuda: 'barracuda',
  dawn_sword: 'dawn-sword',
  dusk_shark: 'dusk-shark',
  abyss_lantern: 'abyss-lantern',
  megalodon_b: 'megalodon-baby',
  whale_s: 'whale-small',
  leviathan_s: 'leviathan-small',
  coelacanth: 'coelacanth',
  angler: 'angler',
  hatchet: 'hatchet',
  gulper: 'gulper',
  oarfish: 'oarfish',
  siren: 'siren',
  sea_ghost: 'sea-ghost',
  crystal: 'crystal',
  dew_fairy: 'dew-fairy',
  solar_ray: 'solar-ray',
  star_horse: 'star-horse',
  phoenix_f: 'phoenix-fish',
  kraken: 'kraken',
  leviathan: 'leviathan',
  candy_fish: 'candy-fish',
  black_silk_fish: 'black-silk-fish',
  water_fish: 'water-fish',
  big_goldfish: 'big-goldfish',
  candy_horse: 'candy-horse',
  candy_dog: 'candy-dog',
  maple_fish: 'maple-fish',
  fire_beast: 'fire-beast',
  jade_turtle: 'jade-turtle',
};

// 鱼饵：每种 5普通 + 3稀有 + 2传说 + 1隐藏
const BAITS = {
  worm: {
    name: '蚯蚓',
    price: 10,
    desc: '入门鱼饵，能钓到些小鱼小虾',
    color: '#8b4513',
    fishes: [
      { id: 'sardine',     name: '沙丁鱼',   rarity: 'common',    minW: 0.05, maxW: 0.3,  price: 30,   icon: '🐟' },
      { id: 'crucian_s',   name: '小鲫鱼',   rarity: 'common',    minW: 0.1,  maxW: 0.6,  price: 25,   icon: '🐟' },
      { id: 'tadpole',     name: '蝌蚪',     rarity: 'common',    minW: 0.01, maxW: 0.05, price: 200,  icon: '🐸' },
      { id: 'minnow',      name: '米诺鱼',   rarity: 'common',    minW: 0.05, maxW: 0.2,  price: 40,   icon: '🐠' },
      { id: 'frog',        name: '青蛙',     rarity: 'common',    minW: 0.1,  maxW: 0.4,  price: 50,   icon: '🐸' },
      { id: 'catfish_s',   name: '小鲶鱼',   rarity: 'rare',      minW: 0.5,  maxW: 2,    price: 60,   icon: '🐡' },
      { id: 'eel_s',       name: '小鳗鱼',   rarity: 'rare',      minW: 0.3,  maxW: 1.2,  price: 100,  icon: '🐍' },
      { id: 'crucian_k',   name: '鲫鱼王',   rarity: 'rare',      minW: 1,    maxW: 3,    price: 80,   icon: '🐟' },
      { id: 'dawn_carp',   name: '晨曦鲤',   rarity: 'rare',      minW: 0.8,  maxW: 2.5,  price: 150,  icon: '🎏', timeSlot: 'morning' },
      { id: 'dusk_catfish', name: '暮光鲶',   rarity: 'rare',      minW: 1,    maxW: 3,    price: 120,  icon: '🐡', timeSlot: 'afternoon' },
      { id: 'glow_eel',    name: '夜光鳗',   rarity: 'rare',      minW: 0.5,  maxW: 1.8,  price: 200,  icon: '🐍', timeSlot: 'night' },
      { id: 'koi',         name: '锦鲤',     rarity: 'legendary', minW: 2,    maxW: 5,    price: 400,  icon: '🎏' },
      { id: 'old_turtle',  name: '千年龟',   rarity: 'legendary', minW: 5,    maxW: 15,   price: 250,  icon: '🐢' },
      { id: 'mud_dragon',  name: '泥龙',     rarity: 'hidden',    minW: 10,   maxW: 30,   price: 800,  icon: '🐉' },
    ],
  },
  shrimp: {
    name: '鲜虾',
    price: 50,
    desc: '海钓鱼饵，能引来肉食鱼',
    color: '#ff7f7f',
    fishes: [
      { id: 'mackerel',    name: '鲭鱼',     rarity: 'common',    minW: 0.5,  maxW: 1.5,  price: 60,   icon: '🐟' },
      { id: 'flounder_s',  name: '小比目鱼', rarity: 'common',    minW: 0.4,  maxW: 1.2,  price: 80,   icon: '🐠' },
      { id: 'squid_s',     name: '小鱿鱼',   rarity: 'common',    minW: 0.3,  maxW: 1,    price: 90,   icon: '🦑' },
      { id: 'snapper',     name: '红鲷',     rarity: 'common',    minW: 0.5,  maxW: 2,    price: 70,   icon: '🐟' },
      { id: 'crab',        name: '螃蟹',     rarity: 'common',    minW: 0.2,  maxW: 1,    price: 120,  icon: '🦀' },
      { id: 'tuna_s',      name: '小金枪鱼', rarity: 'rare',      minW: 2,    maxW: 6,    price: 200,  icon: '🐟' },
      { id: 'octopus',     name: '章鱼',     rarity: 'rare',      minW: 1,    maxW: 4,    price: 250,  icon: '🐙' },
      { id: 'lobster',     name: '龙虾',     rarity: 'rare',      minW: 0.5,  maxW: 2,    price: 400,  icon: '🦞' },
      { id: 'dawn_crab',   name: '朝霞蟹',   rarity: 'rare',      minW: 0.3,  maxW: 1.5,  price: 300,  icon: '🦀', timeSlot: 'morning' },
      { id: 'sunset_ray',  name: '落日鳐',   rarity: 'rare',      minW: 2,    maxW: 8,    price: 280,  icon: '🐠', timeSlot: 'afternoon' },
      { id: 'moon_jelly',  name: '月光水母', rarity: 'rare',      minW: 0.5,  maxW: 3,    price: 350,  icon: '🪼', timeSlot: 'night' },
      { id: 'sword',       name: '剑鱼',     rarity: 'legendary', minW: 10,   maxW: 30,   price: 600,  icon: '🗡️' },
      { id: 'manta',       name: '蝠鲼',     rarity: 'legendary', minW: 15,   maxW: 50,   price: 500,  icon: '🐠' },
      { id: 'kraken_baby', name: '幼海妖',   rarity: 'hidden',    minW: 20,   maxW: 60,   price: 1500, icon: '🦑' },
    ],
  },
  lure: {
    name: '亮片假饵',
    price: 200,
    desc: '吸引深海大鱼',
    color: '#c0c0c0',
    fishes: [
      { id: 'bass',        name: '鲈鱼',     rarity: 'common',    minW: 1,    maxW: 4,    price: 150,  icon: '🐟' },
      { id: 'pike',        name: '梭鱼',     rarity: 'common',    minW: 2,    maxW: 5,    price: 120,  icon: '🐠' },
      { id: 'salmon',      name: '三文鱼',   rarity: 'common',    minW: 2,    maxW: 6,    price: 200,  icon: '🐟' },
      { id: 'trout',       name: '鳟鱼',     rarity: 'common',    minW: 1,    maxW: 3,    price: 180,  icon: '🐟' },
      { id: 'walleye',     name: '梭鲈',     rarity: 'common',    minW: 1.5,  maxW: 4,    price: 220,  icon: '🐠' },
      { id: 'marlin_s',    name: '小马林鱼', rarity: 'rare',      minW: 5,    maxW: 20,   price: 400,  icon: '🗡️' },
      { id: 'shark_s',     name: '小鲨鱼',   rarity: 'rare',      minW: 8,    maxW: 25,   price: 350,  icon: '🦈' },
      { id: 'barracuda',   name: '梭子鱼',   rarity: 'rare',      minW: 3,    maxW: 10,   price: 500,  icon: '🐟' },
      { id: 'dawn_sword',  name: '破晓旗鱼', rarity: 'rare',      minW: 5,    maxW: 15,   price: 450,  icon: '🐟', timeSlot: 'morning' },
      { id: 'dusk_shark',  name: '黄昏鲨',   rarity: 'rare',      minW: 10,   maxW: 30,   price: 400,  icon: '🦈', timeSlot: 'afternoon' },
      { id: 'abyss_lantern', name: '深渊灯笼鱼', rarity: 'rare',  minW: 2,    maxW: 8,    price: 600,  icon: '🏮', timeSlot: 'night' },
      { id: 'megalodon_b', name: '幼巨齿鲨', rarity: 'legendary', minW: 30,   maxW: 80,   price: 800,  icon: '🦈' },
      { id: 'whale_s',     name: '小鲸',     rarity: 'legendary', minW: 50,   maxW: 200,  price: 600,  icon: '🐋' },
      { id: 'leviathan_s', name: '幼海蛇神', rarity: 'hidden',    minW: 80,   maxW: 300,  price: 2000, icon: '🐉' },
    ],
  },
  magic: {
    name: '魔法鱼饵',
    price: 1000,
    desc: '神秘鱼饵，能召唤奇异生物',
    color: '#c586c0',
    fishes: [
      { id: 'coelacanth',  name: '腔棘鱼',   rarity: 'common',    minW: 5,    maxW: 20,   price: 500,  icon: '🐟' },
      { id: 'angler',      name: '深海琵琶', rarity: 'common',    minW: 3,    maxW: 10,   price: 600,  icon: '🐠' },
      { id: 'hatchet',     name: '斧鱼',     rarity: 'common',    minW: 0.5,  maxW: 2,    price: 1200, icon: '🐟' },
      { id: 'gulper',      name: '吞噬鳗',   rarity: 'common',    minW: 2,    maxW: 8,    price: 800,  icon: '🐍' },
      { id: 'oarfish',     name: '皇带鱼',   rarity: 'common',    minW: 10,   maxW: 50,   price: 400,  icon: '🐍' },
      { id: 'siren',       name: '人鱼',     rarity: 'rare',      minW: 40,   maxW: 80,   price: 1500, icon: '🧜' },
      { id: 'sea_ghost',   name: '海妖',     rarity: 'rare',      minW: 20,   maxW: 60,   price: 2000, icon: '👻' },
      { id: 'crystal',     name: '水晶鱼',   rarity: 'rare',      minW: 1,    maxW: 5,    price: 4000, icon: '💎' },
      { id: 'dew_fairy',   name: '仙露鱼',   rarity: 'rare',      minW: 3,    maxW: 12,   price: 3000, icon: '🧚', timeSlot: 'morning' },
      { id: 'solar_ray',   name: '日炎蝶鱼', rarity: 'rare',      minW: 2,    maxW: 8,    price: 3500, icon: '🦋', timeSlot: 'afternoon' },
      { id: 'star_horse',  name: '星辰海马', rarity: 'rare',      minW: 1,    maxW: 6,    price: 5000, icon: '🐴', timeSlot: 'night' },
      { id: 'phoenix_f',   name: '凤凰鱼',   rarity: 'legendary', minW: 5,    maxW: 20,   price: 5000, icon: '🔥' },
      { id: 'kraken',      name: '海妖王',   rarity: 'legendary', minW: 100,  maxW: 500,  price: 1500, icon: '🦑' },
      { id: 'leviathan',   name: '海蛇神',   rarity: 'hidden',    minW: 200,  maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
  divine: {
    name: '神仙鱼饵',
    price: 10000,
    currency: 'diamonds',
    desc: '仙气缭绕的鱼饵，只会钓到传说级和隐藏级的鱼',
    color: '#ffd700',
    specialOnly: true,
    fishes: [
      { id: 'koi',         name: '锦鲤',     rarity: 'legendary', minW: 2,    maxW: 5,    price: 400,  icon: '🎏' },
      { id: 'old_turtle',  name: '千年龟',   rarity: 'legendary', minW: 5,    maxW: 15,   price: 250,  icon: '🐢' },
      { id: 'mud_dragon',  name: '泥龙',     rarity: 'hidden',    minW: 10,   maxW: 30,   price: 800,  icon: '🐉' },
      { id: 'sword',       name: '剑鱼',     rarity: 'legendary', minW: 10,   maxW: 30,   price: 600,  icon: '🗡️' },
      { id: 'manta',       name: '蝠鲼',     rarity: 'legendary', minW: 15,   maxW: 50,   price: 500,  icon: '🐠' },
      { id: 'kraken_baby', name: '幼海妖',   rarity: 'hidden',    minW: 20,   maxW: 60,   price: 1500, icon: '🦑' },
      { id: 'megalodon_b', name: '幼巨齿鲨', rarity: 'legendary', minW: 30,   maxW: 80,   price: 800,  icon: '🦈' },
      { id: 'whale_s',     name: '小鲸',     rarity: 'legendary', minW: 50,   maxW: 200,  price: 600,  icon: '🐋' },
      { id: 'leviathan_s', name: '幼海蛇神', rarity: 'hidden',    minW: 80,   maxW: 300,  price: 2000, icon: '🐉' },
      { id: 'phoenix_f',   name: '凤凰鱼',   rarity: 'legendary', minW: 5,    maxW: 20,   price: 5000, icon: '🔥' },
      { id: 'kraken',      name: '海妖王',   rarity: 'legendary', minW: 100,  maxW: 500,  price: 1500, icon: '🦑' },
      { id: 'leviathan',   name: '海蛇神',   rarity: 'hidden',    minW: 200,  maxW: 1000, price: 8000, icon: '🐉' },
    ],
  },
  black_silk: {
    name: '黑丝饵',
    dexName: '黑丝图鉴',
    price: 0,
    purchasable: false,
    desc: '只能通过钓鱼获得的特殊鱼饵，只会钓到黑丝图鉴限定鱼',
    color: '#ff7ac8',
    specialOnly: true,
    fishes: [
      { id: 'candy_fish',      name: '糖果鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🍬' },
      { id: 'black_silk_fish', name: '黑丝鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🖤' },
      { id: 'water_fish',      name: '水鱼',   rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '💧' },
      { id: 'big_goldfish',    name: '大金鱼', rarity: 'limited', minW: 1, maxW: 1, diamondValue: 100, icon: '🐠' },
    ],
  },
};

// 通用垃圾池（每种鱼饵都可能钓到）
const TRASH_POOL = [
  { id: 'boot',     name: '破靴子',   rarity: 'trash', value: 0,  icon: '👢' },
  { id: 'bottle',   name: '空瓶',     rarity: 'trash', value: 0,  icon: '🍾' },
  { id: 'can',      name: '易拉罐',   rarity: 'trash', value: 0,  icon: '🥫' },
  { id: 'seaweed',  name: '水草',     rarity: 'trash', value: 0,  icon: '🌿' },
  { id: 'tire',     name: '废轮胎',   rarity: 'trash', value: 0,  icon: '⚫' },
];

// 通用宝藏池（极小概率钓到，价值高）
const TREASURE_POOL = [
  { id: 'coin',     name: '金币',     rarity: 'treasure', value: 500,   icon: '🪙' },
  { id: 'ring',     name: '金戒指',   rarity: 'treasure', value: 1500,  icon: '💍' },
  { id: 'gem',      name: '宝石',     rarity: 'treasure', value: 3000,  icon: '💎' },
  { id: 'chest',    name: '宝箱',     rarity: 'treasure', value: 10000, icon: '🏆' },
  { id: 'gold_bar', name: '金条',     rarity: 'treasure', value: 20000, icon: '🟨' },
];

// 抽取概率（基于鱼饵价格做收益平衡，期望约 1.5 × 鱼饵价格）
// trash: 20%, treasure: 2%, fish: 78%
//   fish 内: common 70%, rare 25%, legendary 4.5%, hidden 0.5%
const ROLL = {
  trash: 0.20,
  treasure: 0.02,
  fish: 0.78,
};
const FISH_RARITY_ROLL = {
  common: 0.70,
  rare: 0.255,
  legendary: 0.040,
  hidden: 0.005,
};

function pickFromArr(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const TIME_SLOT_NAMES = { morning: '7:00-14:00', afternoon: '14:00-21:00', night: '21:00-7:00' };

function getCurrentTimeSlot() {
  const h = new Date(Date.now() + 8 * 3600000).getUTCHours();
  if (h >= 7 && h < 14) return 'morning';
  if (h >= 14 && h < 21) return 'afternoon';
  return 'night';
}

function rollCatch(baitId, rodId, accessoryEffects = {}) {
  const bait = BAITS[baitId] || BAITS.worm;
  // 鱼竿专属鱼：装备对应鱼竿时 5% 概率触发
  if (rodId && ROD_FISH[rodId] && Math.random() < 0.05) {
    const fish = pickFromArr(ROD_FISH[rodId]);
    const weight = +(ROD_FISH_BASE.minW + Math.random() * (ROD_FISH_BASE.maxW - ROD_FISH_BASE.minW)).toFixed(2);
    const diamondValue = Math.round(weight * ROD_FISH_BASE.diamondPerKg);
    return { kind: 'fish', item: { ...fish, rarity: ROD_FISH_BASE.rarity, minW: ROD_FISH_BASE.minW, maxW: ROD_FISH_BASE.maxW }, weight, value: 0, diamondValue };
  }
  if (bait.specialOnly) {
    const fish = pickFromArr(bait.fishes);
    const weight = +(fish.minW + Math.random() * (fish.maxW - fish.minW)).toFixed(2);
    const value = fish.diamondValue ? 0 : Math.round(weight * fish.price);
    return { kind: 'fish', item: fish, weight, value, diamondValue: fish.diamondValue || 0 };
  }

  const r = Math.random();
  if (r < ROLL.trash) {
    const item = pickFromArr(TRASH_POOL);
    return { kind: 'trash', item, weight: 0, value: 0 };
  }
  if (r < ROLL.trash + ROLL.treasure) {
    const item = pickFromArr(TREASURE_POOL);
    return { kind: 'treasure', item, weight: 0, value: item.value };
  }
  // 鱼
  const rarityRoll = { ...FISH_RARITY_ROLL };
  const rarityBoost = Math.max(0, Math.min(0.16, accessoryEffects.rarityBoost || 0));
  if (rarityBoost > 0) {
    const boost = Math.min(rarityBoost, Math.max(0, rarityRoll.common - 0.05));
    rarityRoll.common -= boost;
    rarityRoll.rare += boost * 0.70;
    rarityRoll.legendary += boost * 0.23;
    rarityRoll.hidden += boost * 0.07;
  }
  let rr = Math.random();
  let rarity;
  let acc = 0;
  for (const k of ['common', 'rare', 'legendary', 'hidden']) {
    acc += rarityRoll[k];
    if (rr < acc) { rarity = k; break; }
  }
  if (!rarity) rarity = 'common';
  const slot = getCurrentTimeSlot();
  const pool = bait.fishes.filter((f) => f.rarity === rarity && (!f.timeSlot || f.timeSlot === slot));
  if (pool.length === 0) { rarity = 'common'; }
  const finalPool = pool.length > 0 ? pool : bait.fishes.filter((f) => f.rarity === 'common');
  const fish = pickFromArr(finalPool);
  const weight = +(fish.minW + Math.random() * (fish.maxW - fish.minW)).toFixed(2);
  const value = Math.round(weight * fish.price);
  return { kind: 'fish', item: fish, weight, value };
}

// 鱼竿皮肤：按解锁的图鉴鱼种数量递增
const ROD_SKINS = [
  { id: 'wood',      name: '木竿',     threshold: 0,  rodColor: '#5d4037', rodHighlight: '#8d6e63', lineColor: 'rgba(255,255,255,0.7)', desc: '朴素的木质鱼竿' },
  { id: 'bamboo',    name: '竹竿',     threshold: 3,  rodColor: '#6d9b3a', rodHighlight: '#8bc34a', lineColor: 'rgba(200,255,200,0.8)', desc: '翠绿的竹节鱼竿' },
  { id: 'iron',      name: '铁竿',     threshold: 8,  rodColor: '#607d8b', rodHighlight: '#90a4ae', lineColor: 'rgba(200,220,255,0.8)', desc: '坚固的铁质鱼竿' },
  { id: 'gold',      name: '黄金竿',   threshold: 15, rodColor: '#f9a825', rodHighlight: '#ffd54f', lineColor: 'rgba(255,215,0,0.8)',   desc: '闪耀的黄金鱼竿' },
  { id: 'crystal',   name: '水晶竿',   threshold: 22, rodColor: '#4fc3f7', rodHighlight: '#b3e5fc', lineColor: 'rgba(150,220,255,0.9)', desc: '晶莹剔透的水晶竿' },
  { id: 'fire',      name: '烈焰竿',   threshold: 30, rodColor: '#e65100', rodHighlight: '#ff6d00', lineColor: 'rgba(255,100,0,0.9)',   desc: '燃烧着火焰的神器' },
  { id: 'dragon',    name: '龙骨竿',   threshold: 38, rodColor: '#7b1fa2', rodHighlight: '#ce93d8', lineColor: 'rgba(200,150,255,0.9)', desc: '以龙骨锻造的传说之竿' },
  { id: 'star',      name: '星辰竿',   threshold: 44, rodColor: '#1a237e', rodHighlight: '#ffd700', lineColor: 'rgba(255,255,150,1.0)', desc: '蕴含星辰之力的终极鱼竿' },
];

// 抽奖限定鱼竿
const GACHA_RODS = [
  { id: 'panda',       name: '熊猫竿',         rodColor: '#222',    rodHighlight: '#fff',    lineColor: 'rgba(255,255,255,0.9)', desc: '黑白配色的可爱熊猫竿', rarity: 'rare',      fx: null,    emoji: '🐼' },
  { id: 'nightmyst',   name: '神秘暗夜竿',     rodColor: '#0a0a2e', rodHighlight: '#8b5cf6', lineColor: 'rgba(139,92,246,1.0)', desc: '散发神秘暗紫光芒的传说之竿', rarity: 'legendary', fx: 'night', emoji: '🌙' },
  { id: 'firekirin',   name: '极品火麒麟鱼竿', rodColor: '#8f1d0b', rodHighlight: '#ff6b00', lineColor: 'rgba(255,120,40,1.0)', desc: '抽奖限定，成功钓获时会浮现火焰', rarity: 'ultimate', fx: null, catchFx: 'fire',   catchEmoji: '🔥', emoji: '🔥' },
  { id: 'greenxuanwu', name: '极品绿玄武鱼竿', rodColor: '#14532d', rodHighlight: '#86efac', lineColor: 'rgba(134,239,172,1.0)', desc: '抽奖限定，成功钓获时会浮现乌龟', rarity: 'ultimate', fx: null, catchFx: 'turtle', catchEmoji: '🐢', emoji: '🐢' },
  { id: 'headphone',   name: '耳机竿',         rodColor: '#1a1a2e', rodHighlight: '#00d4ff', lineColor: 'rgba(0,212,255,0.9)',   desc: '传说级以上鱼光标速度-10%，钓到鱼后显示耳机特效', rarity: 'ultimate', fx: null, catchEmoji: '🎧', emoji: '🎧', speedBonus: { legendary: -0.1, hidden: -0.1 } },
  { id: 'candy',       name: 'Candy竿',        rodColor: '#ff69b4', rodHighlight: '#fff0f5', lineColor: 'rgba(255,182,193,0.9)', desc: '糖果配色的甜蜜鱼竿，钓到鱼后显示糖果特效', rarity: 'legendary', fx: null, catchEmoji: '🍬', emoji: '🍬' },
];

const SPECIAL_RODS = [
  { id: 'black_silk_rod', name: '黑丝鱼竿', rodColor: '#181018', rodHighlight: '#ff7ac8', lineColor: 'rgba(255,122,200,1.0)', desc: '集齐黑丝图鉴后获得的限定鱼竿', rarity: 'limited', unlock: 'black_silk_dex', emoji: '🖤' },
];

// 鱼竿专属鱼 —— 只有装备对应鱼竿时才有机会钓到，每kg卖1钻石
const ROD_FISH = {
  candy:       [
    { id: 'candy_horse', name: '糖果海马', icon: '🐴', rodId: 'candy' },
    { id: 'candy_dog',   name: '糖果犬鱼', icon: '🐶', rodId: 'candy' },
  ],
  headphone:   [
    { id: 'maple_fish',  name: '枫叶鱼',   icon: '🍁', rodId: 'headphone' },
  ],
  firekirin:   [
    { id: 'fire_beast',  name: '火焰兽',   icon: '🔥', rodId: 'firekirin' },
  ],
  greenxuanwu: [
    { id: 'jade_turtle', name: '翡翠龟',   icon: '🐢', rodId: 'greenxuanwu' },
  ],
};
const ROD_FISH_BASE = { rarity: 'rod_exclusive', minW: 10, maxW: 200, diamondPerKg: 1 };
const ALL_ROD_FISH = Object.values(ROD_FISH).flat();

const ALL_RODS = [...ROD_SKINS, ...GACHA_RODS, ...SPECIAL_RODS];
const OWNED_RODS = [...GACHA_RODS, ...SPECIAL_RODS];

// 首饰系统：支持重复持有、装备与强化。
const ACCESSORIES = [
  {
    id: 'scale_charm',
    name: '鳞光坠',
    icon: '💠',
    desc: '提高稀有鱼出现概率，星级越高越明显',
    effect: 'rarity',
    particle: 'scale',
    color: '#66e6ff',
  },
  {
    id: 'tide_bracelet',
    name: '潮汐环',
    icon: '🌀',
    desc: '减慢钓鱼条光标速度，适合挑战高稀有度鱼',
    effect: 'slow',
    particle: 'tide',
    color: '#4ec9b0',
  },
  {
    id: 'star_brooch',
    name: '星砂针',
    icon: '✨',
    desc: '同时少量提高稀有鱼概率并减慢钓鱼条',
    effect: 'balanced',
    particle: 'star',
    color: '#ffd700',
  },
];

function clampAccessoryStar(star) {
  return Math.max(1, Math.min(20, Math.floor(star || 1)));
}

function getAccessoryDef(typeId) {
  return ACCESSORIES.find(a => a.id === typeId) || null;
}

function getAccessoryEffects(accessory) {
  const def = accessory && getAccessoryDef(accessory.type);
  if (!def) return { rarityBoost: 0, speedSlow: 0 };
  const star = clampAccessoryStar(accessory.star);
  if (def.effect === 'rarity') return { rarityBoost: Math.min(0.16, 0.006 * star), speedSlow: 0 };
  if (def.effect === 'slow') return { rarityBoost: 0, speedSlow: Math.min(0.35, 0.012 * star) };
  return { rarityBoost: Math.min(0.10, 0.003 * star), speedSlow: Math.min(0.24, 0.006 * star) };
}

function getAccessoryUpgradeChance(star) {
  if (clampAccessoryStar(star) >= 20) return 0;
  return Math.max(0.25, 0.95 - (clampAccessoryStar(star) - 1) * 0.035);
}

function getAccessoryUpgradeCost(star) {
  if (clampAccessoryStar(star) >= 20) return 0;
  return clampAccessoryStar(star) * 100;
}

function getCurrentRodSkin(dex, selectedId, ownedRods) {
  if (selectedId) {
    const ownedRod = OWNED_RODS.find(s => s.id === selectedId);
    if (ownedRod && (ownedRods || []).includes(selectedId)) return ownedRod;
    const selected = ROD_SKINS.find(s => s.id === selectedId);
    const count = Object.keys(dex || {}).length;
    if (selected && count >= selected.threshold) return selected;
  }
  const count = Object.keys(dex || {}).length;
  let skin = ROD_SKINS[0];
  for (const s of ROD_SKINS) {
    if (count >= s.threshold) skin = s;
  }
  return skin;
}

function getNextRodSkin(dex) {
  const count = Object.keys(dex || {}).length;
  for (const s of ROD_SKINS) {
    if (count < s.threshold) return s;
  }
  return null;
}

// 宠物系统
const PETS = [
  { id: 'cat',      name: '小猫咪',   icon: '🐱', obtain: '活动获取', desc: '慵懒的小猫，喜欢看你钓鱼', canvasX: 0.12, canvasY: 0.78,
    colors: { body: '#f4a460', belly: '#ffecd2', ear: '#d2691e', eye: '#111', nose: '#ff69b4', limb: '#d2691e', tail: '#d2691e' } },
  { id: 'dog',      name: '小狗狗',   icon: '🐶', obtain: '活动获取', desc: '忠诚的伙伴，会帮你看鱼竿', canvasX: 0.08, canvasY: 0.78,
    colors: { body: '#c68642', belly: '#ffe0b2', ear: '#8b4513', eye: '#111', nose: '#333', limb: '#8b4513', tail: '#8b4513' } },
  { id: 'parrot',   name: '鹦鹉',     icon: '🦜', obtain: '活动获取', desc: '叽叽喳喳，停在你的肩上', canvasX: 0.88, canvasY: 0.25,
    colors: { body: '#2ecc71', belly: '#f1c40f', ear: null, eye: '#111', nose: '#e67e22', limb: '#27ae60', tail: '#e74c3c' } },
  { id: 'penguin',  name: '小企鹅',   icon: '🐧', obtain: '活动获取', desc: '从南极远道而来的钓友', canvasX: 0.15, canvasY: 0.78,
    colors: { body: '#2c3e50', belly: '#ecf0f1', ear: null, eye: '#fff', nose: '#e67e22', limb: '#2c3e50', tail: null } },
  { id: 'rabbit',   name: '兔子',     icon: '🐰', obtain: '活动获取', desc: '可爱的月兔，带来好运', canvasX: 0.05, canvasY: 0.78,
    colors: { body: '#fff', belly: '#ffe4e1', ear: '#ffb6c1', eye: '#c0392b', nose: '#ffb6c1', limb: '#f5f5f5', tail: '#fff' } },
  { id: 'fox',      name: '小狐狸',   icon: '🦊', obtain: '活动获取', desc: '聪明的狐狸，帮你发现稀有鱼', canvasX: 0.18, canvasY: 0.78,
    colors: { body: '#e67e22', belly: '#fff', ear: '#d35400', eye: '#111', nose: '#333', limb: '#d35400', tail: '#e67e22' } },
  { id: 'dragon',   name: '小龙',     icon: '🐲', obtain: '活动获取', desc: '神秘的东方小龙', canvasX: 0.10, canvasY: 0.74,
    colors: { body: '#27ae60', belly: '#f1c40f', ear: '#e74c3c', eye: '#c0392b', nose: '#e74c3c', limb: '#1e8449', tail: '#27ae60' } },
  { id: 'unicorn',  name: '独角兽',   icon: '🦄', obtain: '活动获取', desc: '传说中的神兽，极其罕见', canvasX: 0.06, canvasY: 0.74,
    colors: { body: '#fff', belly: '#e8daef', ear: '#af7ac5', eye: '#8e44ad', nose: '#d2b4de', limb: '#d7bde2', tail: '#af7ac5',
      extra: (ctx, bx, by, s, t) => { ctx.fillStyle = '#ffd700'; ctx.fillRect(bx, by - s*8, s, s*3); } } },
];

const DEFAULT_CHARACTER_ID = 'fishing_master';
const CHARACTERS = [
  {
    id: 'fishing_master',
    name: '钓鱼高手',
    title: '码头上的老练新星',
    obtain: '初始角色',
    sprite: 'fishing-master',
    colors: { coat: '#2563eb', trim: '#facc15' },
    bio: '从小在像素湖边长大，能听懂水花的节奏。虽然装备朴素，但抛竿稳、收线准，是所有冒险开始时最可靠的伙伴。',
  },
  {
    id: 'phoebe_cupid',
    name: '菲比丘比',
    title: '爱心鱼钩的练习生',
    obtain: '暂未开放',
    sprite: 'phoebe-cupid',
    colors: { coat: '#ec4899', trim: '#f9a8d4' },
    bio: '带着爱心鱼钩旅行的活泼少女，坚信每一次咬钩都是命运的回信。她喜欢把幸运写进瓶中信，再交给浪花送走。',
  },
  {
    id: 'raiden_shogun',
    name: '雷电将军',
    title: '雷鸣海域的执竿者',
    obtain: '暂未开放',
    sprite: 'raiden-shogun',
    colors: { coat: '#7c3aed', trim: '#c4b5fd' },
    bio: '来自雷鸣海域的冷峻强者，挥竿时会让水面闪过细小电光。她追求永恒般稳定的命中，也尊重每一条鱼的锋芒。',
  },
  {
    id: 'justin_bieber',
    name: 'justin bieber',
    title: '湖边巡演的流行歌手',
    obtain: '暂未开放',
    sprite: 'justin-bieber',
    colors: { coat: '#f59e0b', trim: '#fde68a' },
    bio: '把临时舞台搭在湖边的流行歌手，节拍器和卷线轮总能同步。他说灵感常在等待鱼上钩的几秒钟里出现。',
  },
  {
    id: 'teemo',
    name: '提莫',
    title: '草丛旁的巡湖斥候',
    obtain: '暂未开放',
    sprite: 'teemo',
    colors: { coat: '#16a34a', trim: '#fde047' },
    bio: '个子不高，脚步很轻，常在湖边草丛记录鱼群路线。随身带着小背包和地图，最擅长找到别人忽略的钓点。',
  },
];

window.GAME_DATA = {
  HITS_BY_RARITY, RARITY_COLOR, RARITY_NAME,
  BAITS, TRASH_POOL, TREASURE_POOL, FISH_PIXEL_ICONS,
  ROD_SKINS, GACHA_RODS, SPECIAL_RODS, ALL_RODS, getCurrentRodSkin, getNextRodSkin,
  rollCatch, getCurrentTimeSlot, TIME_SLOT_NAMES,
  ROD_FISH, ROD_FISH_BASE, ALL_ROD_FISH,
  ACCESSORIES, getAccessoryDef, getAccessoryEffects, getAccessoryUpgradeChance, getAccessoryUpgradeCost, clampAccessoryStar,
  CHARACTERS, DEFAULT_CHARACTER_ID,
  PETS,
};
