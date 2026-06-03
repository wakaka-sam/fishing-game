# 像素钓鱼 🎣

一个像素风第一视角钓鱼小游戏，纯前端实现，直接打开 `public/index.html` 即可运行。

线上演示：<https://fish.wakaka007.cn>

> 这是一个纯前端项目，不含任何服务端代码。游戏数据通过外部 API 服务持久化。

## 玩法

- 输入用户名登录（数据持久化在云端）
- 在商店购买不同档次的鱼饵（蚯蚓 / 鲜虾 / 亮片 / 魔法鱼饵 / 神仙鱼饵）
- 抛竿钓鱼 → 等待鱼上钩 → 命中条小游戏，连续击中红区即可拉鱼上岸
- 越稀有的鱼需要的连续命中次数越多、光标越快、红区越窄
- 鱼有重量，按 重量 × 单价 卖钱
- 每次成功钓获都会额外获得钻石：通常 1-3 个，1% 概率直接获得 100 个
- 黑丝饵已关闭新增获取来源，现存黑丝饵仍可使用；黑丝饵只能钓黑丝图鉴限定鱼，售出获得钻石
- 每次成功钓获有 0.01% 概率额外获得神仙鱼饵，5% 概率额外获得 JB 鱼饵
- JB 鱼饵只会钓到角色碎片，菲比丘比 / 雷电将军 / justin bieber / 提莫集齐 10 个指定角色碎片可合成并解锁
- 集齐黑丝图鉴可解锁黑丝鱼竿
- 抽奖分为金币抽奖和钻石抽奖，钻石抽奖可获得限定极品鱼竿
- 还能钓到 0 价值的垃圾或高价宝藏（金条、宝石…）
- 图鉴系统：4 种鱼饵 × 11 条鱼（5 普通 + 3 稀有 + 2 传说 + 1 隐藏）

## 本地运行

直接用浏览器打开 `public/index.html`，或用任意静态文件服务器托管 `public/` 目录：

```bash
# 例如用 Python
python3 -m http.server 3000 --directory public
```

访问 `http://localhost:3000`。

## 微信小程序

小程序工程位于 `miniprogram/`：

1. 用微信开发者工具导入 `miniprogram/`。
2. 将 `miniprogram/project.config.json` 中的 `appid` 改成正式小程序 AppID。
3. 在微信公众平台后台配置 request 合法域名：`https://fish.wakaka007.cn`。
4. 编译预览即可运行。

小程序版使用 `https://fish.wakaka007.cn/api/*` 同步登录、存档、兑换码和排行榜；网络不可用时会使用本地缓存兜底。

### 浏览版

按原网页钓鱼 UI 生成浏览器预览包：

```bash
npm run build:web-preview
npm run serve:web-preview
```

访问 `http://localhost:4173`。生成内容位于 `build/web-preview/`，直接复用 `public/` 的原网页钓鱼界面和交互。

## 目录结构

```
.
├── public/
│   ├── index.html     # 页面骨架
│   ├── style.css      # 像素风样式
│   ├── data.js        # 鱼饵 / 鱼 / 概率配置
│   ├── game.js        # 游戏逻辑
│   └── version.json   # 版本信息
├── miniprogram/        # 微信小程序工程
├── build/
│   └── web-preview/    # 原网页 UI 浏览版
└── scripts/
    ├── bump-version.sh      # 版本递增工具
    └── build-web-preview.js # 浏览版生成工具
```
## 许可

MIT
