# 机床加工订单管理 App

一个 PWA（渐进式网页应用），用于管理加工订单、每日工作计划和打卡统计。

## 功能

- **订单管理** — 记录订单编号、加工类型、数量、客户、材料、单价、交货日期等
- **每日计划** — 选择今日要做的订单，设定目标数量
- **打卡记录** — 完成一批就打卡一次，实时追踪进度
- **统计分析** — 按周/月查看完成趋势，按加工类型统计
- **数据备份** — 支持导出/导入数据，换手机也不丢失

## 部署方式（任选一种）

### 方式一：GitHub Pages（推荐，免费）

1. 在 https://github.com/ 创建一个新仓库
2. 将 `machining-app` 文件夹里的所有文件上传到仓库
3. 进入仓库 **Settings → Pages** → 选择 **main** 分支 → 保存
4. 等待几分钟，你会得到 `https://你的用户名.github.io/仓库名`
5. 用 iPhone Safari 打开这个网址

### 方式二：Netlify（免费）

1. 打开 https://app.netlify.com/
2. 点击 **"Deploy manually"**（手动部署）
3. 直接将 `machining-app` 文件夹拖进去
4. 等待部署完成，得到一个 `xxx.netlify.app` 网址

### 方式三：本地测试

用 VS Code 的 **Live Server** 插件，或任何静态文件服务器打开 `index.html`。

## 在 iPhone 上添加到主屏幕

1. 用 **Safari** 打开部署好的网址
2. 点击底部中间的 **「分享」** 按钮
3. 向下滑动找到 **「添加到主屏幕」**
4. 点击右上角 **「添加」**
5. App 图标会出现在桌面，点开即用

## 数据备份

设置页提供了导出/导入功能：
- **导出** → 将所有数据下载为 JSON 文件
- **导入** → 从备份文件恢复数据
- 建议每月导出一次，备份到手机文件或云盘

## 重要提醒

- 数据存储在手机本地（IndexedDB）
- 清除 Safari 浏览数据会丢失所有记录！
- 换手机或重装前务必先**导出备份**
- 导出文件是 JSON 格式，可以保存到微信、云盘等

## 技术栈

- **Vue.js 3** — 前端框架
- **Vue Router 4** — 路由管理
- **IndexedDB** — 本地数据库
- **PWA** — 离线缓存 + 添加到主屏幕

## 目录结构

```
machining-app/
├── index.html              # 入口页面
├── manifest.json           # PWA 配置
├── sw.js                   # 离线缓存 Service Worker
├── css/
│   └── style.css           # 全部样式
├── js/
│   ├── app.js              # Vue 应用初始化 + 路由
│   ├── services/
│   │   └── db.js           # IndexedDB 数据库操作层
│   └── pages/
│       ├── dashboard.js    # 📊 首页仪表盘
│       ├── orders.js       # 📋 订单列表
│       ├── order-detail.js # 订单详情/编辑
│       ├── daily-plan.js   # 📝 每日计划+打卡
│       ├── statistics.js   # 📈 统计分析
│       └── settings.js     # ⚙️ 设置+加工类型管理
└── assets/icons/
    ├── icon-192.svg         # App 图标
    └── icon-512.svg         # App 图标高清
```
