# GameVerse — 开源浏览器迷你游戏合集

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

[![在线游玩 GameVerse](https://img.shields.io/badge/在线游玩-LIVE%20DEMO-6c5ce7?style=for-the-badge)](https://dengkai666666.github.io/gameverse-mini-hub/)
[![GitHub Stars](https://img.shields.io/github/stars/dengkai666666/gameverse-mini-hub?style=for-the-badge&logo=github)](https://github.com/dengkai666666/gameverse-mini-hub/stargazers)
[![MIT 许可证](https://img.shields.io/badge/许可证-MIT-007f7b?style=for-the-badge)](LICENSE)

<p align="center">
  <a href="https://dengkai666666.github.io/gameverse-mini-hub/"><strong>在线试玩</strong></a>
  ·
  <a href="CONTRIBUTING.md"><strong>参与贡献</strong></a>
  ·
  <a href="LICENSE"><strong>MIT 许可证</strong></a>
</p>

![GameVerse 预览](assets/gameverse-preview.webp)

GameVerse 是一个精心打磨的双语迷你游戏合集，完全运行在浏览器中。项目不需要后端、构建步骤、数据库或付费服务，仅使用静态 HTML、CSS 与 JavaScript，可部署在任意免费前端托管平台。

**维护者：** [@dengkai666666](https://github.com/dengkai666666)

## 在线游玩

**https://dengkai666666.github.io/gameverse-mini-hub/**

## 游戏列表

| 游戏 | 特色 | 操作方式 |
| --- | --- | --- |
| 记忆配对 | 计时、步数统计、无障碍卡片 | 触摸 / 鼠标 / 键盘 |
| 贪吃蛇 | 难度、障碍、墙壁、传送门、最高分 | 方向键 / 触控方向盘 |
| 井字棋 | 双人和人机模式 | 触摸 / 鼠标 / 键盘 |
| 2048 | 移动动画、撤销、提示、最高分 | 滑动 / 方向键 / WASD |
| 飞鸟 | 响应式画布、最高分保存 | 触摸 / 鼠标 / 空格键 |
| 纸牌接龙 | 拖放、点击移动、撤销、提示、自动移动、教程 | 触摸 / 鼠标 / 键盘快捷键 |

## 项目特色

- **纯前端** — 仓库可直接部署到 GitHub Pages。
- **移动优先** — 响应式布局、大尺寸触控目标和滑动操作。
- **中英双语** — 一键切换语言并保存偏好。
- **无障碍支持** — 语义化控件、键盘导航、实时状态和减少动态效果支持。
- **深浅主题** — 支持持久化保存的浅色与深色模式。
- **本地游戏档案** — 最佳成绩、完成局数和六项成就仅保存在当前设备。
- **便捷分享** — 移动端原生分享，并提供剪贴板回退。
- **零安装** — 不需要包管理器、框架或构建流水线。
- **离线可玩** — 首次成功访问后，Service Worker 会缓存完整游戏合集。

## 本地运行

```bash
python -m http.server 8000
```

打开 `http://localhost:8000/`。也可以直接打开 `index.html`，但本地静态服务器能提供更一致的浏览器行为。

## 项目结构

```text
index.html / styles.css / script.js     首页、主题、筛选和国际化
game-page.css                           独立游戏共享布局
translations.js                         中英文文案
memory-game.js                          记忆配对
snake.html / snake.js                   贪吃蛇
tic-tac-toe.html / tic-tac-toe.js       井字棋
2048.html / 2048.css / 2048-anim.js     2048
flappy-bird.html / flappy-bird.js        飞鸟
solitaire.html / solitaire.css / solitaire.js
site.webmanifest / favicon.svg / sw.js   可安装应用元数据与离线缓存
```

## 质量目标

- 无需后端服务器即可运行。
- 首次成功访问后可离线运行。
- 390px 手机宽度下无横向溢出。
- 交互控件支持键盘操作。
- 深浅主题通过对比度检查。
- JavaScript 通过 `node --check` 语法检查。
- Lighthouse 无障碍、最佳实践与 SEO 审计通过。

## 参与贡献

欢迎提交 Issue 和 Pull Request。添加游戏或修改共享 UI 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

如果你喜欢 GameVerse，欢迎为仓库点亮 **Star** 并分享在线试玩地址。

## 许可证

[MIT](LICENSE) © 2026 GameVerse contributors

项目内置 Font Awesome Free 资源以支持可靠的离线运行，并保留其原始开源许可证，详见 [`vendor/fontawesome/LICENSE.txt`](vendor/fontawesome/LICENSE.txt)。
