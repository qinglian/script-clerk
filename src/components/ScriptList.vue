<template>
  <div class="script-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchText"
          placeholder="搜索场景号、镜号、演员..."
          style="width: 260px"
          clearable
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 100px">
          <el-option label="通过" value="passed" />
          <el-option label="NG" value="ng" />
          <el-option label="补拍" value="retake" />
        </el-select>
        
        <el-select v-model="filterSceneType" placeholder="场景" clearable style="width: 100px">
          <el-option label="内景" value="int" />
          <el-option label="外景" value="ext" />
        </el-select>
        
        <el-select v-model="filterSoundType" placeholder="声音" clearable style="width: 100px">
          <el-option label="无" value="none" />
          <el-option label="OS" value="os" />
          <el-option label="VO" value="vo" />
        </el-select>
      </div>
      
      <div class="toolbar-right">
        <!-- 排序 -->
        <el-select v-model="sortBy" placeholder="排序方式" style="width: 140px">
          <el-option label="创建时间 ↓" value="createdAt_desc" />
          <el-option label="创建时间 ↑" value="createdAt_asc" />
          <el-option label="场景号 ↑" value="scene_asc" />
          <el-option label="场景号 ↓" value="scene_desc" />
          <el-option label="镜号 ↑" value="shot_asc" />
          <el-option label="镜号 ↓" value="shot_desc" />
          <el-option label="条数 ↑" value="take_asc" />
          <el-option label="条数 ↓" value="take_desc" />
        </el-select>
        
        <!-- 视图切换 -->
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="card">
            <el-icon><Grid /></el-icon> 卡片
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon> 表格
          </el-radio-button>
        </el-radio-group>
        
        <el-button type="primary" @click="$emit('new')">
          <el-icon><Plus /></el-icon> 新增记录
        </el-button>
      </div>
    </div>

    <!-- 统计摘要 -->
    <div class="stats-bar" v-if="filteredRecords.length > 0">
      <span class="stats-item">
        <el-icon><Document /></el-icon> 共 {{ filteredRecords.length }} 条记录
      </span>
      <span class="stats-item status-passed">
        <el-icon><CircleCheck /></el-icon> 通过 {{ countByStatus('passed') }}
      </span>
      <span class="stats-item status-ng">
        <el-icon><CircleClose /></el-icon> NG {{ countByStatus('ng') }}
      </span>
      <span class="stats-item status-retake">
        <el-icon><RefreshRight /></el-icon> 补拍 {{ countByStatus('retake') }}
      </span>
    </div>

    <!-- 卡片视图 -->
    <div class="record-cards" v-if="viewMode === 'card' && filteredRecords.length > 0">
      <div 
        v-for="row in filteredRecords" 
        :key="row.id" 
        class="record-card"
        :class="{ 'status-passed': row.status === 'passed', 'status-ng': row.status === 'ng', 'status-retake': row.status === 'retake' }"
      >
        <!-- 左侧主信息 -->
        <div class="card-main">
          <div class="card-header-row">
            <div class="scene-info">
              <span class="scene-number">{{ row.sceneNumber }}</span>
              <span class="shot-number">镜{{ row.shotNumber }}</span>
              <span class="take-badge">T{{ row.takeCount }}</span>
            </div>
            <el-tag :type="statusType(row.status)" size="small" effect="dark">
              {{ statusText(row.status) }}
            </el-tag>
          </div>
          
          <div class="card-meta">
            <span class="meta-item">
              <el-icon><Location /></el-icon>
              {{ row.sceneType === 'int' ? '内景' : '外景' }} / {{ row.timeOfDay === 'day' ? '日' : '夜' }}
            </span>
            <span class="meta-item" v-if="row.soundType && row.soundType !== 'none'">
              <el-tag size="small" :type="row.soundType === 'os' ? 'info' : 'warning'">{{ row.soundType === 'os' ? 'OS' : 'VO' }}</el-tag>
            </span>
            <span class="meta-item actors" v-if="row.actors">
              <el-icon><User /></el-icon>
              {{ row.actors }}
            </span>
          </div>
          
          <div class="card-time" v-if="row.startTime || row.endTime">
            <el-icon><Clock /></el-icon>
            {{ row.startTime || '--:--' }} - {{ row.endTime || '--:--' }}
          </div>
          
          <div class="card-date" v-if="row.date">
            <el-icon><Calendar /></el-icon>
            {{ row.date }}
          </div>
        </div>
        
        <!-- 中间设备信息：每个设备独立显示 -->
        <div class="card-equipment" v-if="row.equipment && row.equipment.length > 0">
          <div class="equipment-label">设备文件编码</div>
          <div class="equipment-columns">
            <div v-for="eq in row.equipment" :key="eq.id" class="equipment-column">
              <el-tag
                size="small"
                :type="eq.type === 'camera' ? 'primary' : 'success'"
                :effect="eq.changeCard ? 'dark' : 'plain'"
                :class="{ 'change-card-tag': eq.changeCard }"
              >
                {{ eq.type === 'camera' ? '🎥' : '🎤' }} {{ eq.fileCode }}{{ eq.changeCard ? ' 🔄' : '' }}
              </el-tag>
            </div>
          </div>
        </div>
        
        <!-- 右侧操作 -->
        <div class="card-actions">
          <el-button size="small" type="danger" text @click="handleDelete(row.id)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        
        <!-- 备注折叠 -->
        <div class="card-notes" v-if="row.directorNote || row.cameraNote || row.note">
          <el-collapse>
            <el-collapse-item title="备注信息">
              <div v-if="row.directorNote" class="note-item">
                <span class="note-label">导演备注：</span>
                <span>{{ row.directorNote }}</span>
              </div>
              <div v-if="row.cameraNote" class="note-item">
                <span class="note-label">摄影备注：</span>
                <span>{{ row.cameraNote }}</span>
              </div>
              <div v-if="row.note" class="note-item">
                <span class="note-label">场记备注：</span>
                <span>{{ row.note }}</span>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>

    <!-- 表格视图 - 方案A：每个设备独立一列 -->
    <div class="record-table" v-if="viewMode === 'table' && filteredRecords.length > 0">
      <el-table :data="filteredRecords" stripe style="width: 100%">
        <el-table-column label="场景" width="100" prop="sceneNumber" sortable>
          <template #default="{ row }">
            <div v-if="isEditing(row, 'sceneNumber')" @click.stop>
              <el-input 
                v-model="editValue" 
                size="small" 
                style="width: 70px"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
                ref="sceneInput"
              />
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'sceneNumber', row.sceneNumber)">{{ row.sceneNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column label="镜号" width="80" prop="shotNumber" sortable>
          <template #default="{ row }">
            <div v-if="isEditing(row, 'shotNumber')" @click.stop>
              <el-input 
                v-model="editValue" 
                size="small" 
                style="width: 60px"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'shotNumber', row.shotNumber)">{{ row.shotNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column label="条数" width="70" align="center" prop="takeCount" sortable>
          <template #default="{ row }">
            <div v-if="isEditing(row, 'takeCount')" @click.stop>
              <el-input 
                v-model="editValue" 
                size="small" 
                style="width: 50px"
                @keyup.enter="saveEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row)"
              />
            </div>
            <el-tag v-else size="small" type="info" class="editable-cell" @dblclick.stop="startEdit(row, 'takeCount', row.takeCount)">T{{ row.takeCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <div v-if="isEditing(row, 'status')" @click.stop>
              <el-select 
                v-model="editValue" 
                size="small" 
                style="width: 80px"
                @change="saveEdit(row)"
                @blur="cancelEdit"
              >
                <el-option label="通过" value="passed" />
                <el-option label="NG" value="ng" />
                <el-option label="补拍" value="retake" />
              </el-select>
            </div>
            <el-tag v-else :type="statusType(row.status)" size="small" effect="dark" class="editable-cell" @dblclick.stop="startEdit(row, 'status', row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <!-- 动态设备列 -->
        <el-table-column 
          v-for="colIdx in maxDevices" 
          :key="colIdx - 1"
          :label="`设备${colIdx}`"
          min-width="140"
        >
          <template #default="{ row }">
            <div v-if="row.equipment && row.equipment[colIdx - 1]" @dblclick.stop="openEquipmentEdit(row, colIdx - 1)">
              <el-tag
                size="small"
                :type="row.equipment[colIdx - 1].type === 'camera' ? 'primary' : 'success'"
                :effect="row.equipment[colIdx - 1].changeCard ? 'dark' : 'plain'"
                class="editable-cell equipment-tag"
              >
                {{ row.equipment[colIdx - 1].type === 'camera' ? '🎥' : '🎤' }} {{ row.equipment[colIdx - 1].fileCode }}
              </el-tag>
              <div class="equipment-meta" v-if="row.equipment[colIdx - 1].shotSize || row.equipment[colIdx - 1].remark">
                <span v-if="row.equipment[colIdx - 1].shotSize" class="meta-text">{{ row.equipment[colIdx - 1].shotSize }}</span>
                <span v-if="row.equipment[colIdx - 1].remark" class="meta-text">{{ row.equipment[colIdx - 1].remark }}</span>
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="场景/时间" width="100">
          <template #default="{ row }">
            <div v-if="isEditing(row, 'sceneType')" @click.stop>
              <el-select v-model="editValue" size="small" style="width: 50px" @change="saveEditSceneType(row)">
                <el-option label="内" value="int" />
                <el-option label="外" value="ext" />
              </el-select>
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'sceneType', row.sceneType)">{{ row.sceneType === 'int' ? '内' : '外' }}</span>
            /
            <div v-if="isEditing(row, 'timeOfDay')" @click.stop style="display: inline-block">
              <el-select v-model="editValue2" size="small" style="width: 50px" @change="saveEditTimeOfDay(row)">
                <el-option label="日" value="day" />
                <el-option label="夜" value="night" />
              </el-select>
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit2(row, 'timeOfDay', row.timeOfDay)">{{ row.timeOfDay === 'day' ? '日' : '夜' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="声音" width="80" align="center">
          <template #default="{ row }">
            <div v-if="isEditing(row, 'soundType')" @click.stop>
              <el-select v-model="editValue" size="small" style="width: 70px" @change="saveEdit(row, 'soundType')">
                <el-option label="-" value="none" />
                <el-option label="OS" value="os" />
                <el-option label="VO" value="vo" />
              </el-select>
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'soundType', row.soundType || 'none')">
              {{ row.soundType && row.soundType !== 'none' ? (row.soundType === 'os' ? 'OS' : 'VO') : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="演员" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="isEditing(row, 'actors')" @click.stop>
              <el-input 
                v-model="editValue" 
                size="small" 
                style="width: 100px"
                @keyup.enter="saveEdit(row, 'actors')"
                @keyup.esc="cancelEdit"
                @blur="saveEdit(row, 'actors')"
              />
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'actors', row.actors || '')">{{ row.actors || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            <div v-if="isEditing(row, 'date')" @click.stop>
              <el-date-picker 
                v-model="editValue" 
                size="small" 
                style="width: 110px"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                @change="saveEdit(row, 'date')"
              />
            </div>
            <span v-else class="editable-cell" @dblclick.stop="startEdit(row, 'date', row.date || '')">{{ row.date || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="danger" @click.stop="handleDelete(row.id)" title="删除">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-empty v-if="filteredRecords.length === 0" description="暂无记录，点击「新增记录」开始" />
    
    <!-- 设备编辑对话框 -->
    <el-dialog 
      v-model="equipmentDialogVisible" 
      title="编辑设备信息" 
      width="500px"
      @close="resetEquipmentEdit"
    >
      <el-form :model="equipmentForm" label-width="100px" v-if="equipmentForm">
        <el-form-item label="设备类型">
          <el-tag :type="equipmentForm.type === 'camera' ? 'primary' : 'success'">
            {{ equipmentForm.type === 'camera' ? '🎥 摄像机' : '🎤 录音设备' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="设备标识">
          <el-select v-model="equipmentForm.label" placeholder="选择设备标识" style="width: 100%" @change="updatePrefixes">
            <el-option 
              v-for="b in availableBindings" 
              :key="b.id" 
              :label="b.label" 
              :value="b.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文件名前缀">
          <el-select v-model="equipmentForm.prefix" placeholder="选择前缀" style="width: 100%" @change="onPrefixChange">
            <el-option 
              v-for="p in availablePrefixes" 
              :key="p" 
              :label="p" 
              :value="p"
            />
            <el-divider style="margin: 4px 0" />
            <el-option label="新建前缀" value="__ADD_NEW_PREFIX__" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件名">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-button size="small" @click="adjustFileName(-1)">-</el-button>
            <el-input v-model="equipmentForm.fileName" style="width: 100px" @input="updateFileCode" />
            <el-button size="small" @click="adjustFileName(1)">+</el-button>
          </div>
          <div class="file-code-preview">文件编码: {{ equipmentForm.fileCode }}</div>
        </el-form-item>
        <el-form-item label="景别" v-if="equipmentForm.type === 'camera'">
          <el-select v-model="equipmentForm.shotSize" placeholder="选择景别" style="width: 100%" clearable>
            <el-option label="全景" value="全景" />
            <el-option label="中景" value="中景" />
            <el-option label="近景" value="近景" />
            <el-option label="特写" value="特写" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="equipmentForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="换卡" v-if="equipmentForm.type === 'camera'">
          <el-checkbox v-model="equipmentForm.changeCard" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="equipmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEquipmentEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建前缀弹窗 -->
    <el-dialog v-model="addPrefixDialogVisible" title="➕ 新建前缀" width="400px">
      <p style="margin-bottom: 12px; color: #606266;">
        为「{{ addPrefixTargetLabel }}」添加新前缀：
      </p>
      <el-form :model="addPrefixForm" label-width="80px">
        <el-form-item label="前缀名称">
          <el-input v-model="addPrefixForm.newPrefix" placeholder="如：D、E、F..." @keyup.enter="confirmAddPrefix" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPrefixDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddPrefix">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Search, Plus, Location, Clock, User, Delete, Grid, List, Document, CircleCheck, CircleClose, RefreshRight, Calendar } from '@element-plus/icons-vue'
import { getRecords, deleteRecord, updateRecord, getProject, addPrefixToBinding } from '../stores/scriptStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EquipmentRecord, CameraBinding } from '../types/script'

const props = defineProps<{
  projectId: string | null
}>()

// 不再需要 emit edit

// 搜索和筛选
const searchText = ref('')
const filterStatus = ref('')
const filterSceneType = ref('')
const filterSoundType = ref('')

// 排序
const sortBy = ref('createdAt_desc')

// 视图模式
const viewMode = ref<'card' | 'table'>('card')

const records = computed(() => {
  if (!props.projectId) return []
  return getRecords(props.projectId)
})

const filteredRecords = computed(() => {
  let result = records.value
  
  // 文本搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(r => 
      r.sceneNumber.toLowerCase().includes(keyword) ||
      r.shotNumber.toLowerCase().includes(keyword) ||
      r.sceneDesc.toLowerCase().includes(keyword) ||
      r.actors.toLowerCase().includes(keyword) ||
      (r.equipment ?? []).some((eq: any) => eq.fileCode.toLowerCase().includes(keyword))
    )
  }
  
  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value)
  }
  
  // 场景类型筛选
  if (filterSceneType.value) {
    result = result.filter(r => r.sceneType === filterSceneType.value)
  }
  
  // 声音类型筛选
  if (filterSoundType.value) {
    result = result.filter(r => r.soundType === filterSoundType.value)
  }
  
  // 排序
  const [field, direction] = sortBy.value.split('_')
  result = [...result].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
      case 'scene':
        cmp = a.sceneNumber.localeCompare(b.sceneNumber)
        break
      case 'shot':
        cmp = a.shotNumber.localeCompare(b.shotNumber)
        break
      case 'take':
        cmp = a.takeCount - b.takeCount
        break
    }
    return direction === 'desc' ? -cmp : cmp
  })
  
  return result
})

// 设备信息已在模板中直接遍历 row.equipment 显示

// 计算最大设备数（用于动态生成设备列）
const maxDevices = computed(() => {
  if (!filteredRecords.value || filteredRecords.value.length === 0) return 0
  return Math.max(...filteredRecords.value.map(r => r.equipment?.length || 0))
})

function countByStatus(status: string): number {
  return filteredRecords.value.filter(r => r.status === status).length
}

function statusText(status: string) {
  return status === 'passed' ? '通过' : status === 'ng' ? 'NG' : '补拍'
}

function statusType(status: string) {
  return status === 'passed' ? 'success' : status === 'ng' ? 'danger' : 'warning'
}

// 行内编辑状态
const editingCell = ref<{ id: string; field: string } | null>(null)
const editValue = ref<string>('')
const editValue2 = ref<string>('') // 第二个编辑值（用于场景/时间同时编辑）

// 开始编辑单元格
function startEdit(row: any, field: string, currentValue: any) {
  editingCell.value = { id: row.id, field }
  editValue.value = String(currentValue || '')
}

// 开始编辑第二个字段
function startEdit2(row: any, field: string, currentValue: any) {
  editingCell.value = { id: row.id, field }
  editValue2.value = String(currentValue || '')
}

// 保存编辑
function saveEdit(row: any, field?: string) {
  if (!editingCell.value) return
  const targetField = field || editingCell.value.field
  let value: string | number = editValue.value
  
  // 类型转换
  if (targetField === 'takeCount') {
    value = parseInt(value) || 1
  }
  
  // 更新记录
  updateRecord(row.id, { [targetField]: value })
  
  editingCell.value = null
  editValue.value = ''
  ElMessage.success('已更新')
}

// 保存场景类型编辑
function saveEditSceneType(row: any) {
  if (!editingCell.value) return
  updateRecord(row.id, { sceneType: editValue.value as 'int' | 'ext' })
  editingCell.value = null
  editValue.value = ''
  ElMessage.success('已更新')
}

// 保存时间编辑
function saveEditTimeOfDay(row: any) {
  if (!editingCell.value) return
  updateRecord(row.id, { timeOfDay: editValue2.value as 'day' | 'night' })
  editingCell.value = null
  editValue2.value = ''
  ElMessage.success('已更新')
}

// 取消编辑
function cancelEdit() {
  editingCell.value = null
  editValue.value = ''
}

// 检查是否在编辑
function isEditing(row: any, field: string): boolean {
  return editingCell.value?.id === row.id && editingCell.value?.field === field
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    deleteRecord(id)
    ElMessage.success('删除成功')
  } catch {
    // 取消删除
  }
}

// ========== 设备编辑功能 ==========
const equipmentDialogVisible = ref(false)
const equipmentForm = ref<EquipmentRecord | null>(null)
const editingRecordId = ref<string | null>(null)
const editingEquipmentIndex = ref<number>(-1)

// 获取当前项目的设备绑定
const projectBindings = computed<CameraBinding[]>(() => {
  if (!props.projectId) return []
  const project = getProject(props.projectId)
  return project?.cameraBindings || []
})

// 根据设备类型过滤可用的绑定
const availableBindings = computed<CameraBinding[]>(() => {
  if (!equipmentForm.value) return []
  return projectBindings.value.filter(b => b.type === equipmentForm.value!.type)
})

// 获取当前选中设备标识对应的前缀列表
const availablePrefixes = computed<string[]>(() => {
  if (!equipmentForm.value) return []
  const binding = projectBindings.value.find(b => b.label === equipmentForm.value!.label)
  if (!binding || !binding.prefixes) return []
  return binding.prefixes.split(',').map(p => p.trim()).filter(p => p)
})

// 设备标识变更时，自动选择第一个前缀
function updatePrefixes() {
  if (availablePrefixes.value.length > 0 && !availablePrefixes.value.includes(equipmentForm.value!.prefix)) {
    equipmentForm.value!.prefix = availablePrefixes.value[0]
  }
  updateFileCode()
}

// 更新文件编码
function updateFileCode() {
  if (!equipmentForm.value) return
  const label = equipmentForm.value.label
  // 获取设备字母（第一个字符，如 A机位 -> A）
  const deviceLetter = label ? label.charAt(0).toUpperCase() : ''
  equipmentForm.value.fileCode = `${deviceLetter}-${equipmentForm.value.prefix}${equipmentForm.value.fileName}`
}

// 前缀变化处理（检测特殊值）
function onPrefixChange(prefix: string) {
  if (prefix === '__ADD_NEW_PREFIX__') {
    // 重置为空，打开新建对话框
    if (equipmentForm.value) {
      equipmentForm.value.prefix = ''
    }
    openAddPrefixDialog()
  } else {
    updateFileCode()
  }
}

// 调整文件名编号
function adjustFileName(delta: number) {
  if (!equipmentForm.value) return
  let num = parseInt(equipmentForm.value.fileName) || 1
  num = Math.max(1, num + delta)
  equipmentForm.value.fileName = String(num).padStart(3, '0')
  updateFileCode()
}

// 打开设备编辑对话框
function openEquipmentEdit(row: any, equipmentIndex: number) {
  editingRecordId.value = row.id
  editingEquipmentIndex.value = equipmentIndex
  // 深拷贝设备数据
  equipmentForm.value = JSON.parse(JSON.stringify(row.equipment[equipmentIndex]))
  equipmentDialogVisible.value = true
}

// 重置设备编辑状态
function resetEquipmentEdit() {
  equipmentForm.value = null
  editingRecordId.value = null
  editingEquipmentIndex.value = -1
}

// 保存设备编辑
function saveEquipmentEdit() {
  if (!editingRecordId.value || !equipmentForm.value || editingEquipmentIndex.value < 0) return
  
  // 获取当前记录
  const record = records.value.find(r => r.id === editingRecordId.value)
  if (!record) return
  
  // 更新设备数据
  const updatedEquipment = [...record.equipment]
  updatedEquipment[editingEquipmentIndex.value] = { ...equipmentForm.value }
  
  // 保存到 store
  updateRecord(editingRecordId.value, { equipment: updatedEquipment })
  
  // 关闭对话框
  equipmentDialogVisible.value = false
  resetEquipmentEdit()
  
  ElMessage.success('设备信息已更新')
}

// ========== 新建前缀功能 ==========
const addPrefixDialogVisible = ref(false)
const addPrefixTargetLabel = ref('')
const addPrefixForm = reactive({ newPrefix: '' })

function openAddPrefixDialog() {
  if (!equipmentForm.value?.label) {
    ElMessage.warning('请先选择设备标识')
    return
  }
  addPrefixTargetLabel.value = equipmentForm.value.label
  addPrefixForm.newPrefix = ''
  addPrefixDialogVisible.value = true
}

function confirmAddPrefix() {
  if (!addPrefixForm.newPrefix.trim()) {
    ElMessage.warning('请输入前缀名称')
    return
  }
  
  if (!props.projectId) return
  
  const success = addPrefixToBinding(props.projectId, addPrefixTargetLabel.value, addPrefixForm.newPrefix.trim())
  if (success) {
    ElMessage.success(`已为「${addPrefixTargetLabel.value}」添加前缀「${addPrefixForm.newPrefix.trim()}」`)
    // 自动选中新添加的前缀
    if (equipmentForm.value) {
      equipmentForm.value.prefix = addPrefixForm.newPrefix.trim()
      updateFileCode()
    }
    addPrefixDialogVisible.value = false
  } else {
    ElMessage.error('添加失败，前缀可能已存在')
  }
}
</script>

<style scoped>
.script-list {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 统计摘要 */
.stats-bar {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-item.status-passed {
  color: #67c23a;
}

.stats-item.status-ng {
  color: #f56c6c;
}

.stats-item.status-retake {
  color: #e6a23c;
}

/* 卡片视图样式 */
.record-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #fff;
  transition: all 0.2s;
  flex-wrap: wrap;
  cursor: pointer;
}

.record-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-color: #c0c4cc;
}

.record-card.status-passed {
  border-left: 4px solid #67c23a;
}

.record-card.status-ng {
  border-left: 4px solid #f56c6c;
}

.record-card.status-retake {
  border-left: 4px solid #e6a23c;
}

.card-main {
  flex: 1;
  min-width: 200px;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.scene-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-number {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.shot-number {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.take-badge {
  background: #ecf5ff;
  color: #409eff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item.actors {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.card-date {
  font-size: 12px;
  color: #909399;
}

/* 设备信息：每个设备独立一列 */
.card-equipment {
  min-width: 200px;
}

.equipment-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  font-weight: 500;
}

.equipment-columns {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.equipment-column {
  display: flex;
  align-items: center;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
}

.card-notes {
  width: 100%;
  margin-top: 8px;
}

.note-item {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.note-label {
  font-weight: 500;
  color: #909399;
}

/* 表格视图 */
.record-table {
  margin-top: 16px;
}

.text-muted {
  color: #c0c4cc;
}

.change-card-tag {
  background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%) !important;
  border-color: transparent !important;
}

/* 可编辑单元格 */
.editable-cell {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.editable-cell:hover {
  background-color: #f0f2f5;
}

/* 设备列样式 */
.equipment-tag {
  cursor: pointer;
}

.equipment-meta {
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.meta-text {
  display: block;
  line-height: 1.4;
}

/* 文件编码预览 */
.file-code-preview {
  margin-top: 8px;
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
}
</style>
