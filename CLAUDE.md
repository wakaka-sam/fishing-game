# 像素钓鱼游戏

## 开发服务器
使用 `node server.js` 启动，端口通过 `.claude/launch.json` 配置为 3456。

## 版本管理
每次提交代码时，**必须**先运行版本递增脚本更新 `public/version.json`：

```bash
./scripts/bump-version.sh "更新内容1" "更新内容2"
```

这会自动递增补丁版本号并在 changelog 中添加本次更新内容。
更新后的 `public/version.json` 需要一起提交。

## 推送
默认直接推送到 main 分支。
