# GitHub Trending 项目收藏器

每日自动抓取 GitHub 热度最高的 10 个项目，展示功能介绍与安装代码，支持收藏保存，未收藏项目 7 天后自动删除。

## 快速启动

### 方式一：生产模式（单端口，推荐 demo）

```bash
# 1. 安装依赖
npm run install:all

# 2. 构建前端
npm run build

# 3. 启动服务
npm start
```

访问 → **http://localhost:3001**

---

### 方式二：开发模式（热更新）

```bash
npm run install:all
npm run dev
```

- 前端：http://localhost:5173（热更新）
- 后端 API：http://localhost:3001

---

## 可选配置

添加 GitHub Token 可将 API 速率限制从 60次/小时 提升至 5000次/小时：

```bash
cp .env.example .env
# 编辑 .env，填入 GITHUB_TOKEN=ghp_xxx
```

---

## 功能说明

| 功能 | 说明 |
|------|------|
| 自动抓取 | 每天凌晨 2:00 自动抓取 GitHub 当日 Top 10 趋势项目 |
| 手动刷新 | 点击页面右上角「↻ 刷新」按钮立即触发抓取 |
| 功能摘要 | 自动从 README 提取功能介绍段落 |
| 安装代码 | 自动从 README 提取安装/快速开始代码块 |
| 收藏保存 | 点击「☆ Save」收藏项目，收藏后永久保留 |
| 自动删除 | 未收藏的项目在首次抓取 7 天后自动删除 |
| 删除倒计时 | 卡片上显示「⏱ Auto-deletes in Nd」徽章 |
| 筛选标签 | All Repos / Today's Trending / Favorites 三个视图 |

## API 接口

```
GET  /api/repos?filter=all|today|favorites  # 获取项目列表
GET  /api/repos/:id                          # 获取单个项目
POST /api/repos/:id/favorite                 # 收藏
DELETE /api/repos/:id/favorite               # 取消收藏
GET  /api/stats                              # 统计数据
POST /api/scrape                             # 手动触发抓取
```

## 技术栈

- **后端**：Node.js + Express + SQLite (better-sqlite3)
- **前端**：React + Vite + Tailwind CSS
- **抓取**：cheerio 解析 github.com/trending + GitHub REST API
- **调度**：node-cron 每日定时任务
