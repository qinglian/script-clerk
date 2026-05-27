import type { AppData, Project, ScriptRecord } from '../types/script'

// ===== 常量定义 =====
const LOCAL_STORAGE_KEY = 'script-clerk-data'
const MAIN_DATA_FILE = 'script-clerk-data.json'
const REALTIME_BACKUP_FOLDER = '实时备份'
const INCREMENTAL_BACKUP_FOLDER = '增量备份'
const SAVE_TIME_KEY = 'script-clerk-last-save-time'
const BACKUP_INTERVAL = 30 * 60 * 1000 // 30分钟

// ===== 状态变量 =====
let directoryHandle: FileSystemDirectoryHandle | null = null
let realtimeBackupFolderHandle: FileSystemDirectoryHandle | null = null
let incrementalBackupFolderHandle: FileSystemDirectoryHandle | null = null
let lastIncrementalBackupTime: number = 0

// ===== 文件系统支持检测 =====

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ===== 保存时间管理 =====

function getLastSaveTime(): Date | null {
  const stored = localStorage.getItem(SAVE_TIME_KEY)
  if (stored) {
    try {
      return new Date(stored)
    } catch {
      return null
    }
  }
  return null
}

function setLastSaveTime(date: Date): void {
  localStorage.setItem(SAVE_TIME_KEY, date.toISOString())
}

export function getFormattedLastSaveTime(): string {
  const lastTime = getLastSaveTime()
  if (!lastTime) return '从未保存'

  const now = new Date()
  const diff = now.getTime() - lastTime.getTime()

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' 分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' 小时前'
  } else {
    const m = lastTime.getMonth() + 1
    const d = lastTime.getDate()
    const h = lastTime.getHours()
    const min = String(lastTime.getMinutes()).padStart(2, '0')
    return m + '/' + d + ' ' + h + ':' + min
  }
}

// ===== 文件夹选择 =====

export async function selectSaveDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('浏览器不支持文件系统访问 API')
    }
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    })
    directoryHandle = handle
    // 重置实时备份文件夹句柄，下次使用时会重新获取
    realtimeBackupFolderHandle = null
    // 重置增量备份文件夹句柄
    incrementalBackupFolderHandle = null
    await saveDirectoryHandle(handle)
    return handle
  } catch (error) {
    console.error('选择文件夹失败:', error)
    return null
  }
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction('handles', 'readwrite')
    const store = transaction.objectStore('handles')
    store.put(handle, 'saveDirectory')
    db.close()
  } catch (error) {
    console.error('保存目录句柄失败:', error)
  }
}

export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction('handles', 'readonly')
    const store = transaction.objectStore('handles')
    const request = store.get('saveDirectory')

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined
        db.close()

        if (handle) {
          try {
            const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
            if (permission === 'granted') {
              directoryHandle = handle
              // 重置实时备份文件夹句柄
              realtimeBackupFolderHandle = null
              // 重置增量备份文件夹句柄
              incrementalBackupFolderHandle = null
              resolve(handle)
              return
            }
            const reqPermission = await (handle as any).requestPermission({ mode: 'readwrite' })
            if (reqPermission === 'granted') {
              directoryHandle = handle
              realtimeBackupFolderHandle = null
              incrementalBackupFolderHandle = null
              resolve(handle)
              return
            }
          } catch (e) {
            // ignore
          }
        }
        resolve(null)
      }
      request.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch (error) {
    console.error('恢复目录句柄失败:', error)
    return null
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ScriptClerkDB', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles')
      }
    }
  })
}

// ===== 实时备份文件夹管理 =====

/**
 * 获取或创建实时备份文件夹
 */
export async function getBackupFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (realtimeBackupFolderHandle) {
    return realtimeBackupFolderHandle
  }

  if (!directoryHandle) {
    directoryHandle = await restoreDirectoryHandle()
  }

  if (!directoryHandle) {
    return null
  }

  try {
    // 尝试获取现有文件夹
    try {
      realtimeBackupFolderHandle = await directoryHandle.getDirectoryHandle(REALTIME_BACKUP_FOLDER)
      return realtimeBackupFolderHandle
    } catch (e) {
      // 文件夹不存在，创建它
      realtimeBackupFolderHandle = await directoryHandle.getDirectoryHandle(REALTIME_BACKUP_FOLDER, { create: true })
      return realtimeBackupFolderHandle
    }
  } catch (error) {
    console.error('获取实时备份文件夹失败:', error)
    return null
  }
}

// ===== 增量备份文件夹管理 =====

/**
 * 获取或创建增量备份文件夹
 */
export async function getIncrementalBackupFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (incrementalBackupFolderHandle) {
    return incrementalBackupFolderHandle
  }

  if (!directoryHandle) {
    directoryHandle = await restoreDirectoryHandle()
  }

  if (!directoryHandle) {
    return null
  }

  try {
    // 尝试获取现有文件夹
    try {
      incrementalBackupFolderHandle = await directoryHandle.getDirectoryHandle(INCREMENTAL_BACKUP_FOLDER)
      return incrementalBackupFolderHandle
    } catch (e) {
      // 文件夹不存在，创建它
      incrementalBackupFolderHandle = await directoryHandle.getDirectoryHandle(INCREMENTAL_BACKUP_FOLDER, { create: true })
      return incrementalBackupFolderHandle
    }
  } catch (error) {
    console.error('获取增量备份文件夹失败:', error)
    return null
  }
}

// ===== 实时备份（单个项目）=====

/**
 * 保存单个项目的实时备份
 * 文件名格式: {projectName}_{timestamp}.json
 */
export async function saveRealtime(
  projectId: string,
  projectData: { project: Project; records: ScriptRecord[] }
): Promise<{ success: boolean; timestamp: Date | null }> {
  try {
    const backupFolder = await getBackupFolderHandle()
    if (!backupFolder) {
      return { success: false, timestamp: null }
    }

    const timestamp = new Date()
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeProjectName = projectData.project.name.replace(/[\\/:*?"<>|]/g, '_')
    const filename = `${safeProjectName}_${timestampStr}.json`

    const fileHandle = await backupFolder.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify({
      ...projectData,
      _backupTime: timestamp.toISOString(),
      _backupType: 'realtime',
      _projectId: projectId
    }, null, 2))
    await writable.close()

    setLastSaveTime(timestamp)
    return { success: true, timestamp }
  } catch (error) {
    console.error('实时备份保存失败:', error)
    return { success: false, timestamp: null }
  }
}

// ===== 增量备份（全量数据）=====

/**
 * 保存全量数据的增量备份
 * 1. 保存到增量备份文件夹: 增量备份/全量备份_{timestamp}.json
 * 2. 同时保存到根目录: script-clerk-data.json（用于快速加载）
 */
export async function saveIncremental(allData: AppData): Promise<{ success: boolean; timestamp: Date | null }> {
  try {
    // 同时保存到 localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allData))

    if (!directoryHandle) {
      directoryHandle = await restoreDirectoryHandle()
    }

    if (!directoryHandle) {
      return { success: false, timestamp: null }
    }

    const timestamp = new Date()
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)

    // 1. 保存到增量备份文件夹（带时间戳的新文件）
    const incrementalBackupFolder = await getIncrementalBackupFolderHandle()
    if (incrementalBackupFolder) {
      const incrementalFilename = `全量备份_${timestampStr}.json`
      const incrementalFileHandle = await incrementalBackupFolder.getFileHandle(incrementalFilename, { create: true })
      const incrementalWritable = await incrementalFileHandle.createWritable()
      await incrementalWritable.write(JSON.stringify({
        ...allData,
        _backupTime: timestamp.toISOString(),
        _backupType: 'incremental'
      }, null, 2))
      await incrementalWritable.close()
    }

    // 2. 保存到根目录（最新数据，用于快速加载）
    const mainFileHandle = await directoryHandle.getFileHandle(MAIN_DATA_FILE, { create: true })
    const mainWritable = await mainFileHandle.createWritable()
    await mainWritable.write(JSON.stringify({
      ...allData,
      _backupTime: timestamp.toISOString(),
      _backupType: 'incremental'
    }, null, 2))
    await mainWritable.close()

    lastIncrementalBackupTime = timestamp.getTime()
    setLastSaveTime(timestamp)

    return { success: true, timestamp }
  } catch (error) {
    console.error('增量备份保存失败:', error)
    return { success: false, timestamp: null }
  }
}

/**
 * 检查是否需要执行增量备份（距离上次备份超过30分钟）
 */
export function shouldIncrementalBackup(): boolean {
  const now = Date.now()
  return now - lastIncrementalBackupTime >= BACKUP_INTERVAL
}

// ===== 数据加载 =====

export async function loadFromLocalFile(): Promise<AppData | null> {
  try {
    if (!directoryHandle) {
      directoryHandle = await restoreDirectoryHandle()
    }

    if (directoryHandle) {
      try {
        const fileHandle = await directoryHandle.getFileHandle(MAIN_DATA_FILE)
        const file = await fileHandle.getFile()
        const content = await file.text()
        const data = JSON.parse(content) as AppData
        
        // 只在文件有有效数据时才更新 localStorage
        const projectCount = data.projects?.length || 0
        const recordCount = data.records?.length || 0
        console.log('[loadFromLocalFile] 文件数据:', { projects: projectCount, records: recordCount })
        
        if (projectCount > 0 || recordCount > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, content)
          console.log('[loadFromLocalFile] 文件有数据，已同步到 localStorage')
        } else {
          console.log('[loadFromLocalFile] 文件为空，不覆盖 localStorage')
        }

        if (data._backupTime) {
          setLastSaveTime(new Date(data._backupTime))
        } else {
          setLastSaveTime(new Date())
        }

        return data
      } catch (fileError) {
        console.log('[loadFromLocalFile] 本地文件不存在或读取失败')
      }
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      console.log('[loadFromLocalFile] 从 localStorage 返回数据')
      return JSON.parse(raw) as AppData
    }

    return null
  } catch (error) {
    console.error('[loadFromLocalFile] 加载失败:', error)
    return null
  }
}

// ===== 目录信息 =====

export function getCurrentSaveDirectory(): FileSystemDirectoryHandle | null {
  return directoryHandle
}

export function getCurrentSaveDirectoryName(): string {
  if (!directoryHandle) return ''
  try {
    return directoryHandle.name || ''
  } catch {
    return ''
  }
}

// ===== 打开文件夹 =====

export async function openSaveDirectory(): Promise<boolean> {
  if (!directoryHandle) {
    directoryHandle = await restoreDirectoryHandle()
  }

  if (directoryHandle) {
    try {
      const permission = await (directoryHandle as any).queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        const req = await (directoryHandle as any).requestPermission({ mode: 'readwrite' })
        if (req !== 'granted') return false
      }

      const fileHandle = await directoryHandle.getFileHandle(MAIN_DATA_FILE, { create: false })
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return true
    } catch (error) {
      console.error('打开文件夹失败:', error)
      return false
    }
  }
  return false
}

// ===== 导出/导入 =====

export async function exportToFile(data: AppData, suggestedName?: string): Promise<boolean> {
  try {
    if (!('showSaveFilePicker' in window)) {
      throw new Error('浏览器不支持文件保存')
    }
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: suggestedName || 'script-clerk-backup-' + new Date().toISOString().slice(0, 10) + '.json',
      types: [{
        description: 'JSON 文件',
        accept: { 'application/json': ['.json'] }
      }]
    })

    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    return true
  } catch (error) {
    console.error('导出文件失败:', error)
    return false
  }
}

export async function importFromFile(): Promise<AppData | null> {
  try {
    if (!('showOpenFilePicker' in window)) {
      throw new Error('浏览器不支持文件选择')
    }
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'JSON 文件',
        accept: { 'application/json': ['.json'] }
      }],
      multiple: false
    })

    const file = await fileHandle.getFile()
    const content = await file.text()
    return JSON.parse(content) as AppData
  } catch (error) {
    console.error('导入文件失败:', error)
    return null
  }
}

// ===== 清除 =====

export async function clearSaveDirectory(): Promise<void> {
  directoryHandle = null
  realtimeBackupFolderHandle = null
  incrementalBackupFolderHandle = null
  lastIncrementalBackupTime = 0
  localStorage.removeItem(SAVE_TIME_KEY)
  try {
    const db = await openDB()
    const transaction = db.transaction('handles', 'readwrite')
    const store = transaction.objectStore('handles')
    store.delete('saveDirectory')
    db.close()
  } catch (e) {
    // ignore
  }
}

// ===== 常量导出 =====
export { REALTIME_BACKUP_FOLDER, INCREMENTAL_BACKUP_FOLDER, MAIN_DATA_FILE, BACKUP_INTERVAL }
