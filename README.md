# 电商日报系统

天猫/C店/拼多多 多店铺电商日报管理系统。

## 架构

- **前端**: React + TypeScript + Vite + Tailwind CSS + Recharts
- **数据存储**: GitHub 仓库 JSON 文件（按月存储）
- **部署**: GitHub Pages

## 快速开始

### 1. 创建数据仓库

在 GitHub 创建一个仓库（公开或私有），用于存储日报数据。

### 2. 创建 Personal Access Token

前往 [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)

创建一个 Token，权限勾选 `repo`（完整的仓库读写权限）。

### 3. 配置网站

打开部署好的网站，进入「设置」页面，填入：
- **GitHub Token**: 上一步创建的 Token
- **仓库地址**: 格式 `username/repo-name`

### 4. 开始使用

- **数据录入**: 点击解锁（密码为 Token 或 `admin888`），填写各店铺数据
- **日报查看**: 查看每日数据、GMV趋势图和店铺对比图
- **历史查询**: 按日期范围查询历史数据，支持导出CSV

## 本地开发

```bash
npm install
npm run dev
```

## 部署

推送代码到 GitHub 后自动通过 GitHub Actions 部署到 GitHub Pages。

需要在仓库 Settings > Pages 中将 Source 设为 "GitHub Actions"。
