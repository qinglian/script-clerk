<template>
  <div class="project-manager">
    <el-card class="manager-card">
      <template #header>
        <div class="card-header">
          <span>项目管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="showNewProject = true">
              <el-icon><Plus /></el-icon> 新建项目
            </el-button>
            <el-button @click="handleImportBackup">
              <el-icon><Upload /></el-icon> 导入备份
            </el-button>
            <el-button @click="handleExportAllBackup">
              <el-icon><Download /></el-icon> 导出全部备份
            </el-button>
          </div>
        </div>
      </template>
      <!-- 项目列表 -->
      <el-table :data="projectList" stripe style="width: 100%">
        <el-table-column label="项目名称" min-width="150">
          <template #default="{ row }">
            <div class="project-name">
              <span class="name">{{ row.name }}</span>
              <el-tag v-if="row.id === currentProjectId" type="success" size="small" style="margin-left: 8px">
                当前</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="director" label="导演" width="120" />
        <el-table-column prop="scriptSupervisor" label="场记" width="120" />
        <el-table-column label="记录数" width="80" align="center">
          <template #default="{ row }">
            {{ getRecordCount(row.id) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="110">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="handleSwitchProject(row.id)" :disabled="row.id === currentProjectId">
                切换
              </el-button>
              <el-button size="small" @click="handleEditProject(row)">
                编辑</el-button>
              <el-button size="small" @click="handleDuplicateProject(row)">
                复制</el-button>
              <el-button size="small" type="primary" @click="handleExportProject(row.id)">
                导出
              </el-button>
              <el-button size="small" type="danger" @click="handleDeleteProject(row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <!-- 项目预设模板 -->
    <el-card class="manager-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>项目模板</span>
        </div>
      </template>
      <p class="section-desc">
        从模板快速创建新项目，自动预设机位绑定。</p>
      <div class="template-grid">
        <div v-for="tpl in allTemplates" :key="tpl.name" class="template-card" @click="!isEditingTemplate && createFromTemplate(tpl)">
          <div class="template-icon">{{ tpl.icon }}</div>
          <div class="template-info">
            <div class="template-name">{{ tpl.name }}</div>
            <div class="template-desc">{{ tpl.desc }}</div>
          </div>
          <!-- 自定义模板的编辑和删除按钮 -->
          <div v-if="isCustomTemplate(tpl)" class="template-actions" @click.stop>
            <el-button size="small" type="primary" text @click="handleEditTemplate(tpl)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" text @click="handleDeleteTemplate(tpl)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="template-card add-template" @click="showCustomTemplate = true">
          <div class="template-icon">+</div>
          <div class="template-info">
            <div class="template-name">自定义模板</div>
            <div class="template-desc">创建并保存你自己的项目模板</div>
          </div>
        </div>
      </div>
    </el-card>
    <!-- 新建项目弹窗 -->
    <el-dialog v-model="showNewProject" title="新建项目" width="500px">
      <el-form :model="newProjectForm" label-width="80px">
        <el-form-item label="项目名称" required>
          <el-input v-model="newProjectForm.name" placeholder="如：二月之城限定" />
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="newProjectForm.director" placeholder="导演姓名" />
        </el-form-item>
        <el-form-item label="场记">
          <el-input v-model="newProjectForm.scriptSupervisor" placeholder="场记姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewProject = false">取消</el-button>
        <el-button type="primary" @click="handleNewProject">创建</el-button>
      </template>
    </el-dialog>
    <!-- 从模板创建项目弹窗 -->
    <el-dialog v-model="showTemplateProject" :title="`从模板创建 - ${templateProjectForm.template?.name || ''}`" width="500px">
      <el-form :model="templateProjectForm" label-width="80px">
        <el-form-item label="项目名称" required>
          <el-input v-model="templateProjectForm.name" placeholder="如：夏日限定" />
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="templateProjectForm.director" placeholder="导演姓名" />
        </el-form-item>
        <el-form-item label="场记">
          <el-input v-model="templateProjectForm.scriptSupervisor" placeholder="场记姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTemplateProject = false">取消</el-button>
        <el-button type="primary" @click="confirmCreateFromTemplate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑项目窗口 -->
    <el-dialog v-model="showEditProject" title="编辑项目" width="500px">
      <el-form :model="editProjectForm" label-width="80px">
        <el-form-item label="项目名称" required>
          <el-input v-model="editProjectForm.name" />
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="editProjectForm.director" />
        </el-form-item>
        <el-form-item label="场记">
          <el-input v-model="editProjectForm.scriptSupervisor" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditProject = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEditProject">保存</el-button>
      </template>
    </el-dialog>
    <!-- 复制项目窗口 -->
    <el-dialog v-model="showDuplicateProject" title="复制项目" width="500px">
      <el-form :model="duplicateForm" label-width="80px">
        <el-form-item label="新项目名" required>
          <el-input v-model="duplicateForm.name" placeholder="输入新项目名" />
        </el-form-item>
        <el-alert type="info" :closable="false" style="margin-top: 12px">
          将复制项目设置和所有机位记录（{{ getRecordCount(duplicateForm.sourceId) }} 条）
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="showDuplicateProject = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmDuplicate">确认复制</el-button>
      </template>
    </el-dialog>
    <!-- 导入备份文件选择 -->
    <input
      ref="importInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFileSelect"
    />
    <!-- 自定义模板弹窗（创建/编辑） -->
    <el-dialog
      v-model="showCustomTemplate"
      :title="isEditingTemplate ? '编辑自定义模板' : '创建自定义模板'"
      width="700px"
    >
      <el-form :model="customTemplateForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="customTemplateForm.name" placeholder="如：剧情长片拍摄" />
        </el-form-item>
        <!-- 设备配置列表 -->
        <el-form-item label="设备配置">
          <div class="device-config-list">
            <div v-for="(device, index) in customTemplateForm.devices" :key="index" class="device-config-item">
              <el-select v-model="device.type" style="width: 120px">
                <el-option label="摄像机" value="camera" />
                <el-option label="录音设备" value="audio" />
              </el-select>
              <el-input
                v-model="device.label"
                placeholder="标识，如：A机位"
                style="width: 120px; margin-left: 8px"
              />
              <el-input
                v-model="device.prefixes"
                placeholder="前缀，如：A"
                style="width: 100px; margin-left: 8px"
              />
              <el-button
                type="danger"
                text
                style="margin-left: 8px"
                @click="removeDeviceConfig(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" text @click="addDeviceConfig">
              <el-icon><Plus /></el-icon> 添加设备
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCancelCustomTemplate">取消</el-button>
        <el-button type="primary" @click="handleCreateCustomTemplateOnly">
          {{ isEditingTemplate ? '保存模板' : '创建模板' }}
        </el-button>
        <el-button type="success" @click="handleCreateCustomTemplateAndProject" v-if="!isEditingTemplate">
          创建模板并新建项目
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Upload, Download, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getRecords,
  getCurrentProjectId,
  setCurrentProject,
  exportProjectData,
  importProjectData,
  duplicateProject,
  exportAllData,
  importAllData,
  addCameraBinding,
} from '../stores/scriptStore'
import { selectSaveDirectory, getCurrentSaveDirectory, isFileSystemAccessSupported } from '../stores/fileStorage'
import type { Project } from '../types/script'

const emit = defineEmits<{
  (e: 'projectChanged'): void
  (e: 'promptSaveFolder'): void
}>()

const projectList = ref<Project[]>([])
const currentProjectId = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

// 新建项目
const showNewProject = ref(false)
const newProjectForm = ref({ name: '', director: '', scriptSupervisor: '' })

// 从模板创建项目
const showTemplateProject = ref(false)
const templateProjectForm = ref({
  name: '',
  director: '',
  scriptSupervisor: '',
  template: null as any
})

// 编辑项目
const showEditProject = ref(false)
const editProjectForm = ref({ id: '', name: '', director: '', scriptSupervisor: '' })

// 复制项目
const showDuplicateProject = ref(false)
const duplicateForm = ref({ sourceId: '', name: '' })

// 默认模板（不可编辑删除）
const defaultTemplates = [
  {
    name: '单机位',
    icon: '🎬',
    desc: '1台摄像机',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'A' }
      ]
    }
  },
  {
    name: '双机位+录音',
    icon: '🎤',
    desc: '2台摄像机 + 1台录音设备',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'A' },
        { type: 'camera' as const, label: 'B机位', prefixes: 'B' },
        { type: 'audio' as const, label: '主录音', prefixes: 'S' }
      ]
    }
  },
  {
    name: '三机位',
    icon: '🎥',
    desc: '3台摄像机',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'A' },
        { type: 'camera' as const, label: 'B机位', prefixes: 'B' },
        { type: 'camera' as const, label: 'C机位', prefixes: 'C' }
      ]
    }
  }
]

// 自定义模板存储键
const CUSTOM_TEMPLATES_KEY = 'script-clerk-custom-templates'

// 自定义模板列表（响应式）
const customTemplates = ref<Array<{
  name: string
  icon: string
  desc: string
  config: {
    cameraBindings: Array<{ type: 'camera' | 'audio'; label: string; prefixes: string }>
  }
}>>([])

// 所有模板（默认 + 自定义）
const allTemplates = computed(() => [...defaultTemplates, ...customTemplates.value])

// 自定义模板弹窗
const showCustomTemplate = ref(false)
const isEditingTemplate = ref(false)
const editingTemplateName = ref('')

// 设备配置栏类型
interface DeviceConfig {
  type: 'camera' | 'audio'
  label: string
  prefixes: string
}

// 自定义模板表单
const customTemplateForm = ref<{
  name: string
  devices: DeviceConfig[]
}>({
  name: '',
  devices: [
    { type: 'camera', label: 'A机位', prefixes: 'A' }
  ]
})

onMounted(() => {
  loadProjects()
  loadCustomTemplates()
})

// 加载自定义模板
function loadCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY)
    if (raw) {
      customTemplates.value = JSON.parse(raw)
    }
  } catch {
    customTemplates.value = []
  }
}

// 保存自定义模板到本地存储
function saveCustomTemplates() {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates.value))
}

// 判断是否为自定义模板
function isCustomTemplate(tpl: typeof allTemplates.value[0]): boolean {
  return customTemplates.value.some(ct => ct.name === tpl.name)
}

function loadProjects() {
  projectList.value = getProjects()
  currentProjectId.value = getCurrentProjectId()
}

function getRecordCount(projectId: string): number {
  return getRecords(projectId).length
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 检查并提示设置保存文件夹
async function checkAndPromptSaveFolder(): Promise<boolean> {
  // 检查浏览器是否支持 File System Access API
  if (!isFileSystemAccessSupported()) {
    return false
  }

  // 检查是否已经设置了保存目录
  const handle = getCurrentSaveDirectory()
  if (handle) {
    return false
  }

  // 检查用户是否已经选择跳过
  const optedOut = localStorage.getItem('hasSetSaveFolder')
  if (optedOut === 'true') {
    return false
  }

  // 检查是否是第一个项目
  if (projectList.value.length > 0) {
    return false
  }

  return true
}

// 提示用户设置保存文件夹
async function promptSaveFolderSetup(): Promise<void> {
  try {
    const confirmed = await ElMessageBox.confirm(
      '首次使用，建议设置一个保存文件夹，以便自动备份你的项目数据。是否现在设置？',
      '设置保存文件夹',
      {
        confirmButtonText: '去设置',
        cancelButtonText: '稍后再说',
        type: 'info'
      }
    )
    if (confirmed) {
      const handle = await selectSaveDirectory()
      if (handle) {
        ElMessage.success('保存文件夹设置成功')
        emit('promptSaveFolder')
      } else {
        // 用户取消了选择
        localStorage.setItem('hasSetSaveFolder', 'true')
      }
    }
  } catch {
    // 用户选择稍后再说
    localStorage.setItem('hasSetSaveFolder', 'true')
  }
}

// 新建项目
async function handleNewProject() {
  if (!newProjectForm.value.name) {
    ElMessage.warning('请输入项目名')
    return
  }
  addProject(newProjectForm.value.name, newProjectForm.value.director, newProjectForm.value.scriptSupervisor)
  loadProjects()
  showNewProject.value = false
  newProjectForm.value = { name: '', director: '', scriptSupervisor: '' }
  ElMessage.success('项目已创建')
  emit('projectChanged')

  // 检查是否需要提示设置保存文件夹
  const shouldPrompt = await checkAndPromptSaveFolder()
  if (shouldPrompt) {
    await promptSaveFolderSetup()
  }
}

// 切换项目
function handleSwitchProject(projectId: string) {
  setCurrentProject(projectId)
  currentProjectId.value = projectId
  loadProjects()
  ElMessage.success('已切换项目')
  emit('projectChanged')
}

// 编辑项目
function handleEditProject(project: Project) {
  editProjectForm.value = {
    id: project.id,
    name: project.name,
    director: project.director,
    scriptSupervisor: project.scriptSupervisor
  }
  showEditProject.value = true
}

function handleSaveEditProject() {
  if (!editProjectForm.value.name) {
    ElMessage.warning('请输入项目名')
    return
  }
  updateProject(editProjectForm.value.id, {
    name: editProjectForm.value.name,
    director: editProjectForm.value.director,
    scriptSupervisor: editProjectForm.value.scriptSupervisor
  })
  loadProjects()
  showEditProject.value = false
  ElMessage.success('项目已更新')
  emit('projectChanged')
}

// 删除项目
async function handleDeleteProject(project: Project) {
  const count = getRecordCount(project.id)
  const msg = count > 0
    ? `确定删除项目"${project.name}"？这将同时删除 ${count} 条机位记录，此操作不可恢复！`
    : `确定删除项目"${project.name}"？此操作不可恢复！`
  try {
    await ElMessageBox.confirm(msg, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    deleteProject(project.id)
    loadProjects()
    ElMessage.success('项目已删除')
    emit('projectChanged')
  } catch {
    // 用户取消
  }
}

// 复制项目
function handleDuplicateProject(project: Project) {
  duplicateForm.value = {
    sourceId: project.id,
    name: `${project.name} - 副本`
  }
  showDuplicateProject.value = true
}

function handleConfirmDuplicate() {
  if (!duplicateForm.value.name) {
    ElMessage.warning('请输入新项目名称')
    return
  }
  const newProject = duplicateProject(duplicateForm.value.sourceId, duplicateForm.value.name)
  if (newProject) {
    loadProjects()
    showDuplicateProject.value = false
    ElMessage.success(`项目已复制，包含 ${getRecordCount(newProject.id)} 条记录`)
    emit('projectChanged')
  }
}

// 导出单个项目
function handleExportProject(projectId: string) {
  const json = exportProjectData(projectId)
  if (!json) {
    ElMessage.error('导出失败')
    return
  }
  downloadJson(json, `script-clerk-${projectList.value.find(p => p.id === projectId)?.name || 'project'}-${formatDateForFile(new Date())}.json`)
  ElMessage.success('项目已导出')
}

// 导出全部备份
function handleExportAllBackup() {
  const json = exportAllData()
  downloadJson(json, `script-clerk-backup-${formatDateForFile(new Date())}.json`)
  ElMessage.success('全部数据已导出')
}

// 导入备份
function handleImportBackup() {
  importInput.value?.click()
}

async function handleImportFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    // 判断是单个项目还是全部数据
    if (json.project && json.records) {
      // 单个项目导入
      await ElMessageBox.confirm(
        `将导入项目"${json.project.name}"及全部${json.records.length}条记录。是否继续？`,
        '导入确认',
        { confirmButtonText: '导入', cancelButtonText: '取消', type: 'info' }
      )
      const newProject = importProjectData(text)
      if (newProject) {
        loadProjects()
        ElMessage.success(`项目"${newProject.name}"已导入`)
        emit('projectChanged')
      } else {
        ElMessage.error('导入失败，文件格式错误')
      }
    } else if (json.projects && Array.isArray(json.projects)) {
      // 全部数据导入
      await ElMessageBox.confirm(
        `将导入 ${json.projects.length} 个项目和 ${json.records?.length || 0} 条记录，当前数据将被覆盖，是否继续？`,
        '导入确认',
        { confirmButtonText: '导入', cancelButtonText: '取消', type: 'warning' }
      )
      if (importAllData(text)) {
        loadProjects()
        ElMessage.success('数据已导入')
        emit('projectChanged')
      } else {
        ElMessage.error('导入失败，文件格式错误')
      }
    } else {
      ElMessage.error('无法识别的备份文件格式')
    }
  } catch (err) {
    ElMessage.error('读取文件失败')
  }
  // 清除 file input
  (event.target as HTMLInputElement).value = ''
}

// 从模板创建 - 打开对话框
function createFromTemplate(tpl: typeof allTemplates.value[0]) {
  templateProjectForm.value = {
    name: '',
    director: '',
    scriptSupervisor: '',
    template: tpl
  }
  showTemplateProject.value = true
}

// 确认从模板创建项目
async function confirmCreateFromTemplate() {
  if (!templateProjectForm.value.name) {
    ElMessage.warning('请输入项目名')
    return
  }
  if (!templateProjectForm.value.template) {
    ElMessage.error('模板信息丢失')
    return
  }

  const tpl = templateProjectForm.value.template
  const project = addProject(
    templateProjectForm.value.name,
    templateProjectForm.value.director,
    templateProjectForm.value.scriptSupervisor
  )

  // 添加模板配置
  if (tpl.config.cameraBindings) {
    for (const binding of tpl.config.cameraBindings) {
      addCameraBinding(project.id, binding)
    }
  }

  loadProjects()
  showTemplateProject.value = false
  templateProjectForm.value = { name: '', director: '', scriptSupervisor: '', template: null }
  ElMessage.success(`项目"${project.name}"已从模板创建`)
  emit('projectChanged')

  // 检查是否需要提示设置保存文件夹
  const shouldPrompt = await checkAndPromptSaveFolder()
  if (shouldPrompt) {
    await promptSaveFolderSetup()
  }
}

// 添加设备配置
function addDeviceConfig() {
  customTemplateForm.value.devices.push({
    type: 'camera',
    label: '',
    prefixes: ''
  })
}

// 移除设备配置
function removeDeviceConfig(index: number) {
  customTemplateForm.value.devices.splice(index, 1)
}

// 取消自定义模板
function handleCancelCustomTemplate() {
  showCustomTemplate.value = false
  isEditingTemplate.value = false
  editingTemplateName.value = ''
  customTemplateForm.value = {
    name: '',
    devices: [{ type: 'camera', label: 'A机位', prefixes: 'A' }]
  }
}

// 仅创建模板
function handleCreateCustomTemplateOnly() {
  if (!customTemplateForm.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (customTemplateForm.value.devices.length === 0) {
    ElMessage.warning('请至少添加一个设备')
    return
  }
  // 验证设备配置
  for (const device of customTemplateForm.value.devices) {
    if (!device.label || !device.prefixes) {
      ElMessage.warning('请填写完整的设备标识和前缀')
      return
    }
  }
  const templateData = {
    name: customTemplateForm.value.name,
    icon: '📋',
    desc: `${customTemplateForm.value.devices.filter(d => d.type === 'camera').length}台摄像机 + ${customTemplateForm.value.devices.filter(d => d.type === 'audio').length}台录音设备`,
    config: {
      cameraBindings: customTemplateForm.value.devices.map(d => ({
        type: d.type,
        label: d.label,
        prefixes: d.prefixes
      }))
    }
  }
  if (isEditingTemplate.value) {
    // 编辑模式：更新现有模板
    const index = customTemplates.value.findIndex(t => t.name === editingTemplateName.value)
    if (index !== -1) {
      customTemplates.value[index] = templateData
      saveCustomTemplates()
      ElMessage.success('模板已更新')
    }
  } else {
    // 创建模式：检查名称是否重复
    const allNames = allTemplates.value.map(t => t.name)
    if (allNames.includes(templateData.name)) {
      ElMessage.warning('模板名称已存在')
      return
    }
    customTemplates.value.push(templateData)
    saveCustomTemplates()
    ElMessage.success('模板已创建')
  }
  showCustomTemplate.value = false
  isEditingTemplate.value = false
  editingTemplateName.value = ''
  customTemplateForm.value = {
    name: '',
    devices: [{ type: 'camera', label: 'A机位', prefixes: 'A' }]
  }
}

// 创建模板并新建项目
async function handleCreateCustomTemplateAndProject() {
  if (!customTemplateForm.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (customTemplateForm.value.devices.length === 0) {
    ElMessage.warning('请至少添加一个设备')
    return
  }
  // 验证设备配置
  for (const device of customTemplateForm.value.devices) {
    if (!device.label || !device.prefixes) {
      ElMessage.warning('请填写完整的设备标识和前缀')
      return
    }
  }
  const templateData = {
    name: customTemplateForm.value.name,
    icon: '📋',
    desc: `${customTemplateForm.value.devices.filter(d => d.type === 'camera').length}台摄像机 + ${customTemplateForm.value.devices.filter(d => d.type === 'audio').length}台录音设备`,
    config: {
      cameraBindings: customTemplateForm.value.devices.map(d => ({
        type: d.type,
        label: d.label,
        prefixes: d.prefixes
      }))
    }
  }
  // 检查名称是否重复
  const allNames = allTemplates.value.map(t => t.name)
  if (allNames.includes(templateData.name)) {
    ElMessage.warning('模板名称已存在')
    return
  }
  // 保存模板
  customTemplates.value.push(templateData)
  saveCustomTemplates()
  // 弹出创建项目对话框
  const projectName = await ElMessageBox.prompt('请输入项目名', `创建项目 - ${templateData.name}`, {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '请输入项目名'
  }).then(({ value }) => value).catch(() => null)
  if (projectName) {
    const project = addProject(projectName, '', '')
    // 添加模板配置
    for (const binding of templateData.config.cameraBindings) {
      addCameraBinding(project.id, binding)
    }
    loadProjects()
    ElMessage.success(`模板已创建，项目"${projectName}"已创建`)
    emit('projectChanged')

    // 检查是否需要提示设置保存文件夹
    const shouldPrompt = await checkAndPromptSaveFolder()
    if (shouldPrompt) {
      await promptSaveFolderSetup()
    }
  } else {
    ElMessage.success('模板已创建')
  }
  showCustomTemplate.value = false
  customTemplateForm.value = {
    name: '',
    devices: [{ type: 'camera', label: 'A机位', prefixes: 'A' }]
  }
}

// 编辑模板
function handleEditTemplate(tpl: typeof customTemplates.value[0]) {
  isEditingTemplate.value = true
  editingTemplateName.value = tpl.name
  customTemplateForm.value = {
    name: tpl.name,
    devices: tpl.config.cameraBindings.map(b => ({
      type: b.type,
      label: b.label,
      prefixes: b.prefixes
    }))
  }
  showCustomTemplate.value = true
}

// 删除模板
async function handleDeleteTemplate(tpl: typeof customTemplates.value[0]) {
  try {
    await ElMessageBox.confirm(
      `确定删除模板"${tpl.name}"？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const index = customTemplates.value.findIndex(t => t.name === tpl.name)
    if (index !== -1) {
      customTemplates.value.splice(index, 1)
      saveCustomTemplates()
      ElMessage.success('模板已删除')
    }
  } catch {
    // 用户取消
  }
}

// 工具函数
function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatDateForFile(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.project-manager {
  padding: 0;
}

.manager-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.project-name {
  display: flex;
  align-items: center;
}

.project-name .name {
  font-weight: 500;
}

.section-desc {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.template-card:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.template-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border-radius: 8px;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.template-desc {
  font-size: 12px;
  color: #909399;
}

.template-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.template-card:hover .template-actions {
  opacity: 1;
}

.add-template {
  border-style: dashed;
}

/* 设备配置列表样式 */
.device-config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-config-item {
  display: flex;
  align-items: center;
}
</style>

