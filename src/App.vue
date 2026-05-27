<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="logo">
        <h2>🎬 场记系统</h2>
      </div>

      <!-- 项目选择 -->
      <div class="project-selector">
        <el-select v-model="currentProjectId" placeholder="选择项目" @change="onProjectChange" style="width: 100%">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-button type="primary" text @click="showNewProject = true" style="margin-top: 8px; width: 100%">
          + 新建项目
        </el-button>
      </div>

      <el-menu :default-active="activeView" @select="onMenuSelect">
        <el-menu-item index="form">
          <el-icon><EditPen /></el-icon>
          <span>场记表单</span>
        </el-menu-item>
        <el-menu-item index="list">
          <el-icon><List /></el-icon>
          <span>记录列表</span>
        </el-menu-item>
        <el-menu-item index="stats">
          <el-icon><DataAnalysis /></el-icon>
          <span>统计</span>
        </el-menu-item>
        <el-menu-item index="export">
          <el-icon><Download /></el-icon>
          <span>导出</span>
        </el-menu-item>
        <el-menu-item index="manager">
          <el-icon><CopyDocument /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="settings">
          <el-icon><Setting /></el-icon>
          <span>项目设置</span>
        </el-menu-item>
      </el-menu>

      <!-- 状态栏 -->
      <div class="status-section">
        <!-- 在线状态 -->
        <div class="status-item" :class="{ offline: isOffline }">
          <el-icon :size="14"><Monitor /></el-icon>
          <span>{{ isOffline ? '离线模式' : '在线' }}</span>
        </div>

        <!-- PWA 安装提示 -->
        <el-button
          v-if="deferredPrompt"
          type="primary"
          text
          size="small"
          @click="installApp"
          style="margin-top: 4px; width: 100%; color: #409eff;"
        >
          <el-icon><Download /></el-icon>
          安装应用到桌面
        </el-button>

        <el-divider style="margin: 12px 0; border-color: rgba(255,255,255,0.1)" v-if="isFileSystemSupported" />

        <!-- 本地保存状态 -->
        <template v-if="isFileSystemSupported">
          <!-- 保存状态和文件夹名称 -->
          <div class="save-info">
            <div class="save-header">
              <el-icon :size="14" :color="saveStatusColor">
                <FolderChecked v-if="isLocalSaveEnabled" />
                <Folder v-else />
              </el-icon>
              <span :style="{ color: saveStatusColor }">
                {{ isLocalSaveEnabled ? '本地保存已启用' : '未设置本地保存' }}
              </span>
            </div>

            <!-- 文件夹名称 -->
            <div v-if="isLocalSaveEnabled" class="folder-name">
              <el-icon :size="12"><Folder /></el-icon>
              <span :title="saveFolderPath">{{ truncatedFolderPath }}</span>
            </div>

            <!-- 上次保存时间 -->
            <div v-if="isLocalSaveEnabled" class="save-time">
              <el-icon :size="12"><Clock /></el-icon>
              <span>上次保存: {{ lastSaveTimeText }}</span>
            </div>

            <!-- 保存模式 -->
            <div v-if="isLocalSaveEnabled" class="save-mode">
              <el-tag size="small" type="success">实时</el-tag>
              <el-tag size="small" type="warning">全量备份</el-tag>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="save-actions">
            <el-button
              type="primary"
              text
              size="small"
              @click="selectSaveFolder"
              style="color: #409eff;"
              :title="isLocalSaveEnabled ? '更改保存位置' : '选择保存文件夹'"
            >
              <el-icon><FolderAdd /></el-icon>
              {{ isLocalSaveEnabled ? '更改位置' : '选择文件夹' }}
            </el-button>
          </div>
        </template>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 项目管理页面始终可访问 -->
      <ProjectManager v-if="activeView === 'manager'" :project-id="currentProjectId" @project-changed="onProjectChanged" />
      <!-- 其他页面需要选择项目 -->
      <template v-else>
        <div v-if="!currentProjectId" class="no-project">
          <el-empty description="请先选择或创建一个项目">
            <el-button type="primary" @click="showNewProject = true">创建项目</el-button>
          </el-empty>
        </div>
        <template v-else>
          <ScriptForm v-if="activeView === 'form'" :project-id="currentProjectId" :record-id="editRecordId" @saved="onRecordSaved" />
          <ScriptList v-else-if="activeView === 'list'" :project-id="currentProjectId" @edit="onEditRecord" @new="onNewRecord" />
          <ScriptStats v-else-if="activeView === 'stats'" :project-id="currentProjectId" />
          <ExportPanel v-else-if="activeView === 'export'" :project-id="currentProjectId" />
          <ProjectSettings v-else-if="activeView === 'settings'" :project-id="currentProjectId" />
        </template>
      </template>
    </div>

    <!-- 新建项目弹窗 -->
    <el-dialog v-model="showNewProject" title="新建项目" width="500px">
      <el-form :model="newProjectForm" label-width="100px">
        <el-form-item label="项目名称">
          <el-input v-model="newProjectForm.name" placeholder="如：夏日限定" />
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="newProjectForm.director" placeholder="导演姓名" />
        </el-form-item>
        <el-form-item label="场记">
          <el-input v-model="newProjectForm.scriptSupervisor" placeholder="场记姓名" />
        </el-form-item>
        <el-form-item label="本地保存" v-if="isFileSystemSupported">
          <div class="save-folder-selector">
            <el-button
              type="primary"
              @click="selectSaveFolderForNewProject"
              :disabled="isSelectingFolder"
            >
              <el-icon><Folder /></el-icon>
              {{ saveFolderPath ? '更换文件夹' : '选择保存文件夹' }}
            </el-button>
            <span v-if="saveFolderPath" class="folder-path">{{ saveFolderPath }}</span>
            <span v-else class="folder-hint">选择后将实时保存到该文件夹</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewProject = false">取消</el-button>
        <el-button type="primary" @click="handleNewProject" :disabled="!newProjectForm.name">创建</el-button>
      </template>
    </el-dialog>

    <!-- 文件浏览器 -->
    <FileBrowser ref="fileBrowserRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { EditPen, List, DataAnalysis, Download, Setting, Folder, FolderChecked, FolderAdd, Monitor, Clock } from '@element-plus/icons-vue'
import { getProjects, addProject, setCurrentProject, getCurrentProjectId, initStorage, isFileSystemAvailable } from './stores/scriptStore'
import type { Project } from './types/script'
import {
  selectSaveDirectory,
  getCurrentSaveDirectory,
  getFormattedLastSaveTime,
} from './stores/fileStorage'
import ScriptForm from './components/ScriptForm.vue'
import ScriptList from './components/ScriptList.vue'
import ScriptStats from './components/ScriptStats.vue'
import ExportPanel from './components/ExportPanel.vue'
import ProjectSettings from './components/ProjectSettings.vue'
import ProjectManager from './components/ProjectManager.vue'
import FileBrowser from './components/FileBrowser.vue'
import { ElMessage } from 'element-plus'

const projects = ref<Project[]>([])
const currentProjectId = ref<string | null>(null)
const activeView = ref('form')
const editRecordId = ref<string | null>(null)
const showNewProject = ref(false)
const newProjectForm = ref({ name: '', director: '', scriptSupervisor: '' })
const isFileSystemSupported = ref(false)
const isLocalSaveEnabled = ref(false)
const isSelectingFolder = ref(false)
const saveFolderPath = ref('')
const lastSaveTimeText = ref('从未保存')

// 离线状态
const isOffline = ref(!navigator.onLine)
const fileBrowserRef = ref()

// PWA 安装提示
const deferredPrompt = ref<any>(null)

// 保存时间更新定时器
let saveTimeTimer: number | null = null

// 截断的文件夹路径
const truncatedFolderPath = computed(() => {
  const path = saveFolderPath.value
  if (path.length > 20) {
    return '...' + path.slice(-17)
  }
  return path
})

// 更新保存时间显示
function updateSaveTimeText() {
  lastSaveTimeText.value = getFormattedLastSaveTime()
}

// 监听 PWA 安装事件
if ('onbeforeinstallprompt' in window) {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
  })
}

// 监听网络状态变化
window.addEventListener('online', () => { isOffline.value = false })
window.addEventListener('offline', () => { isOffline.value = true })

// 安装应用
async function installApp() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    deferredPrompt.value = null
    ElMessage.success('应用安装成功！')
  }
}

const saveStatusColor = computed(() => {
  if (isLocalSaveEnabled.value) {
    return '#67c23a'
  }
  return '#909399'
})

onMounted(async () => {
  // 初始化存储（恢复目录句柄并加载数据）
  await initStorage()
  
  // 加载项目列表
  projects.value = getProjects()
  console.log('[App] 加载项目列表:', projects.value.length, '个项目')

  // 检查文件系统支持
  isFileSystemSupported.value = isFileSystemAvailable()

  // 检查本地保存状态
  const handle = getCurrentSaveDirectory()
  if (handle) {
    isLocalSaveEnabled.value = true
    saveFolderPath.value = handle.name
  }


  // 更新保存时间
  updateSaveTimeText()
  // 每分钟更新一次保存时间显示
  saveTimeTimer = window.setInterval(updateSaveTimeText, 60000)

  const saved = getCurrentProjectId()
  if (saved) {
    currentProjectId.value = saved
  }
})

onUnmounted(() => {
  if (saveTimeTimer) {
    clearInterval(saveTimeTimer)
  }
})

async function selectSaveFolder() {
  isSelectingFolder.value = true
  try {
    const handle = await selectSaveDirectory()
    if (handle) {
      isLocalSaveEnabled.value = true
      saveFolderPath.value = handle.name
      updateSaveTimeText()
      ElMessage.success('已设置本地保存文件夹')
    }
  } catch (error) {
    ElMessage.error('选择文件夹失败')
  } finally {
    isSelectingFolder.value = false
  }
}


async function selectSaveFolderForNewProject() {
  await selectSaveFolder()
}

function onProjectChange(id: string) {
  currentProjectId.value = id
  setCurrentProject(id)
  activeView.value = 'form'
  editRecordId.value = null
}

function onMenuSelect(index: string) {
  activeView.value = index
  if (index === 'form') {
    editRecordId.value = null
  }
}

function onRecordSaved() {
  editRecordId.value = null
  // 更新保存时间
  updateSaveTimeText()
}

function onEditRecord(id: string) {
  editRecordId.value = id
  activeView.value = 'form'
}

function onNewRecord() {
  editRecordId.value = null
  activeView.value = 'form'
}

function handleNewProject() {
  if (!newProjectForm.value.name) return
  const project = addProject(
    newProjectForm.value.name,
    newProjectForm.value.director,
    newProjectForm.value.scriptSupervisor
  )
  projects.value = getProjects()
  currentProjectId.value = project.id
  showNewProject.value = false
  newProjectForm.value = { name: '', director: '', scriptSupervisor: '' }
  activeView.value = 'settings'

  updateSaveTimeText()
  ElMessage.success('项目创建成功' + (isLocalSaveEnabled.value ? '，数据将实时保存到本地' : ''))
}

function onProjectChanged() {
  projects.value = getProjects()
  const saved = getCurrentProjectId()
  if (saved) {
    currentProjectId.value = saved
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
</style>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 220px;
  background: #304156;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.logo {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 16px;
}

.logo h2 {
  font-size: 18px;
  color: #fff;
}

.project-selector {
  padding: 0 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 8px;
}

.sidebar .el-menu {
  border-right: none;
  background: transparent;
}

.sidebar :deep(.el-menu-item) {
  color: #bfcbd9;
}

.sidebar :deep(.el-menu-item.is-active) {
  color: #409eff;
  background: rgba(64,158,255,0.1);
}

.sidebar :deep(.el-menu-item:hover) {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.status-section {
  margin-top: auto;
  padding: 0 12px 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #67c23a;
}

.status-item.offline {
  color: #e6a23c;
}

.save-info {
  margin: 8px 0;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
}

.save-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.folder-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
  overflow: hidden;
}

.folder-name span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
}

.save-mode {
  display: flex;
  gap: 4px;
}

.save-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.save-actions :deep(.el-button) {
  justify-content: flex-start;
  padding-left: 4px;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.no-project {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.save-folder-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-path {
  font-size: 12px;
  color: #67c23a;
  word-break: break-all;
}

.folder-hint {
  font-size: 12px;
  color: #909399;
}
</style>
