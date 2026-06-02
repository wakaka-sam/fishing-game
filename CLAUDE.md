# 像素钓鱼游戏

纯前端项目，所有游戏代码在 `public/` 目录下。

## 本地预览

用任意静态文件服务器托管 `public/` 目录，例如：

```bash
python3 -m http.server 3000 --directory public
```

## 版本管理

每次提交代码时，**必须**先运行版本递增脚本更新 `public/version.json`：

```bash
./scripts/bump-version.sh "更新内容1" "更新内容2"
```

这会自动递增补丁版本号并在 changelog 中添加本次更新内容。
更新后的 `public/version.json` 需要一起提交。

## 推送

默认直接推送到 main 分支。
