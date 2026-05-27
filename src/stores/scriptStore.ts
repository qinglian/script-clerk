import { ref } from 'vue'
import {
  isFileSystemAccessSupported,
  saveRealtime,
  saveIncremental,
  loadFromLocalFile,
  restoreDirectoryHandle,
} from './fileStorage'
import type { Project, ScriptRecord, Stats, AppData, CameraBinding, PresetItem } from '../types/script'

const STORAGE_KEY = 'script-clerk-data'

// 响应式数据缓存
const fileSystemAvailable = ref(false)
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

/**
 * 保存数据 - 同时执行实时备份和增量备份
 * @param data 全量应用数据
 * @param projectId 当前操作的项目ID（用于实时备份）
 * @param forceIncremental 是否强制执行增量备份
 */
async function saveDataWithBackup(
  data: AppData,
  projectId?: string
): Promise<void> {
  // 更新缓存
  dataCache.value = data
  
  // 保存到 localStorage（可能失败，不影响后续文件保存）
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('[saveData] 数据已保存到 localStorage')
  } catch (e) {
    console.warn('[saveData] localStorage 保存失败（可能已满），文件备份仍会继续执行')
  }

  // 执行实时备份（针对特定项目）
  if (projectId) {
    const project = data.projects.find(p => p.id === projectId)
    if (project) {
      const projectRecords = data.records.filter(r => r.projectId === projectId)
      await saveRealtime(projectId, { project, records: projectRecords })
    }
  }

  // 执行增量备份（全量数据）- 每次都保存到主文件
  await saveIncremental(data)
}

/**
 * 同步版本的数据保存（用于非异步上下文）
 */
function saveData(data: AppData, projectId?: string): void {
  // 更新缓存和 localStorage
  dataCache.value = data
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('[saveData] 数据已保存到 localStorage，项目数:', data.projects?.length || 0, '记录数:', data.records?.length || 0)
  } catch (e) {
    console.error('[saveData] localStorage 保存失败:', e)
  }

  // 异步执行备份
  saveDataWithBackup(data, projectId).then(() => {
    fileSystemAvailable.value = true
  }).catch(() => {
    fileSystemAvailable.value = false
  })
}

// ===== 项目管理 =====

export async function initStorage(): Promise<void> {
  // 1. 首先尝试从 localStorage 加载（最快，最可靠）
  let localData: AppData | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      localData = JSON.parse(raw) as AppData
      console.log('[Storage] 从 localStorage 读取原始数据，项目数:', localData?.projects?.length || 0)
    }
  } catch (e) {
    console.error('[Storage] localStorage 读取失败:', e)
  }
  
  // 2. 尝试恢复文件系统目录句柄并加载文件数据
  await restoreDirectoryHandle()
  const fileData = await loadFromLocalFile()
  
  if (fileData) {
    // 文件数据存在，检查是否需要合并
    const fileProjectCount = fileData.projects?.length || 0
    const localProjectCount = localData?.projects?.length || 0
    
    if (fileProjectCount > 0 || localProjectCount === 0) {
      // 文件有数据，或两者都为空，使用文件数据
      dataCache.value = fileData
      fileSystemAvailable.value = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData))
      console.log('[Storage] 使用文件数据，项目数:', fileProjectCount)
    } else {
      // localStorage 有数据但文件为空，使用 localStorage 数据
      dataCache.value = localData
      fileSystemAvailable.value = true
      console.log('[Storage] 文件为空，使用 localStorage 数据，项目数:', localProjectCount)
    }
  } else if (localData && (localData.projects?.length > 0 || localData.records?.length > 0)) {
    // 3. 没有文件数据，但 localStorage 有数据
    dataCache.value = localData
    console.log('[Storage] 无文件数据，使用 localStorage 数据，项目数:', localData.projects?.length || 0)
  } else {
    // 4. 都没有数据
    dataCache.value = null
    console.log('[Storage] 无历史数据，初始化为空')
  }
}

export function isFileSystemAvailable(): boolean {
  return isFileSystemAccessSupported()
}

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
  // 新建项目时强制执行增量备份
  saveData(data, project.id)
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

export function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Project | null {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return null
  Object.assign(project, updates)
  saveData(data, projectId)
  return project
}

/**
 * 删除项目（只从内存中删除，不删除备份文件）
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
  // 删除项目时强制执行增量备份
  saveData(data)
  return true
}

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

export function importProjectData(jsonStr: string): Project | null {
  try {
    const importData = JSON.parse(jsonStr)
    if (!importData.project || !importData.project.name) return null

    const data = loadData()
    const newProjectId = generateId()

    const newProject: Project = {
      ...importData.project,
      id: newProjectId,
      createdAt: new Date().toISOString()
    }
    data.projects.push(newProject)

    if (importData.records && Array.isArray(importData.records)) {
      for (const record of importData.records) {
        const newRecordId = generateId()
        data.records.push({
          ...record,
          id: newRecordId,
          projectId: newProjectId,
          projectName: newProject.name
        })
      }
    }

    saveData(data, newProjectId)
    return newProject
  } catch {
    return null
  }
}

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

  const records = data.records.filter(r => r.projectId === projectId)
  for (const record of records) {
    data.records.push({
      ...record,
      id: generateId(),
      projectId: newProjectId,
      projectName: newName
    })
  }

  saveData(data, newProjectId)
  return newProject
}

export function exportAllData(): string {
  const data = loadData()
  return JSON.stringify({
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }, null, 2)
}

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

export function addCameraBinding(
  projectId: string,
  binding: Omit<CameraBinding, 'id'>
): CameraBinding {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  const newBinding: CameraBinding = { id: generateId(), ...binding }
  project.cameraBindings = project.cameraBindings ?? []
  project.cameraBindings.push(newBinding)
  saveData(data, projectId)
  return newBinding
}

export function updateCameraBinding(
  projectId: string,
  bindingId: string,
  updates: Partial<Omit<CameraBinding, 'id'>>
): CameraBinding | null {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return null
  const idx = (project.cameraBindings ?? []).findIndex(b => b.id === bindingId)
  if (idx === -1) return null
  project.cameraBindings[idx] = { ...project.cameraBindings[idx], ...updates }
  saveData(data, projectId)
  return project.cameraBindings[idx]
}

export function addPrefixToBinding(projectId: string, bindingLabel: string, newPrefix: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const binding = (project.cameraBindings ?? []).find(b => b.label === bindingLabel)
  if (!binding) return false

  const prefixes = (binding.prefixes || '').split(',').map(s => s.trim()).filter(Boolean)
  if (prefixes.includes(newPrefix)) return false

  prefixes.push(newPrefix)
  binding.prefixes = prefixes.join(',')
  saveData(data, projectId)
  return true
}

export function removeCameraBinding(projectId: string, bindingId: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const len = project.cameraBindings?.length ?? 0
  project.cameraBindings = (project.cameraBindings ?? []).filter(b => b.id !== bindingId)
  if (project.cameraBindings.length === len) return false
  saveData(data, projectId)
  return true
}

// ===== 预设管理 =====

export function getPresets(projectId: string, category?: string): PresetItem[] {
  const project = getProject(projectId)
  const presets = project?.presets ?? []
  if (category) return presets.filter(p => p.category === category)
  return presets
}

export function addPreset(
  projectId: string,
  category: PresetItem['category'],
  value: string
): PresetItem {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  const newPreset: PresetItem = { id: generateId(), category, value }
  project.presets = project.presets ?? []
  project.presets.push(newPreset)
  saveData(data, projectId)
  return newPreset
}

export function removePreset(projectId: string, presetId: string): boolean {
  const data = loadData()
  const project = data.projects.find(p => p.id === projectId)
  if (!project) return false
  const len = project.presets?.length ?? 0
  project.presets = (project.presets ?? []).filter(p => p.id !== presetId)
  if (project.presets.length === len) return false
  saveData(data, projectId)
  return true
}

// ===== 场记记录管理 =====

export function getRecords(projectId: string | null): ScriptRecord[] {
  if (!projectId) return []
  const data = loadData()
  return data.records.filter(r => r.projectId === projectId)
}

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

export function getLastRecord(projectId: string | null): ScriptRecord | null {
  if (!projectId) return null
  const records = getRecords(projectId)
  if (records.length === 0) return null
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function addRecord(
  record: Partial<ScriptRecord> & { projectName: string; projectId: string }
): ScriptRecord {
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
  saveData(data, record.projectId)
  return newRecord
}

export function updateRecord(id: string, updates: Partial<ScriptRecord>): ScriptRecord | null {
  const data = loadData()
  const index = data.records.findIndex(r => r.id === id)
  if (index === -1) return null
  const projectId = data.records[index].projectId
  data.records[index] = {
    ...data.records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  saveData(data, projectId)
  return data.records[index]
}

export function deleteRecord(id: string): boolean {
  const data = loadData()
  const record = data.records.find(r => r.id === id)
  if (!record) return false
  const projectId = record.projectId
  const len = data.records.length
  data.records = data.records.filter(r => r.id !== id)
  if (data.records.length === len) return false
  saveData(data, projectId)
  return true
}

// ===== 文件编码实时生成 =====

export function padFileName(name: string): string {
  if (!name) return ''
  if (/^\d+$/.test(name)) {
    return name.padStart(3, '0')
  }
  return name
}

export function generateFileCode(
  deviceLetter: string,
  prefix: string,
  fileName: string
): string {
  const padded = padFileName(fileName)
  return `${deviceLetter}-${prefix}${padded}`
}

export function calcDeviceLetter(_type: 'camera' | 'audio', index: number): string {
  return String.fromCharCode(65 + index)
}

// ===== 统计 =====

export function getStats(projectId: string | null): Stats | null {
  if (!projectId) return null
  const records = getRecords(projectId)
  if (records.length === 0) {
    return {
      totalScenes: 0,
      totalShots: 0,
      totalTakes: 0,
      passed: 0,
      ng: 0,
      retake: 0,
      totalCameras: 0,
      totalAudioDevices: 0,
      osCount: 0,
      voCount: 0
    }
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
  const project = getProject(projectId)
  const name = getProjectName(projectId)

  let md = `# ${name} - 场记单\n\n`
  md += `导演：${project?.director || '-'} | 场记：${project?.scriptSupervisor || '-'}\n\n`
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

  const bindings = project?.cameraBindings || []

  const deviceHeaders = bindings.map(b => b.label || `设备${bindings.indexOf(b) + 1}`)
  md += `## 记录\n\n`
  md += `| 场景 | 类型 | 镜号 | 条数 | 状态 | 声音 | 演员 | 日期 | ${deviceHeaders.join(' | ')} | 导演备注 |\n`
  md += `|------|------|------|------|------|------|------|------|${deviceHeaders.map(() => '------').join('|')}|----------|\n`

  for (const r of records) {
    const sceneLabel = r.sceneType === 'int' ? '内景' : '外景'
    const timeLabel = r.timeOfDay === 'day' ? '日' : '夜'
    const statusLabel = r.status === 'passed' ? '通过' : r.status === 'ng' ? 'NG' : '补拍'
    const soundLabel = r.soundType === 'os' ? 'OS' : r.soundType === 'vo' ? 'VO' : ''

    const deviceCols = bindings.map(binding => {
      const eq = r.equipment?.find(e => e.label === binding.label)
      if (!eq || !eq.enabled) return ''
      return eq.fileCode
    })

    md += `| ${r.sceneNumber} | ${sceneLabel}${timeLabel} | ${r.shotNumber} | ${r.takeCount} | ${statusLabel} | ${soundLabel} | ${r.actors} | ${r.date} | ${deviceCols.join(' | ')} | ${r.directorNote} |\n`
  }

  return md
}

export function exportToCSV(projectId: string): string {
  const records = getRecords(projectId)
  const BOM = '\uFEFF'

  const project = getProject(projectId)
  const bindings = project?.cameraBindings || []

  // Get fixed device columns from project bindings - use binding label as column header
  const deviceHeaders = bindings.map(b => b.label || `设备${bindings.indexOf(b) + 1}`)
  const totalCols = 10 + deviceHeaders.length + 3 // fixed cols + device cols + note cols
  const projectName = project?.name || '未命名项目'
  const director = project?.director || ''
  const scriptSupervisor = project?.scriptSupervisor || ''
  const emptyCols = Array(totalCols - 3).fill('').join(',')
  const projectInfoRow = `"项目名称","${projectName}","导演：","${director}","场记：","${scriptSupervisor}",${emptyCols}\n`
  const header = `场景号,类型,镜号,条数,状态,声音类型,演员,日期,开始时间,结束时间,${deviceHeaders.join(',')},导演备注,摄影备注,场记备注\n`

  const rows: string[] = []
  for (const r of records) {
    const sceneLabel = r.sceneType === 'int' ? '内景' : '外景'
    const timeLabel = r.timeOfDay === 'day' ? '日' : '夜'
    const statusLabel = r.status === 'passed' ? '通过' : r.status === 'ng' ? 'NG' : '补拍'
    const soundLabel = r.soundType === 'os' ? 'OS' : r.soundType === 'vo' ? 'VO' : ''

    const deviceCols = bindings.map(binding => {
      const eq = r.equipment?.find(e => e.label === binding.label)
      if (!eq || !eq.enabled) return ''
      return eq.fileCode
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

  return BOM + projectInfoRow + header + rows.join('\n')
}

export function exportToExcel(projectId: string): Blob {
  const csvContent = exportToCSV(projectId)
  return new Blob(['\uFEFF' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
}

export function exportToPDF(projectId: string): string {
  const records = getRecords(projectId)
  const project = getProject(projectId)
  const projectName = project?.name ?? '未命名项目'
  const stats = getStats(projectId)

  const pdfBindings = project?.cameraBindings || []
  const maxDevices = pdfBindings.length

  const deviceColDefs: { title: string; type: string; label: string }[] = []
  for (let i = 0; i < maxDevices; i++) {
    const b = pdfBindings[i]
    let deviceTitle = `设备${i + 1}`
    if (b?.type === 'camera') deviceTitle = `摄像机${i + 1}`
    else if (b?.type === 'audio') deviceTitle = `录音机${i + 1}`
    deviceColDefs.push({ title: deviceTitle, type: b?.type || 'camera', label: b?.label || '' })
  }

  const deviceColCSS = deviceColDefs.map((_, i) => `.device-col-${i} { width: 100px; }`).join('\n    ')

  const deviceToggleBtns = deviceColDefs.map((d, i) =>
    `          <button class="toggle-btn active" onclick="toggleCol('device-col-${i}', this)">${d.title}</button>`
  ).join('\n')

  const deviceThHTML = deviceColDefs.map((d, i) =>
    `          <th class="device-col-${i}">${d.title}</th>`
  ).join('\n')

  function buildDeviceTdHTML(r: ScriptRecord): string {
    return deviceColDefs.map((_d, i) => {
      const binding = pdfBindings[i]
      const eq = binding ? r.equipment?.find(e => e.label === binding.label) : null
      if (eq && eq.enabled) {
        const deviceClass = eq.type === 'camera' ? 'device-camera' : 'device-audio'
        let deviceInfo = `<span class="${deviceClass}">${eq.fileCode}</span>`
        let extras = []
        if (eq.shotSize) extras.push(eq.shotSize)
        if (eq.changeCard) extras.push('换卡')
        if (extras.length > 0) deviceInfo += `<small>(${extras.join(',')})</small>`
        return `          <td class="device-col-${i}">${deviceInfo}</td>`
      } else {
        return `          <td class="device-col-${i}"></td>`
      }
    }).join('\n')
  }

  const rowsHTML = records.map(r => {
    const sceneLabel = r.sceneType === 'int' ? '内景' : '外景'
    const timeLabel = r.timeOfDay === 'day' ? '日' : '夜'
    const statusClass = r.status === 'passed' ? 'status-passed' : r.status === 'ng' ? 'status-ng' : 'status-retake'
    const statusText = r.status === 'passed' ? '通过' : r.status === 'ng' ? 'NG' : '补拍'
    const soundText = r.soundType === 'os' ? 'OS' : r.soundType === 'vo' ? 'VO' : ''

    return `      <tr>
        <td class="scene-col">${r.sceneNumber}</td>
        <td class="type-col">${sceneLabel}${timeLabel}</td>
        <td class="shot-col">${r.shotNumber}</td>
        <td class="take-col">${r.takeCount}</td>
        <td class="status-col ${statusClass}">${statusText}</td>
        <td class="sound-col">${soundText}</td>
        <td class="actors-col">${r.actors || '-'}</td>
        <td class="date-col">${r.date || '-'}</td>
        <td class="time-col">${r.startTime || ''}${r.endTime ? '-' + r.endTime : ''}</td>
${buildDeviceTdHTML(r)}
        <td class="note-col-director">${r.directorNote || '-'}</td>
        <td class="note-col-camera">${r.cameraNote || '-'}</td>
        <td class="note-col-clerk">${r.note || '-'}</td>
      </tr>`
  }).join('\n')

  const statsHTML = stats ? `
  <div class="stats" id="statsArea">
    <div class="stat-item"><span class="stat-label">总场景数：</span><span class="stat-value">${stats.totalScenes}</span></div>
    <div class="stat-item"><span class="stat-label">总镜头数：</span><span class="stat-value">${stats.totalShots}</span></div>
    <div class="stat-item"><span class="stat-label">总条数：</span><span class="stat-value">${stats.totalTakes}</span></div>
    <div class="stat-item"><span class="stat-label">通过：</span><span class="stat-value status-passed">${stats.passed}</span></div>
    <div class="stat-item"><span class="stat-label">NG：</span><span class="stat-value status-ng">${stats.ng}</span></div>
    <div class="stat-item"><span class="stat-label">补拍：</span><span class="stat-value status-retake">${stats.retake}</span></div>
    <div class="stat-item"><span class="stat-label">OS：</span><span class="stat-value">${stats.osCount}</span></div>
    <div class="stat-item"><span class="stat-label">VO：</span><span class="stat-value">${stats.voCount}</span></div>
  </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${projectName} - 场记单</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", "Microsoft YaHei", sans-serif; margin: 0; padding: 20px; font-size: 12px; line-height: 1.5; color: #333; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: bold; }
    .header .meta { color: #666; font-size: 11px; }
    .stats { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
    .stat-item { display: flex; align-items: center; gap: 5px; }
    .stat-label { color: #666; font-size: 11px; }
    .stat-value { font-weight: bold; font-size: 14px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: auto; }
    thead th { font-size: 11px; background: #e8e8e8; font-weight: bold; }
    tbody { font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; vertical-align: middle; }
    tr:nth-child(even) { background: #fafafa; }
    .scene-col, .type-col, .shot-col, .take-col, .status-col, .sound-col, 
    .actors-col, .date-col, .time-col {
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scene-col { min-width: 50px; }
    .type-col { min-width: 45px; }
    .shot-col { min-width: 45px; }
    .take-col { min-width: 35px; }
    .status-col { min-width: 45px; }
    .sound-col { min-width: 35px; }
    .actors-col { min-width: 70px; }
    .date-col { min-width: 65px; }
    .time-col { min-width: 55px; }
    ${deviceColCSS}
    .device-col-0, .device-col-1, .device-col-2, .device-col-3, .device-col-4,
    .device-col-5, .device-col-6, .device-col-7, .device-col-8, .device-col-9 { 
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 80px;
    }
    .note-col-director, .note-col-camera, .note-col-clerk { 
      min-width: 80px; 
      white-space: normal;
      text-align: left;
      vertical-align: top;
    }
    .status-passed { color: #67c23a; font-weight: bold; }
    .status-ng { color: #f56c6c; font-weight: bold; }
    .status-retake { color: #e6a23c; font-weight: bold; }
    .device-camera { color: #409eff; }
    .device-audio { color: #67c23a; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; padding-top: 15px; border-top: 1px solid #ddd; }
    .control-panel { background: #f0f2f5; border: 1px solid #dcdfe6; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .control-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #e9ecef; cursor: pointer; user-select: none; transition: background 0.2s; }
    .control-panel-header:hover { background: #dde1e6; }
    .control-panel-header h3 { margin: 0; font-size: 14px; color: #303133; }
    .control-panel-header .arrow { font-size: 12px; color: #606266; transition: transform 0.3s; }
    .control-panel-header .arrow.collapsed { transform: rotate(-90deg); }
    .control-panel-body { padding: 16px; }
    .control-panel-body.collapsed { display: none; }
    .control-section { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #e4e7ed; }
    .control-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .control-section-title { font-size: 12px; font-weight: bold; color: #606266; margin-bottom: 8px; }
    .control-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
    .control-row:last-child { margin-bottom: 0; }
    .control-row label { font-size: 11px; color: #606266; min-width: 80px; }
    .control-row input[type="range"] { width: 120px; cursor: pointer; vertical-align: middle; }
    .control-row input[type="color"] { width: 32px; height: 24px; cursor: pointer; border: 1px solid #ccc; border-radius: 2px; padding: 0; vertical-align: middle; }
    .control-row .size-val { font-size: 11px; color: #909399; min-width: 35px; text-align: center; }
    .toggle-btn { font-size: 11px; padding: 4px 10px; border: 1px solid #dcdfe6; border-radius: 4px; cursor: pointer; background: #fff; color: #606266; transition: all 0.2s; white-space: nowrap; }
    .toggle-btn.active { background: #409eff; color: #fff; border-color: #409eff; }
    .toggle-btn:hover { border-color: #409eff; color: #409eff; }
    .toggle-btn.active:hover { background: #66b1ff; border-color: #66b1ff; color: #fff; }
    .col-hidden { display: none !important; }
    @media print {
      body { padding: 10px; }
      .no-print { display: none !important; }
      th { background: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr:nth-child(even) { background: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .col-hidden { display: none !important; }
      .status-passed, .status-ng, .status-retake { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .device-camera, .device-audio { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="no-print control-panel" id="controlPanel">
    <div class="control-panel-header" onclick="togglePanel()">
      <h3>打印设置</h3>
      <span class="arrow" id="panelArrow">&#9660;</span>
    </div>
    <div class="control-panel-body" id="panelBody">
      <div class="control-section">
        <div class="control-section-title">列显示/隐藏</div>
        <div class="control-row">
          <button class="toggle-btn active" onclick="toggleCol('scene-col', this)">场景</button>
          <button class="toggle-btn active" onclick="toggleCol('type-col', this)">类型</button>
          <button class="toggle-btn active" onclick="toggleCol('shot-col', this)">镜号</button>
          <button class="toggle-btn active" onclick="toggleCol('take-col', this)">条数</button>
          <button class="toggle-btn active" onclick="toggleCol('status-col', this)">状态</button>
          <button class="toggle-btn active" onclick="toggleCol('sound-col', this)">声音</button>
          <button class="toggle-btn active" onclick="toggleCol('actors-col', this)">演员</button>
          <button class="toggle-btn active" onclick="toggleCol('date-col', this)">日期</button>
          <button class="toggle-btn active" onclick="toggleCol('time-col', this)">时间</button>
${deviceToggleBtns}
          <button class="toggle-btn active" onclick="toggleCol('note-col-director', this)">导演备注</button>
          <button class="toggle-btn active" onclick="toggleCol('note-col-camera', this)">摄影备注</button>
          <button class="toggle-btn active" onclick="toggleCol('note-col-clerk', this)">场记备注</button>
        </div>
      </div>
      <div class="control-section">
        <div class="control-section-title">字体大小</div>
        <div class="control-row">
          <label>表格字体：</label>
          <input type="range" min="8" max="20" value="11" id="tableFontSize" oninput="updateTableFontSize(this.value)">
          <span class="size-val" id="tableFontSizeVal">11px</span>
        </div>
        <div class="control-row">
          <label>设备编码：</label>
          <input type="range" min="6" max="18" value="10" id="deviceFontSize" oninput="updateDeviceFontSize(this.value)">
          <span class="size-val" id="deviceFontSizeVal">10px</span>
        </div>
        <div class="control-row">
          <label>备注字体：</label>
          <input type="range" min="6" max="16" value="10" id="noteFontSize" oninput="updateNoteFontSize(this.value)">
          <span class="size-val" id="noteFontSizeVal">10px</span>
        </div>
      </div>
      <div class="control-section">
        <div class="control-section-title">颜色设置</div>
        <div class="control-row">
          <label>摄像机编码：</label>
          <input type="color" value="#409eff" id="cameraColor" oninput="updateColor('device-camera', this.value)">
        </div>
        <div class="control-row">
          <label>录音机编码：</label>
          <input type="color" value="#67c23a" id="audioColor" oninput="updateColor('device-audio', this.value)">
        </div>
        <div class="control-row">
          <label>通过状态：</label>
          <input type="color" value="#67c23a" id="passedColor" oninput="updateColor('status-passed', this.value)">
        </div>
        <div class="control-row">
          <label>NG状态：</label>
          <input type="color" value="#f56c6c" id="ngColor" oninput="updateColor('status-ng', this.value)">
        </div>
        <div class="control-row">
          <label>补拍状态：</label>
          <input type="color" value="#e6a23c" id="retakeColor" oninput="updateColor('status-retake', this.value)">
        </div>
      </div>
      <div class="control-section">
        <div class="control-section-title">其他</div>
        <div class="control-row">
          <button class="toggle-btn active" onclick="toggleStats(this)">统计区域</button>
        </div>
      </div>
    </div>
  </div>
  <div class="header">
    <h1>${projectName} - 场记单</h1>
    <div class="meta">导演：${project?.director || '-'} | 场记：${project?.scriptSupervisor || '-'} | 导出时间：${new Date().toLocaleString('zh-CN')}</div>
  </div>
${statsHTML}
  <table id="dataTable">
    <thead>
      <tr>
        <th class="scene-col">场景</th>
        <th class="type-col">类型</th>
        <th class="shot-col">镜号</th>
        <th class="take-col">条数</th>
        <th class="status-col">状态</th>
        <th class="sound-col">声音</th>
        <th class="actors-col">演员</th>
        <th class="date-col">日期</th>
        <th class="time-col">时间</th>
${deviceThHTML}
        <th class="note-col-director">导演备注</th>
        <th class="note-col-camera">摄影备注</th>
        <th class="note-col-clerk">场记备注</th>
      </tr>
    </thead>
    <tbody>
${rowsHTML}
    </tbody>
  </table>
  <div class="footer">共 ${records.length} 条记录 | 由 Script Clerk 生成</div>
  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 14px; cursor: pointer; background: #409eff; color: white; border: none; border-radius: 4px;">打印 / 另存为 PDF</button>
    <p style="color: #666; font-size: 11px; margin-top: 10px;">提示：点击按钮后，在打印对话框中选择"另存为 PDF"即可导出 PDF 文件</p>
  </div>
  <script>
    function togglePanel() {
      var body = document.getElementById('panelBody');
      var arrow = document.getElementById('panelArrow');
      if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        arrow.classList.remove('collapsed');
      } else {
        body.classList.add('collapsed');
        arrow.classList.add('collapsed');
      }
    }
    function toggleCol(colClass, btn) {
      var els = document.querySelectorAll('.' + colClass);
      var isHidden = false;
      els.forEach(function(el) {
        if (el.classList.contains('col-hidden')) {
          el.classList.remove('col-hidden');
        } else {
          el.classList.add('col-hidden');
          isHidden = true;
        }
      });
      if (isHidden) {
        btn.classList.remove('active');
      } else {
        btn.classList.add('active');
      }
    }
    function updateTableFontSize(val) {
      var tbody = document.querySelector('#dataTable tbody');
      if (tbody) tbody.style.fontSize = val + 'px';
      document.getElementById('tableFontSizeVal').textContent = val + 'px';
    }
    function updateDeviceFontSize(val) {
      var style = document.getElementById('dynamicDeviceStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'dynamicDeviceStyle';
        document.head.appendChild(style);
      }
      style.textContent = 'tbody .device-col-0, tbody .device-col-1, tbody .device-col-2, tbody .device-col-3, tbody .device-col-4, tbody .device-col-5, tbody .device-col-6, tbody .device-col-7, tbody .device-col-8, tbody .device-col-9 { font-size: ' + val + 'px !important; }';
      document.getElementById('deviceFontSizeVal').textContent = val + 'px';
    }
    function updateNoteFontSize(val) {
      var style = document.getElementById('dynamicNoteStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'dynamicNoteStyle';
        document.head.appendChild(style);
      }
      style.textContent = 'tbody .note-col-director, tbody .note-col-camera, tbody .note-col-clerk { font-size: ' + val + 'px !important; }';
      document.getElementById('noteFontSizeVal').textContent = val + 'px';
    }
    function updateColor(className, color) {
      var style = document.getElementById('dynamicColorStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'dynamicColorStyle';
        document.head.appendChild(style);
      }
      var rules = [];
      var classes = className.split(',');
      classes.forEach(function(cls) {
        rules.push('.' + cls.trim() + ' { color: ' + color + ' !important; }');
      });
      var existingRules = style.textContent || '';
      var lines = existingRules.split('\\n').filter(function(line) {
        return line.trim().indexOf('.' + className.trim()) !== 0;
      });
      lines.push(rules.join('\\n'));
      style.textContent = lines.join('\\n');
    }
    function toggleStats(btn) {
      var statsArea = document.getElementById('statsArea');
      if (!statsArea) return;
      if (statsArea.style.display === 'none') {
        statsArea.style.display = '';
        btn.classList.add('active');
      } else {
        statsArea.style.display = 'none';
        btn.classList.remove('active');
      }
    }
  <\/script>
</body>
</html>`

  return html
}

// ===== Store 对象 =====

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
    getRecordsByProject: getRecords,
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
    exportToExcel,
    exportToPDF,
  }
}

// ===== 工具函数 =====

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
