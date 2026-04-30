# 像素钓鱼 🎣

一个像素风第一视角钓鱼小游戏，纯 Node.js 实现（无外部依赖）。

线上演示：<https://fish.wakaka007.cn>

## 玩法

- 输入用户名登录（数据按用户名持久化在服务器）
- 在商店购买不同档次的鱼饵（蚯蚓 / 鲜虾 / 亮片 / 魔法鱼饵）
- 抛竿钓鱼 → 等待鱼上钩 → 命中条小游戏，连续击中红区即可拉鱼上岸
- 越稀有的鱼需要的连续命中次数越多、光标越快、红区越窄
- 鱼有重量，按 重量 × 单价 卖钱
- 还能钓到 0 价值的垃圾或高价宝藏（金条、宝石…）
- 图鉴系统：4 种鱼饵 × 11 条鱼（5 普通 + 3 稀有 + 2 传说 + 1 隐藏）

## 本地运行

```bash
node server.js          # 默认 3000
PORT=3456 node server.js # 自定义端口
```

访问 `http://localhost:3000`。

## 目录结构

```
.
├── server.js          # Node http 服务（无依赖）
├── public/
│   ├── index.html     # 页面骨架
│   ├── style.css      # 像素风样式
│   ├── data.js        # 鱼饵 / 鱼 / 概率配置
│   └── game.js        # 游戏逻辑
└── data/users/        # 用户存档（JSON）
```

## API

| 端点 | 说明 |
|---|---|
| `POST /api/login` | `{username}` → 加载或创建用户 |
| `POST /api/save`  | `{username, state}` → 保存用户状态 |

## 部署

参考线上部署方式：

1. `rsync` 代码到服务器
2. `systemd` 跑 `node server.js`（服务名 `fishing-game.service`）
3. nginx 反代 `127.0.0.1:3456`，Let's Encrypt 上 HTTPS

## 许可

MIT
