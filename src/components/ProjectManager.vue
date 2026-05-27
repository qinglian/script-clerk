<template>
  <div class="project-manager">
    <el-card class="manager-card">
      <template #header>
        <div class="card-header">
          <span>📁 项目管理</span>
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
        <el-table-column label="项目名" min-width="150">
          <template #default="{ row }">
            <div class="project-name">
              <span class="name">{{ row.name }}</span>
              <el-tag v-if="row.id === currentProjectId" type="success" size="small" style="margin-left: 8px">当前</el-tag>
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
              <el-button size="small" @click="handleEditProject(row)">编辑</el-button>
              <el-button size="small" @click="handleDuplicateProject(row)">复制</el-button>
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
          <span>📋 项目模板</span>
        </div>
      </template>
      <p class="section-desc">从模板快速创建新项目，自动预设机位绑定和常用预设。</p>
      
      <div class="template-grid">
        <div v-for="tpl in templates" :key="tpl.name" class="template-card" @click="createFromTemplate(tpl)">
          <div class="template-icon">{{ tpl.icon }}</div>
          <div class="template-info">
            <div class="template-name">{{ tpl.name }}</div>
            <div class="template-desc">{{ tpl.desc }}</div>
          </div>
        </div>
        
        <div class="template-card add-template" @click="showCustomTemplate = true">
          <div class="template-icon">➕</div>
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
        <el-form-item label="项目名" required>
          <el-input v-model="newProjectForm.name" placeholder="如：夏日限定" />
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

    <!-- 编辑项目弹窗 -->
    <el-dialog v-model="showEditProject" title="编辑项目" width="500px">
      <el-form :model="editProjectForm" label-width="80px">
        <el-form-item label="项目名" required>
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

    <!-- 复制项目弹窗 -->
    <el-dialog v-model="showDuplicateProject" title="复制项目" width="500px">
      <el-form :model="duplicateForm" label-width="80px">
        <el-form-item label="新项目名" required>
          <el-input v-model="duplicateForm.name" placeholder="输入新项目名称" />
        </el-form-item>
        <el-alert type="info" :closable="false" style="margin-top: 12px">
          将复制项目设置和所有场记记录（{{ getRecordCount(duplicateForm.sourceId) }} 条）
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

    <!-- 自定义模板弹窗 -->
    <el-dialog v-model="showCustomTemplate" title="创建自定义模板" width="600px">
      <el-form :model="customTemplateForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="customTemplateForm.name" placeholder="如：纪录片拍摄" />
        </el-form-item>
        <el-form-item label="摄像机数量">
          <el-input-number v-model="customTemplateForm.cameraCount" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="录音设备数量">
          <el-input-number v-model="customTemplateForm.audioCount" :min="0" :max="10" />
        </el-form-item>
        <el-form-item label="默认前缀">
          <el-input v-model="customTemplateForm.defaultPrefix" placeholder="如：A" style="width: 120px" />
          <span style="color: #909399; font-size: 12px; margin-left: 8px">摄像机和录音设备将使用此前缀</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCustomTemplate = false">取消</el-button>
        <el-button type="primary" @click="handleCreateCustomTemplate">创建项目</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Upload, Download } from '@element-plus/icons-vue'
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
  addPreset,
} from '../stores/scriptStore'
import type { Project } from '../types/script'

const emit = defineEmits<{
  (e: 'projectChanged'): void
}>()

const projectList = ref<Project[]>([])
const currentProjectId = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

// 新建项目
const showNewProject = ref(false)
const newProjectForm = ref({ name: '', director: '', scriptSupervisor: '' })

// 编辑项目
const showEditProject = ref(false)
const editProjectForm = ref({ id: '', name: '', director: '', scriptSupervisor: '' })

// 复制项目
const showDuplicateProject = ref(false)
const duplicateForm = ref({ sourceId: '', name: '' })

// 项目模板
const templates = [
  {
    name: '单机位短片',
    icon: '🎬',
    desc: '1台摄像机 + 1台录音设备',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'C' },
        { type: 'audio' as const, label: '主录音', prefixes: 'S' }
      ],
      presets: [
        { category: 'actors' as const, value: '主角' },
        { category: 'directorNote' as const, value: '动作快一点' },
        { category: 'cameraNote' as const, value: '跟拍' }
      ]
    }
  },
  {
    name: '双机位访谈',
    icon: '🎤',
    desc: '2台摄像机 + 1台录音设备',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'A' },
        { type: 'camera' as const, label: 'B机位', prefixes: 'B' },
        { type: 'audio' as const, label: '主录音', prefixes: 'S' }
      ],
      presets: [
        { category: 'actors' as const, value: '主持人,嘉宾' },
        { category: 'directorNote' as const, value: '声音大一点' },
        { category: 'note' as const, value: '收音正常' }
      ]
    }
  },
  {
    name: '三机位剧集',
    icon: '🎥',
    desc: '3台摄像机 + 2台录音设备',
    config: {
      cameraBindings: [
        { type: 'camera' as const, label: 'A机位', prefixes: 'A' },
        { type: 'camera' as const, label: 'B机位', prefixes: 'B' },
        { type: 'camera' as const, label: 'C机位', prefixes: 'C' },
        { type: 'audio' as const, label: '主录音', prefixes: 'S' },
        { type: 'audio' as const, label: '备用录音', prefixes: 'B' }
      ],
      presets: [
        { category: 'actors' as const, value: '主角,配角,群演' },
        { category: 'directorNote' as const, value: '情绪再饱满一点' },
        { category: 'cameraNote' as const, value: '推,拉,摇,移' },
        { category: 'note' as const, value: 'NG,OK,保一条' }
      ]
    }
  }
]
const showCustomTemplate = ref(false)
const customTemplateForm = ref({ name: '', cameraCount: 1, audioCount: 1, defaultPrefix: 'A' })

onMounted(() => {
  loadProjects()
})

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

// 新建项目
function handleNewProject() {
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
    ? `确定删除项目「${project.name}」？这将同时删除 ${count} 条场记记录，此操作不可恢复！`
    : `确定删除项目「${project.name}」？此操作不可恢复！`
  
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
    ElMessage.warning('请输入新项目名')
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
        `将导入项目「${json.project.name}」及其 ${json.records.length} 条记录。是否继续？`,
        '导入确认',
        { confirmButtonText: '导入', cancelButtonText: '取消', type: 'info' }
      )
      const newProject = importProjectData(text)
      if (newProject) {
        loadProjects()
        ElMessage.success(`项目「${newProject.name}」已导入`)
        emit('projectChanged')
      } else {
        ElMessage.error('导入失败，文件格式错误')
      }
    } else if (json.projects && Array.isArray(json.projects)) {
      // 全部数据导入
      await ElMessageBox.confirm(
        `将导入 ${json.projects.length} 个项目和 ${json.records?.length || 0} 条记录，当前数据将被覆盖！是否继续？`,
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
  
  // 清空 file input
  ;(event.target as HTMLInputElement).value = ''
}

// 从模板创建
async function createFromTemplate(tpl: typeof templates[0]) {
  const projectName = await ElMessageBox.prompt('请输入项目名', `从模板创建 - ${tpl.name}`, {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '请输入项目名'
  }).then(({ value }) => value).catch(() => null)
  
  if (!projectName) return
  
  const project = addProject(projectName, '', '')
  
  // 添加模板配置
  if (tpl.config.cameraBindings) {
    for (const binding of tpl.config.cameraBindings) {
      addCameraBinding(project.id, binding)
    }
  }
  
  if (tpl.config.presets) {
    for (const preset of tpl.config.presets) {
      addPreset(project.id, preset.category, preset.value)
    }
  }
  
  loadProjects()
  ElMessage.success(`项目「${projectName}」已从模板创建`)
  emit('projectChanged')
}

// 创建自定义模板项目
async function handleCreateCustomTemplate() {
  if (!customTemplateForm.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  
  const projectName = await ElMessageBox.prompt('请输入项目名', `创建项目 - ${customTemplateForm.value.name}`, {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '请输入项目名'
  }).then(({ value }) => value).catch(() => null)
  
  if (!projectName) return
  
  const project = addProject(projectName, '', '')
  
  // 根据摄像机数量创建绑定
  for (let i = 0; i < customTemplateForm.value.cameraCount; i++) {
    const letter = String.fromCharCode(65 + i) // A, B, C...
    addCameraBinding(project.id, {
      type: 'camera',
      label: `${letter}机位`,
      prefixes: customTemplateForm.value.defaultPrefix || letter
    })
  }
  
  // 根据录音设备数量创建绑定
  for (let i = 0; i < customTemplateForm.value.audioCount; i++) {
    const label = i === 0 ? '主录音' : `录音${i + 1}`
    const prefix = i === 0 ? 'S' : String.fromCharCode(83 + i) // S, T, U...
    addCameraBinding(project.id, {
      type: 'audio',
      label,
      prefixes: prefix
    })
  }
  
  loadProjects()
  showCustomTemplate.value = false
  ElMessage.success(`项目「${projectName}」已创建`)
  emit('projectChanged')
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
}

.template-info {
  flex: 1;
}

.template-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.template-desc {
  font-size: 12px;
  color: #909399;
}

.add-template {
  border-style: dashed;
}
</style>
