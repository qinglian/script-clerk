# 数据存储与备份机制详解

本文档详细说明 Script Clerk 的数据存储、备份和恢复机制。

## 目录

1. [存储架构概述](#存储架构概述)
2. [存储位置详解](#存储位置详解)
3. [数据保存流程](#数据保存流程)
4. [数据加载流程](#数据加载流程)
5. [容错与降级机制](#容错与降级机制)
6. [文件格式说明](#文件格式说明)
7. [常见问题](#常见问题)

---

## 存储架构概述

Script Clerk 采用**三层存储架构**，确保数据安全可靠：

```
┌─────────────────────────────────────────────────────────────┐
│                      用户操作层                              │
│              (新建项目/添加记录/修改设置)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      内存缓存层                              │
│                    dataCache (ref)                          │
│              临时存储，页面刷新后丢失                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌───────────┐  ┌─────────────┐
   │localStorage│  │ 实时备份   │  │  主数据文件  │
   │         │  │           │  │             │
   │ 5-10MB  │  │ 单项目快照 │  │ script-clerk│
   │ 浏览器   │  │           │  │ -data.json  │
   │ 存储    │  │           │  │             │
   └─────────┘  └───────────┘  └─────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │   增量备份文件夹  │
            │  全量备份_{时间戳} │
            └─────────────────┘
```

---

## 存储位置详解

### 1. localStorage（浏览器本地存储）

| 属性 | 说明 |
|------|------|
| **键名** | `script-clerk-data` |
| **容量** | 通常 5-10MB |
| **生命周期** | 除非手动清除，否则永久保存 |
| **作用域** | 同源（同域名、同协议、同端口） |
| **数据格式** | JSON 字符串 |

**用途**：
- 快速读取缓存
- 离线模式数据恢复
- 文件系统不可用时降级存储

**清除方式**：
- 浏览器设置 → 清除浏览数据
- F12 → Application → Storage → Clear storage

### 2. 本地文件系统（File System Access API）

| 属性 | 说明 |
|------|------|
| **API** | File System Access API |
| **浏览器支持** | Chrome/Edge 86+ |
| **容量** | 无限制（取决于磁盘空间） |
| **权限** | 需要用户授权选择文件夹 |

**文件结构**：

```
用户选择的文件夹/
├── script-clerk-data.json          # 主数据文件
├── 实时备份/                        # 单项目备份文件夹
│   ├── 项目A_2024-01-15T10-30-00.json
│   ├── 项目A_2024-01-15T11-00-00.json
│   ├── 项目B_2024-01-15T10-45-00.json
│   └── ...
└── 增量备份/                        # 全量历史备份
    ├── 全量备份_2024-01-15T10-00-00.json
    ├── 全量备份_2024-01-15T11-00-00.json
    └── ...
```

### 3. IndexedDB

| 属性 | 说明 |
|------|------|
| **数据库** | `ScriptClerkDB` |
| **表** | `handles` |
| **用途** | 存储文件夹句柄，刷新后自动恢复权限 |
| **容量** | 无限制 |

---

## 数据保存流程

### 触发时机

以下操作会触发数据保存：
- 新建项目
- 添加场记记录
- 更新项目设置
- 删除项目/记录
- 修改机位绑定

### 保存流程图

```
用户操作
    │
    ▼
saveData(data, projectId)
    │
    ├── 1. 更新内存缓存 ─────────────────────────────┐
    │   dataCache.value = data                        │
    │                                                  │
    ├── 2. 保存到 localStorage ──────────────────────┤
    │   try {                                         │
    │       localStorage.setItem(STORAGE_KEY, data)   │
    │   } catch (e) {                                 │
    │       // 失败不影响后续操作                      │
    │       console.warn('localStorage 失败')         │
    │   }                                             │
    │                                                  │
    ├── 3. 实时备份（异步）───────────────────────────┤
    │   if (projectId) {                              │
    │       saveRealtime(projectId, projectData)      │
    │       └── 实时备份/项目名_时间戳.json            │
    │   }                                             │
    │                                                  │
    └── 4. 全量备份（异步）───────────────────────────┘
        saveIncremental(data)
        ├── 增量备份/全量备份_时间戳.json
        └── script-clerk-data.json（主文件）
```

### 代码实现

```typescript
// scriptStore.ts
function saveData(data: AppData, projectId?: string): void {
  // 1. 更新内存缓存
  dataCache.value = data
  
  // 2. 保存到 localStorage（带错误处理）
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[saveData] localStorage 保存失败', e)
  }
  
  // 3. 异步执行文件备份
  saveDataWithBackup(data, projectId)
}

async function saveDataWithBackup(data: AppData, projectId?: string): Promise<void> {
  // 实时备份（单项目）
  if (projectId) {
    const project = data.projects.find(p => p.id === projectId)
    const records = data.records.filter(r => r.projectId === projectId)
    await saveRealtime(projectId, { project, records })
  }
  
  // 全量备份
  await saveIncremental(data)
}
```

---

## 数据加载流程

### 加载时机

- 页面首次加载
- 刷新页面后

### 加载流程图

```
页面加载
    │
    ▼
initStorage()
    │
    ├── 1. 从 localStorage 读取 ─────────────────────┐
    │   const raw = localStorage.getItem(STORAGE_KEY) │
    │   localData = JSON.parse(raw)                   │
    │   console.log('项目数:', localData.projects.length)│
    │                                                  │
    ├── 2. 恢复文件系统句柄 ──────────────────────────┤
    │   await restoreDirectoryHandle()                │
    │   └── 从 IndexedDB 恢复文件夹权限               │
    │                                                  │
    ├── 3. 读取主数据文件 ────────────────────────────┤
    │   fileData = await loadFromLocalFile()          │
    │   └── 读取 script-clerk-data.json               │
    │                                                  │
    └── 4. 决策逻辑 ──────────────────────────────────┘
        │
        ├── 文件有数据？
        │   ├── 是 → 使用文件数据
        │   │         dataCache.value = fileData
        │   │         localStorage.setItem(fileData) // 同步
        │   │
        │   └── 否 → 继续检查
        │
        ├── localStorage 有数据？
        │   ├── 是 → 使用 localStorage 数据
        │   │         dataCache.value = localData
        │   │
        │   └── 否 → 初始化为空
        │                 dataCache.value = null
        │
        └── 结束
```

### 代码实现

```typescript
// scriptStore.ts
export async function initStorage(): Promise<void> {
  // 1. 从 localStorage 读取
  let localData: AppData | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      localData = JSON.parse(raw) as AppData
      console.log('[Storage] localStorage 项目数:', localData?.projects?.length)
    }
  } catch (e) {
    console.error('[Storage] localStorage 读取失败:', e)
  }
  
  // 2. 恢复文件系统
  await restoreDirectoryHandle()
  const fileData = await loadFromLocalFile()
  
  // 3. 决策逻辑
  if (fileData) {
    const fileCount = fileData.projects?.length || 0
    const localCount = localData?.projects?.length || 0
    
    if (fileCount > 0 || localCount === 0) {
      // 使用文件数据
      dataCache.value = fileData
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData))
      console.log('[Storage] 使用文件数据')
    } else {
      // 文件为空，使用 localStorage
      dataCache.value = localData
      console.log('[Storage] 使用 localStorage 数据')
    }
  } else if (localData) {
    // 无文件数据，使用 localStorage
    dataCache.value = localData
    console.log('[Storage] 使用 localStorage 数据')
  } else {
    // 都没有
    dataCache.value = null
    console.log('[Storage] 初始化为空')
  }
}
```

---

## 容错与降级机制

### 场景 1：localStorage 已满

```
saveData(data)
    │
    ├── localStorage.setItem() → 抛出 QuotaExceededError
    │                             └── 被 try-catch 捕获
    │                             └── 打印警告日志
    │
    └── saveDataWithBackup() → 继续执行
                                └── 文件保存成功 ✅
```

**结果**：数据保存到文件，不会丢失。

### 场景 2：未选择文件夹

```
saveData(data)
    │
    ├── localStorage.setItem() → 成功 ✅
    │
    └── saveDataWithBackup()
            └── directoryHandle = null
            └── 无法保存到文件
            └── 仅 localStorage 有数据 ⚠️
```

**风险**：如果 localStorage 被清除，数据丢失。

**建议**：首次使用时务必选择本地文件夹。

### 场景 3：文件读取失败

```
initStorage()
    │
    ├── loadFromLocalFile()
    │       └── 文件不存在或损坏
    │       └── 返回 null
    │
    └── 使用 localStorage 数据 ✅
```

**结果**：从 localStorage 恢复，数据不丢失。

---

## 文件格式说明

### 主数据文件（script-clerk-data.json）

```json
{
  "_backupTime": "2024-01-15T10:30:00.000Z",
  "_backupType": "incremental",
  "projects": [
    {
      "id": "abc123",
      "name": "测试项目",
      "director": "张三",
      "scriptSupervisor": "李四",
      "cameraBindings": [
        { "id": "bind1", "label": "A机位", "type": "camera" }
      ],
      "presets": [],
      "createdAt": "2024-01-15T08:00:00.000Z"
    }
  ],
  "records": [
    {
      "id": "rec1",
      "projectId": "abc123",
      "projectName": "测试项目",
      "sceneNumber": "1",
      "sceneType": "int",
      "timeOfDay": "day",
      "shotNumber": "1",
      "takeCount": 1,
      "status": "passed",
      "equipment": [
        { "label": "A机位", "type": "camera", "fileCode": "A-001", "enabled": true }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "currentProjectId": "abc123"
}
```

### 实时备份文件

文件名格式：`{项目名}_{时间戳}.json`

```json
{
  "_backupTime": "2024-01-15T10:30:00.000Z",
  "_backupType": "realtime",
  "_projectId": "abc123",
  "project": { ... },
  "records": [ ... ]
}
```

---

## 常见问题

### Q1: 刷新后数据丢失怎么办？

**检查步骤**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 日志
3. 检查是否有 `[Storage]` 相关日志
4. 确认是否选择了本地文件夹

**解决方案**：
- 如果没有选择文件夹，数据仅保存在 localStorage，可能被浏览器清除
- 选择本地文件夹后，数据会持久化保存

### Q2: localStorage 满了怎么办？

**系统会自动处理**：
- localStorage 保存失败时，会继续保存到文件
- 数据不会丢失
- 建议定期导出备份

### Q3: 如何迁移数据到新电脑？

**方法 1：导出导入**
1. 在原电脑导出所有数据（JSON 格式）
2. 在新电脑导入数据

**方法 2：复制文件**
1. 复制 `script-clerk-data.json` 文件
2. 在新电脑选择相同文件夹

### Q4: 增量备份文件太多怎么办？

**手动清理**：
- 删除 `增量备份/` 文件夹中的旧文件
- 保留最近几次备份即可

---

## 技术细节

### 关键常量

```typescript
// fileStorage.ts
const LOCAL_STORAGE_KEY = 'script-clerk-data'
const MAIN_DATA_FILE = 'script-clerk-data.json'
const REALTIME_BACKUP_FOLDER = '实时备份'
const INCREMENTAL_BACKUP_FOLDER = '增量备份'
const BACKUP_INTERVAL = 30 * 60 * 1000 // 30分钟（已废弃）
```

### 核心函数

| 函数 | 文件 | 用途 |
|------|------|------|
| `saveData()` | scriptStore.ts | 主保存函数 |
| `saveDataWithBackup()` | scriptStore.ts | 带备份的保存 |
| `saveIncremental()` | fileStorage.ts | 全量备份 |
| `saveRealtime()` | fileStorage.ts | 实时备份 |
| `loadFromLocalFile()` | fileStorage.ts | 从文件加载 |
| `initStorage()` | scriptStore.ts | 初始化存储 |
| `restoreDirectoryHandle()` | fileStorage.ts | 恢复文件夹权限 |

---

## 总结

Script Clerk 的数据存储机制设计目标是：**可靠、容错、用户无感知**。

- **双重备份**：localStorage + 文件系统
- **自动降级**：localStorage 失败时继续使用文件
- **智能恢复**：优先使用文件数据，localStorage 作为备用
- **实时同步**：每次操作立即保存

建议用户**始终选择本地文件夹**，以获得最佳的数据安全保障。
