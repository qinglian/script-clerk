import { ref } from 'vue'
import type { Project, ScriptRecord, Stats, AppData, CameraBinding, PresetItem } from '../types/script'

const STORAGE_KEY = 'script-clerk-data'

// 响应式数据缓存
const dataCache = ref<AppData | null>(null)

// ===== 数据读写 =====

function loadData(): AppData {
  if (dataCache.value) return dataCache.value
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      dataCache.value = JSON.parse(raw) as AppData
      return dataCache.value
    }
  } catch { /* ignore */ }
  const empty: AppData = { projects: [], records: [], currentProjectId: null }
  dataCache.value = empty
  return dataCache.value
}

function saveData(data: AppData): void {
  dataCache.value = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ===== 项目管理 =====

export function getProjects(): Project[] {
  return loadData().projects
}

export function addProject(name: string, director: string, scriptSupervisor: string): Project {
  const data = loadData()
  const project: Project = {
    id: generateId(),
    name,
    director,
    scriptSupervisor,
    cameraBindings: [],
    presets: [],
    createdAt: new Date().toISOString()
  }
  data.projects.push(project)
  data.currentProjectId = project.id
  saveData(data)
  return project
}

export function getCurrentProjectId(): string | null {
  return loadData().currentProjectId
}

export function setCurrentProject(id: string): void {
  const data = loadData()
  data.currentProjectId = id
  saveData(data)
}

export function getProjectName(projectId: string): string {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  return project?.name ?? ''
}

export function getProject(projectId: string): Project | undefined {
  return loadData().projects.find(p => p.id === projectId)
}

/**
 * 更新项目信息
 */
export function updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return null
  Object.assign(project, updates)
  saveData(data)
  return project
}

/**
 * 删除项目（同时删除相关记录）
 */
export function deleteProject(projectId: string): boolean {
  const data = loadData()
  const len = data.projects.length
  data.projects = data.projects.filter(p => p.id !== projectId)
  data.records = data.records.filter(r => r.projectId !== projectId)
  if (data.currentProjectId === projectId) {
    data.currentProjectId = data.projects[0]?.id ?? null
  }
  if (data.projects.length === len) return false
  saveData(data)
  return true
}

/**
 * 导出项目数据为 JSON
 */
export function exportProjectData(projectId: string): string {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return ''
  const records = data.records.filter(r => r.projectId === projectId)
  const exportData = {
    project,
    records,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }
  return JSON.stringify(exportData, null, 2)
}

/**
 * 导入项目数据
 */
export function importProjectData(jsonStr: string): Project | null {
  try {
    const importData = JSON.parse(jsonStr)
    if (!importData.project || !importData.project.name) return null
    
    const data = loadData()
    
    // 生成新 ID 避免冲突
    const newProjectId = generateId()
    const oldToNewRecordIds: Record<string, string> = {}
    
    // 创建新项目
    const newProject: Project = {
      ...importData.project,
      id: newProjectId,
      createdAt: new Date().toISOString()
    }
    data.projects.push(newProject)
    
    // 导入记录
    if (importData.records && Array.isArray(importData.records)) {
      for (const record of importData.records) {
        const newRecordId = generateId()
        oldToNewRecordIds[record.id] = newRecordId
        data.records.push({
          ...record,
          id: newRecordId,
          projectId: newProjectId,
          projectName: newProject.name
        })
      }
    }
    
    saveData(data)
    return newProject
  } catch {
    return null
  }
}

/**
 * 复制项目（包含所有记录）
 */
export function duplicateProject(projectId: string, newName: string): Project | null {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return null
  
  const newProjectId = generateId()
  const newProject: Project = {
    ...project,
    id: newProjectId,
    name: newName,
    createdAt: new Date().toISOString()
  }
  data.projects.push(newProject)
  
  // 复制记录
  const records = data.records.filter(r => r.projectId === projectId)
  for (const record of records) {
    data.records.push({
      ...record,
      id: generateId(),
      projectId: newProjectId,
      projectName: newName
    })
  }
  
  saveData(data)
  return newProject
}

/**
 * 导出所有项目数据（用于备份）
 */
export function exportAllData(): string {
  const data = loadData()
  return JSON.stringify({
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }, null, 2)
}

/**
 * 导入所有数据（用于恢复）
 */
export function importAllData(jsonStr: string): boolean {
  try {
    const importData = JSON.parse(jsonStr)
    if (!importData.projects || !Array.isArray(importData.projects)) return false
    
    const newData: AppData = {
      projects: importData.projects,
      records: importData.records || [],
      currentProjectId: importData.currentProjectId || null
    }
    saveData(newData)
    return true
  } catch {
    return false
  }
}

// ===== 机位绑定管理 =====

export function getCameraBindings(projectId: string): CameraBinding[] {
  const project = getProject(projectId)
  return project?.cameraBindings ?? []
}

export function addCameraBinding(projectId: string, binding: Omit<CameraBinding, 'id'>): CameraBinding {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  const newBinding: CameraBinding = { id: generateId(), ...binding }
  project.cameraBindings = project.cameraBindings ?? []
  project.cameraBindings.push(newBinding)
  saveData(data)
  return newBinding
}

export function updateCameraBinding(projectId: string, bindingId: string, updates: Partial<Omit<CameraBinding, 'id'>>): CameraBinding | null {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return null
  const idx = (project.cameraBindings ?? []).findIndex(b => b.id === bindingId)
  if (idx === -1) return null
  project.cameraBindings[idx] = { ...project.cameraBindings[idx], ...updates }
  saveData(data)
  return project.cameraBindings[idx]
}

/**
 * 为机位绑定添加新前缀
 */
export function addPrefixToBinding(projectId: string, bindingLabel: string, newPrefix: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const binding = (project.cameraBindings ?? []).find(b => b.label === bindingLabel)
  if (!binding) return false
  
  // 检查前缀是否已存在
  const prefixes = (binding.prefixes || '').split(',').map(s => s.trim()).filter(Boolean)
  if (prefixes.includes(newPrefix)) return false
  
  // 添加新前缀
  prefixes.push(newPrefix)
  binding.prefixes = prefixes.join(',')
  saveData(data)
  return true
}

export function removeCameraBinding(projectId: string, bindingId: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const len = project.cameraBindings?.length ?? 0
  project.cameraBindings = (project.cameraBindings ?? []).filter(b => b.id !== bindingId)
  if (project.cameraBindings.length === len) return false
  saveData(data)
  return true
}

// ===== 预设管理 =====

export function getPresets(projectId: string, category?: string): PresetItem[] {
  const project = getProject(projectId)
  const presets = project?.presets ?? []
  if (category) return presets.filter(p => p.category === category)
  return presets
}

export function addPreset(projectId: string, category: PresetItem['category'], value: string): PresetItem {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  const newPreset: PresetItem = { id: generateId(), category, value }
  project.presets = project.presets ?? []
  project.presets.push(newPreset)
  saveData(data)
  return newPreset
}

export function removePreset(projectId: string, presetId: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const len = project.presets?.length ?? 0
  project.presets = (project.presets ?? []).filter(p => p.id !== presetId)
  if (project.presets.length === len) return false
  saveData(data)
  return true
}

// ===== 场记记录管理 =====

export function getRecords(projectId: string | null): ScriptRecord[] {
  if (!projectId) return []
  const data = loadData()
  return data.records.filter(r => r.projectId === projectId)
}

/**
 * 自动计算下一条 takeCount：同 projectId + 场景号 + 镜号下的最大 takeCount + 1
 */
export function getNextTakeCount(projectId: string | null, sceneNumber: string, shotNumber: string): number {
  if (!projectId) return 1
  const data = loadData()
  const same = data.records.filter(
    r => r.projectId === projectId &&
      r.sceneNumber === sceneNumber &&
      r.shotNumber === shotNumber
  )
  if (same.length === 0) return 1
  return Math.max(...same.map(r => r.takeCount)) + 1
}

/**
 * 获取最近一条记录（用于新增记录时显示上一条摘要）
 */
export function getLastRecord(projectId: string | null): ScriptRecord | null {
  if (!projectId) return null
  const records = getRecords(projectId)
  if (records.length === 0) return null
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function addRecord(record: Partial<ScriptRecord> & { projectName: string; projectId: string }): ScriptRecord {
  const data = loadData()
  const now = new Date().toISOString()
  const newRecord: ScriptRecord = {
    id: generateId(),
    projectId: record.projectId,
    projectName: record.projectName,
    sceneNumber: record.sceneNumber ?? '',
    sceneType: record.sceneType ?? 'int',
    timeOfDay: record.timeOfDay ?? 'day',
    sceneDesc: record.sceneDesc ?? '',
    shotNumber: record.shotNumber ?? '',
    takeCount: record.takeCount ?? 1,
    status: record.status ?? 'passed',
    soundType: record.soundType ?? 'none',
    directorNote: record.directorNote ?? '',
    cameraNote: record.cameraNote ?? '',
    note: record.note ?? '',
    actors: record.actors ?? '',
    date: record.date ?? '',
    startTime: record.startTime ?? '',
    endTime: record.endTime ?? '',
    equipment: record.equipment ?? [],
    createdAt: now,
    updatedAt: now
  }
  data.records.push(newRecord)
  saveData(data)
  return newRecord
}

export function updateRecord(id: string, updates: Partial<ScriptRecord>): ScriptRecord | null {
  const data = loadData()
  const index = data.records.findIndex(r => r.id === id)
  if (index === -1) return null
  data.records[index] = {
    ...data.records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  saveData(data)
  return data.records[index]
}

export function deleteRecord(id: string): boolean {
  const data = loadData()
  const len = data.records.length
  data.records = data.records.filter(r => r.id !== id)
  if (data.records.length === len) return false
  saveData(data)
  return true
}

// ===== 文件编码实时生成 =====

/**
 * 文件名自动补零为三位，如 1→001, 12→012, 001→001
 */
export function padFileName(name: string): string {
  if (!name) return ''
  // 如果已经是纯数字，补零到3位
  if (/^\d+$/.test(name)) {
    return name.padStart(3, '0')
  }
  // 非纯数字原样返回
  return name
}

/**
 * 实时生成文件编码。格式：{设备字母}-{文件名前缀}{文件名}
 * 设备字母：同类型设备中的顺序 A/B/C...
 * 文件名前缀：用户勾选的机位绑定前缀
 * 文件名：用户输入，自动补零
 * 例：A-C001（设备字母A + 前缀C + 文件名001）
 */
export function generateFileCode(
  deviceLetter: string,
  prefix: string,
  fileName: string
): string {
  const padded = padFileName(fileName)
  return `${deviceLetter}-${prefix}${padded}`
}

/**
 * 根据设备在列表中的顺序计算字母（A、B、C...）
 */
export function calcDeviceLetter(_type: 'camera' | 'audio', index: number): string {
  return String.fromCharCode(65 + index) // A=65, B=66...
}

// ===== 统计 =====

export function getStats(projectId: string | null): Stats | null {
  if (!projectId) return null
  const records = getRecords(projectId)
  if (records.length === 0) {
    return { totalScenes: 0, totalShots: 0, totalTakes: 0, passed: 0, ng: 0, retake: 0, totalCameras: 0, totalAudioDevices: 0, osCount: 0, voCount: 0 }
  }

  const scenes = new Set(records.map(r => r.sceneNumber))
  let totalCameras = 0
  let totalAudioDevices = 0
  for (const r of records) {
    for (const eq of (r.equipment ?? [])) {
      if (eq.type === 'camera') totalCameras++
      else totalAudioDevices++
    }
  }

  return {
    totalScenes: scenes.size,
    totalShots: records.length,
    totalTakes: records.reduce((sum, r) => sum + r.takeCount, 0),
    passed: records.filter(r => r.status === 'passed').length,
    ng: records.filter(r => r.status === 'ng').length,
    retake: records.filter(r => r.status === 'retake').length,
    totalCameras,
    totalAudioDevices,
    osCount: records.filter(r => r.soundType === 'os').length,
    voCount: records.filter(r => r.soundType === 'vo').length,
  }
}

// ===== 导出 =====

export function exportToMarkdown(projectId: string): string {
  const records = getRecords(projectId)
  const name = getProjectName(projectId)

  let md = `# ${name} - 场记单\n\n`
  md += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`

  md += `## 统计\n\n`
  const stats = getStats(projectId)
  if (stats) {
    md += `- 总场景数：${stats.totalScenes}\n`
    md += `- 总镜头数：${stats.totalShots}\n`
    md += `- 总条数：${stats.totalTakes}\n`
    md += `- 通过：${stats.passed} / NG：${stats.ng} / 补拍：${stats.retake}\n`
    md += `- OS：${stats.osCount} / VO：${stats.voCount}\n`
    md += `- 摄像机文件：${stats.totalCameras} 个\n`
    md += `- 录音文件：${stats.totalAudioDevices} 个\n\n`
  }

  // 计算最大设备数
  const maxDevices = Math.max(...records.map(r => r.equipment?.length || 0), 0)
  
  // 动态生成设备列表头
  const deviceHeaders = Array.from({ length: maxDevices }, (_, i) => `设备${i + 1}`)
  
  md += `## 记录\n\n`
  md += `| 场景 | 类型 | 镜号 | 条数 | 状态 | 声音 | 演员 | 日期 | ${deviceHeaders.join(' | ')} | 导演备注 |\n`
  md += `|------|------|------|------|------|------|------|------|${deviceHeaders.map(() => '------').join('|')}|----------|\n`

  for (const r of records) {
    const sceneLabel = r.sceneType === 'int' ? '内景' : '外景'
    const timeLabel = r.timeOfDay === 'day' ? '日' : '夜'
    const statusLabel = r.status === 'passed' ? '✅通过' : r.status === 'ng' ? '❌NG' : '🔄补拍'
    const soundLabel = r.soundType === 'os' ? 'OS' : r.soundType === 'vo' ? 'VO' : ''

    // 每个设备独立一列
    const deviceCols = Array.from({ length: maxDevices }, (_, i) => {
      const eq = r.equipment?.[i]
      if (!eq) return '-'
      const icon = eq.type === 'camera' ? '🎥' : '🎤'
      return `${icon}${eq.fileCode}`
    })

    md += `| ${r.sceneNumber} | ${sceneLabel}${timeLabel} | ${r.shotNumber} | ${r.takeCount} | ${statusLabel} | ${soundLabel} | ${r.actors} | ${r.date} | ${deviceCols.join(' | ')} | ${r.directorNote} |\n`
  }

  return md
}

export function exportToCSV(projectId: string): string {
  const records = getRecords(projectId)
  const BOM = '\uFEFF'

  // 计算最大设备数
  const maxDevices = Math.max(...records.map(r => r.equipment?.length || 0), 0)
  
  // 动态生成设备列表头
  const deviceHeaders = Array.from({ length: maxDevices }, (_, i) => `设备${i + 1}`)
  
  const header = `场景号,类型,镜号,条数,状态,声音类型,演员,日期,开始时间,结束时间,${deviceHeaders.join(',')},导演备注,摄影备注,场记备注\n`

  const rows: string[] = []
  for (const r of records) {
    const sceneLabel = r.sceneType === 'int' ? '内景' : '外景'
    const timeLabel = r.timeOfDay === 'day' ? '日' : '夜'
    const statusLabel = r.status === 'passed' ? '通过' : r.status === 'ng' ? 'NG' : '补拍'
    const soundLabel = r.soundType === 'os' ? 'OS' : r.soundType === 'vo' ? 'VO' : ''

    // 每个设备独立一列
    const deviceCols = Array.from({ length: maxDevices }, (_, i) => {
      const eq = r.equipment?.[i]
      if (!eq) return '-'
      const icon = eq.type === 'camera' ? '🎥' : '🎤'
      return `${icon}${eq.fileCode}`
    })

    const fields = [
      r.sceneNumber,
      `${sceneLabel}${timeLabel}`,
      r.shotNumber,
      r.takeCount,
      statusLabel,
      soundLabel,
      r.actors,
      r.date,
      r.startTime,
      r.endTime,
      ...deviceCols,
      r.directorNote,
      r.cameraNote,
      r.note
    ]
    rows.push(fields.map(f => `"${(f ?? '').toString().replace(/"/g, '""')}"`).join(','))
  }

  return BOM + header + rows.join('\n')
}

// ===== Store 对象（兼容 Pinia 风格调用）=====

export function useScriptStore() {
  return {
    projects: getProjects(),
    getProjects,
    addProject,
    getCurrentProjectId,
    setCurrentProject,
    getProjectName,
    getProject,
    getCameraBindings,
    addCameraBinding,
    updateCameraBinding,
    removeCameraBinding,
    getPresets,
    addPreset,
    removePreset,
    getRecords,
    getRecordsByProject: getRecords, // 别名
    getNextTakeCount,
    getLastRecord,
    addRecord,
    updateRecord,
    deleteRecord,
    padFileName,
    generateFileCode,
    calcDeviceLetter,
    getStats,
    exportToMarkdown,
    exportToCSV,
  }
}

// ===== 工具函数 =====

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}