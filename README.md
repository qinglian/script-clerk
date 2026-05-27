# 🎬 Script Clerk - 场记软件

一个专为影视拍摄设计的现代化场记记录系统，支持多项目管理、设备绑定、实时备份和多种格式导出。

## ✨ 功能特性

### 核心功能
- 📁 **多项目管理** - 支持创建、切换、删除多个拍摄项目
- 📝 **场记记录** - 快速记录场景、镜号、条数、状态等信息
- 📷 **设备绑定** - 支持多机位摄像机和录音设备绑定
- 🏷️ **文件编码** - 自动生成设备文件编码（如 A-001）
- 📊 **实时统计** - 场景数、镜头数、通过率等统计数据

### 数据安全
- 💾 **双重备份** - 浏览器本地存储 + 本地文件系统
- 🔄 **实时同步** - 每次操作自动保存
- 📂 **增量备份** - 支持历史版本回溯
- 🛡️ **容错机制** - localStorage 满时自动降级到文件保存

### 导出功能
- 📄 **Markdown** - 适合文档编辑和版本控制
- 📊 **Excel/CSV** - 适合数据分析和归档
- 🖨️ **PDF/打印** - 适合纸质存档和现场使用

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+ 或 pnpm 8+

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📖 使用指南

### 1. 创建项目
1. 点击顶部 "+ 新建项目" 按钮
2. 输入项目名称、导演、场记姓名
3. 配置机位绑定（如 A机位、B机位）
4. 点击"创建项目"

### 2. 添加场记记录
1. 选择要记录的项目
2. 填写场景号、镜号、条数
3. 选择拍摄状态（通过/NG/补拍）
4. 启用设备并输入文件编码
5. 点击"保存并新增"继续下一条

### 3. 数据备份
- **首次使用**：点击"选择文件夹"选择本地保存位置
- **自动备份**：所有操作自动保存到本地文件夹
- **手动导出**：支持 Markdown、Excel、PDF 格式导出

## 🏗️ 项目结构

```
script-clerk/
├── public/                 # 静态资源
│   └── sw.js              # Service Worker
├── src/
│   ├── components/        # Vue 组件
│   │   ├── ScriptForm.vue      # 场记表单
│   │   ├── RecordList.vue      # 记录列表
│   │   ├── StatsPanel.vue      # 统计面板
│   │   ├── ExportPanel.vue     # 导出面板
│   │   ├── ProjectManager.vue  # 项目管理
│   │   ├── ProjectSettings.vue # 项目设置
│   │   └── FileBrowser.vue     # 文件浏览器
│   ├── stores/            # 状态管理
│   │   ├── scriptStore.ts      # 主数据存储
│   │   └── fileStorage.ts      # 文件系统存储
│   ├── types/             # TypeScript 类型
│   │   └── script.ts
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 💾 数据存储机制

### 存储位置

| 存储位置 | 用途 | 容量限制 |
|---------|------|---------|
| **localStorage** | 浏览器本地缓存 | 5-10MB |
| **本地文件系统** | 持久化主存储 | 无限制 |
| **IndexedDB** | 目录句柄缓存 | 无限制 |

### 文件结构

```
用户选择的文件夹/
├── script-clerk-data.json          # 主数据文件（最新全量数据）
├── 实时备份/                        # 单项目实时备份
│   └── 项目名_2024-01-15T10-30-00.json
└── 增量备份/                        # 全量历史备份
    └── 全量备份_2024-01-15T10-00-00.json
```

### 保存流程

```
用户操作
    │
    ▼
saveData(data)
    │
    ├── 1. 更新内存缓存 (dataCache)
    │
    ├── 2. 保存到 localStorage
    │     └── 失败时继续执行（不影响文件保存）
    │
    ├── 3. 实时备份（单项目）
    │     └── 实时备份/{项目名}_{时间戳}.json
    │
    └── 4. 全量备份
          ├── 增量备份/全量备份_{时间戳}.json
          └── script-clerk-data.json
```

### 加载流程

```
页面加载
    │
    ▼
initStorage()
    │
    ├── 1. 从 localStorage 读取
    │
    ├── 2. 恢复文件系统目录句柄
    │
    ├── 3. 读取 script-clerk-data.json
    │
    └── 4. 决策逻辑
          ├── 文件有数据 → 使用文件数据
          ├── 文件为空但 localStorage 有 → 使用 localStorage
          └── 都没有 → 初始化为空
```

### 容错机制

| 场景 | localStorage | 文件保存 | 结果 |
|------|-------------|---------|------|
| 正常 | ✅ 成功 | ✅ 执行 | 双重备份 |
| localStorage 满 | ❌ 失败（被捕获） | ✅ 继续执行 | **文件保存成功** |
| 未选择文件夹 | ❌ 失败 | ❌ 不执行 | ⚠️ 仅 localStorage |

## 🔧 技术栈

- **前端框架**: Vue 3 + Composition API
- **类型系统**: TypeScript 5
- **构建工具**: Vite 5
- **UI 组件库**: Element Plus
- **状态管理**: 自定义 Store（基于 localStorage + File System Access API）
- **图标**: Element Plus Icons

## 📝 浏览器兼容性

- Chrome/Edge 86+ (推荐)
- 支持 File System Access API 的浏览器

> ⚠️ **注意**: Firefox 和 Safari 暂不支持 File System Access API，但仍可使用 localStorage 模式。



---

