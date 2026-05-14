# 像素钓鱼 🎣

一个像素风第一视角钓鱼小游戏。当前仓库只保留前端静态资源和 API 代理；真实后端逻辑在 `/Volumes/bigger/workspace/fish_backend`，线上服务为 `https://fishapi.wakaka007.cn`。

线上演示：<https://fish.wakaka007.cn>

## 玩法

- 输入用户名登录（数据按用户名持久化在服务器）
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

```bash
node server.js          # 默认 3000
PORT=3456 node server.js # 自定义端口
FISH_BACKEND_URL=http://localhost:3000 node server.js # 指向本地后端调试
```

访问 `http://localhost:3000`。

`server.js` 只负责两件事：

- 服务 `public/` 静态文件
- 将 `/api/*` 原样代理到 `FISH_BACKEND_URL`，默认 `https://fishapi.wakaka007.cn`

## 目录结构

```
.
├── server.js          # 前端静态服务 + API 代理（无业务后端逻辑）
├── public/
│   ├── index.html     # 页面骨架
│   ├── style.css      # 像素风样式
│   ├── data.js        # 鱼饵 / 鱼 / 概率配置
│   └── game.js        # 游戏逻辑
```

## API

本仓库不实现 API。所有 `/api/*` 请求由 `server.js` 代理到 fish backend。新增或修改登录、保存、排行榜、兑换、抽奖、数据库等逻辑时，请修改 `/Volumes/bigger/workspace/fish_backend`。

## 部署

参考线上部署方式：

1. `rsync` 代码到服务器
2. `systemd` 跑 `node server.js`（服务名 `fishing-game.service`）
3. nginx 反代 `127.0.0.1:3456`，Let's Encrypt 上 HTTPS

## 许可

MIT
