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
          <el-icon><FolderOpened /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="settings">
          <el-icon><Setting /></el-icon>
          <span>项目设置</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 主内容 -->
    <div class="main-content">
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
        <ProjectManager v-else-if="activeView === 'manager'" :project-id="currentProjectId" @project-changed="onProjectChanged" />
        <ProjectSettings v-else-if="activeView === 'settings'" :project-id="currentProjectId" />
      </template>
    </div>

    <!-- 新建项目弹窗 -->
    <el-dialog v-model="showNewProject" title="新建项目" width="500px">
      <el-form :model="newProjectForm" label-width="80px">
        <el-form-item label="项目名">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { EditPen, List, DataAnalysis, Download, Setting, FolderOpened } from '@element-plus/icons-vue'
import { getProjects, addProject, setCurrentProject, getCurrentProjectId } from './stores/scriptStore'
import ScriptForm from './components/ScriptForm.vue'
import ScriptList from './components/ScriptList.vue'
import ScriptStats from './components/ScriptStats.vue'
import ExportPanel from './components/ExportPanel.vue'
import ProjectSettings from './components/ProjectSettings.vue'
import ProjectManager from './components/ProjectManager.vue'

const projects = ref(getProjects())
const currentProjectId = ref<string | null>(null)
const activeView = ref('form')
const editRecordId = ref<string | null>(null)
const showNewProject = ref(false)
const newProjectForm = ref({ name: '', director: '', scriptSupervisor: '' })

onMounted(() => {
  const saved = getCurrentProjectId()
  if (saved) {
    currentProjectId.value = saved
  }
})

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
  // 保存后保持在表单页，自动开始新增记录
  editRecordId.value = null
  // 强制刷新表单组件（通过 key 或重新渲染）
  // 这里通过清空 editRecordId 实现，表单会自动重置为新增模式
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
  // 新建项目后跳转到设置页面，防止用户忘记配置
  activeView.value = 'settings'
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
/* 全局样式 */
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
</style>