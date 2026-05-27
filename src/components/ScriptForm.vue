<template>
  <div class="script-form">
    <!-- 上一条记录摘要（悬浮 sticky，不随页面滚动隐藏） -->
    <div v-if="!isEdit && lastRecord" class="sticky-summary-wrapper">
      <el-card class="form-card prev-summary">
        <template #header>
          <span>📌 上一条记录</span>
        </template>
        <div class="prev-summary-content">
          <div class="prev-summary-grid">
            <div class="prev-field">
              <span class="prev-label">场景</span>
              <span class="prev-value">{{ lastRecord.sceneNumber }}</span>
            </div>
            <div class="prev-field">
              <span class="prev-label">镜号</span>
              <span class="prev-value">{{ lastRecord.shotNumber }}</span>
            </div>
            <div class="prev-field">
              <span class="prev-label">条数</span>
              <span class="prev-value">T{{ lastRecord.takeCount }}</span>
            </div>
            <div class="prev-field">
              <span class="prev-label">场景</span>
              <span class="prev-value">{{ lastRecord.sceneType === 'int' ? '内景' : '外景' }} / {{ lastRecord.timeOfDay === 'day' ? '日' : '夜' }}</span>
            </div>
            <div class="prev-field">
              <span class="prev-label">状态</span>
              <span class="prev-value">
                <el-tag size="small" :type="statusType(lastRecord.status)">{{ statusText(lastRecord.status) }}</el-tag>
              </span>
            </div>
            <div class="prev-field" v-if="lastRecord.soundType && lastRecord.soundType !== 'none'">
              <span class="prev-label">声音</span>
              <span class="prev-value">
                <el-tag size="small" type="info">{{ lastRecord.soundType === 'os' ? 'OS' : 'VO' }}</el-tag>
              </span>
            </div>
            <div class="prev-field" v-if="lastRecord.actors">
              <span class="prev-label">演员</span>
              <span class="prev-value">{{ lastRecord.actors }}</span>
            </div>
          </div>
          <div v-if="lastRecord.equipment && lastRecord.equipment.length > 0" class="prev-equipment">
            <span class="prev-eq-label">设备文件编码：</span>
            <el-tag
              v-for="eq in lastRecord.equipment"
              :key="eq.id"
              size="small"
              :type="eq.type === 'camera' ? 'primary' : 'success'"
              style="margin-right: 6px; margin-top: 4px"
            >
              {{ eq.type === 'camera' ? '🎥' : '🎤' }} {{ eq.fileCode }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">

      <!-- 基本信息：场景 + 镜号合并 -->
      <el-card class="form-card">
        <template #header><span>📋 基本信息</span></template>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="场景号" prop="sceneNumber">
              <el-input ref="sceneNumberInput" v-model="form.sceneNumber" placeholder="如：A001" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="镜号" prop="shotNumber">
              <el-input v-model="form.shotNumber" placeholder="如：01" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="条数" prop="takeCount">
              <el-input-number v-model="form.takeCount" :min="1" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="passed"><el-tag type="success" size="small">✅ 通过</el-tag></el-radio>
                <el-radio value="ng"><el-tag type="danger" size="small">❌ NG</el-tag></el-radio>
                <el-radio value="retake"><el-tag type="warning" size="small">🔄 补拍</el-tag></el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="场景类型" prop="sceneType">
              <el-radio-group v-model="form.sceneType">
                <el-radio value="int">内景</el-radio>
                <el-radio value="ext">外景</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="时段" prop="timeOfDay">
              <el-radio-group v-model="form.timeOfDay">
                <el-radio value="day">日</el-radio>
                <el-radio value="night">夜</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="声音" prop="soundType">
              <el-radio-group v-model="form.soundType">
                <el-radio value="none">无</el-radio>
                <el-radio value="os">OS</el-radio>
                <el-radio value="vo">VO</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 备注信息 -->
      <el-card class="form-card">
        <template #header><span>📝 备注信息</span></template>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="演员" prop="actors">
              <el-input v-model="form.actors" placeholder="点击预设多选" />
              <div class="preset-tags" v-if="actorPresets.length">
                <span
                  v-for="p in actorPresets"
                  :key="p"
                  class="preset-tag"
                  :class="{ active: isPresetSelected('actors', p) }"
                  @click="togglePreset('actors', p)"
                >{{ p }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="导演备注" prop="directorNote">
              <el-input v-model="form.directorNote" placeholder="点击预设多选" />
              <div class="preset-tags" v-if="directorNotePresets.length">
                <span
                  v-for="p in directorNotePresets"
                  :key="p"
                  class="preset-tag"
                  :class="{ active: isPresetSelected('directorNote', p) }"
                  @click="togglePreset('directorNote', p)"
                >{{ p }}</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="摄影备注" prop="cameraNote">
              <el-input v-model="form.cameraNote" placeholder="点击预设多选" />
              <div class="preset-tags" v-if="cameraNotePresets.length">
                <span
                  v-for="p in cameraNotePresets"
                  :key="p"
                  class="preset-tag"
                  :class="{ active: isPresetSelected('cameraNote', p) }"
                  @click="togglePreset('cameraNote', p)"
                >{{ p }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="场记备注" prop="note">
              <el-input v-model="form.note" placeholder="点击预设多选" />
              <div class="preset-tags" v-if="notePresets.length">
                <span
                  v-for="p in notePresets"
                  :key="p"
                  class="preset-tag"
                  :class="{ active: isPresetSelected('note', p) }"
                  @click="togglePreset('note', p)"
                >{{ p }}</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 设备与文件编码 -->
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>🎥🎤 设备与文件编码</span>
          </div>
        </template>

        <div v-if="equipmentList.length === 0" class="empty-tip">
          暂无设备，请在项目设置中配置机位绑定
        </div>

        <div
          v-for="(eq, idx) in equipmentList"
          :key="eq.id"
          class="equipment-row"
          :class="{ 'disabled-row': !eq.enabled }"
        >
          <!-- 单行布局：启用/换卡/类型/标识/景别/前缀/文件名/文件编码 -->
          <el-row :gutter="0" class="equipment-row-inner">
            <el-col :span="2">
              <el-form-item class="compact-item" style="margin-top: 22px">
                <el-checkbox v-model="eq.enabled" size="small">
                  <span :class="{ 'disabled-text': !eq.enabled }">{{ eq.enabled ? '启用' : '禁用' }}</span>
                </el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-form-item class="compact-item" style="margin-top: 22px">
                <el-checkbox v-model="eq.changeCard" size="small" @change="onChangeCard(idx)" :disabled="!eq.enabled">
                  <span :class="{ 'change-card-tag': eq.changeCard, 'disabled-text': !eq.enabled }">换卡</span>
                </el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="类型" :prop="`equipment.${idx}.type`" class="compact-item">
                <el-select v-model="eq.type" placeholder="类型" size="small" @change="onEquipmentTypeChange(idx)" style="width: 100%" :disabled="!eq.enabled">
                  <el-option label="摄像机" value="camera" />
                  <el-option label="录音设备" value="audio" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="标识" :prop="`equipment.${idx}.label`" class="compact-item">
                <el-select v-model="eq.label" placeholder="机位" size="small" clearable @change="onLabelChange(idx)" style="width: 100%" :disabled="!eq.enabled">
                  <el-option v-for="b in filteredBindings(eq.type)" :key="b.id" :label="b.label" :value="b.label" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="eq.type === 'camera'" :span="3">
              <el-form-item label="景别" :prop="`equipment.${idx}.shotSize`" class="compact-item">
                <el-select v-model="eq.shotSize" placeholder="景别" size="small" clearable @change="tryGenerateFileCode(idx)" style="width: 100%" :disabled="!eq.enabled">
                  <el-option label="全景" value="全景" />
                  <el-option label="中景" value="中景" />
                  <el-option label="近景" value="近景" />
                  <el-option label="特写" value="特写" />
                  <el-option label="大特写" value="大特写" />
                  <el-option label="双人" value="双人" />
                  <el-option label="过肩" value="过肩" />
                  <el-option label="主观镜头" value="主观镜头" />
                  <el-option label="航拍" value="航拍" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="前缀" :prop="`equipment.${idx}.prefix`" class="compact-item">
                <el-select v-model="eq.prefix" placeholder="前缀" size="small" clearable @change="onPrefixChange(idx, eq.prefix)" style="width: 100%" :disabled="!eq.enabled">
                  <el-option v-for="pf in availablePrefixes(eq)" :key="pf" :label="pf" :value="pf" />
                  <el-divider style="margin: 4px 0" />
                  <el-option label="新建前缀" value="__ADD_NEW_PREFIX__" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="文件名" :prop="`equipment.${idx}.fileName`" class="compact-item">
                <div class="file-name-compact">
                  <el-button size="small" @click="adjustFileName(idx, -1)" class="adj-btn" circle :disabled="!eq.enabled"><el-icon><Minus /></el-icon></el-button>
                  <el-input v-model="eq.fileName" size="small" placeholder="001" @blur="onFileNameBlur(idx)" style="width: 60px" :disabled="!eq.enabled" />
                  <el-button size="small" @click="adjustFileName(idx, 1)" class="adj-btn" circle :disabled="!eq.enabled"><el-icon><Plus /></el-icon></el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="3">
              <el-form-item label="文件编码" :prop="`equipment.${idx}.fileCode`" class="compact-item">
                <el-input v-model="eq.fileCode" size="small" placeholder="自动" readonly :disabled="!eq.enabled" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="format-hint">
          📌 文件编码格式：{设备字母}-{文件名前缀}{文件名}，如 <code>A-C001</code>（设备A + 前缀C + 文件名001）
        </div>
      </el-card>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '保存并新增' }}
        </el-button>
      </div>
    </el-form>

    <!-- 换卡时新建前缀弹窗 -->
    <el-dialog v-model="changeCardDialogVisible" title="📋 换卡 — 新建前缀" width="400px" append-to-body @close="onChangeCardDialogClose">
      <p style="margin-bottom: 12px; color: #606266;">
        为「{{ changeCardCurrentLabel }}」新建前缀（换卡后文件编码从头开始）：
      </p>
      <el-form :model="changeCardForm" ref="changeCardFormRef" label-width="80px">
        <el-form-item label="前缀名称" prop="newPrefix" :rules="[{ required: true, message: '请输入前缀名称', trigger: 'blur' }]">
          <el-input v-model="changeCardForm.newPrefix" placeholder="如：D、E、F..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelChangeCard">取消</el-button>
        <el-button type="primary" @click="confirmChangeCard">确认换卡</el-button>
      </template>
    </el-dialog>

    <!-- 文件编码重复确认弹窗 -->
    <el-dialog v-model="duplicateDialogVisible" title="⚠️ 文件编码重复确认" width="420px" append-to-body>
      <p style="color: #e6a23c; font-weight: 600; margin-bottom: 8px;">
        检测到以下文件编码与已有记录重复：
      </p>
      <div class="duplicate-list">
        <el-tag
          v-for="(code, i) in duplicateFileCodes"
          :key="i"
          type="danger"
          style="margin: 4px"
        >{{ code }}</el-tag>
      </div>
      <p style="margin-top: 12px; color: #909399; font-size: 13px;">
        是否仍然保存？如确认请点击「仍然保存」。
      </p>
      <template #footer>
        <el-button @click="duplicateDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="confirmDuplicate">仍然保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建前缀弹窗 -->
    <el-dialog v-model="addPrefixDialogVisible" title="➕ 新建前缀" width="400px" append-to-body>
      <p style="margin-bottom: 12px; color: #606266;">
        为「{{ addPrefixTargetLabel }}」添加新前缀：
      </p>
      <el-form :model="addPrefixForm" ref="addPrefixFormRef" label-width="80px">
        <el-form-item label="前缀名称" prop="newPrefix" :rules="[{ required: true, message: '请输入前缀名称', trigger: 'blur' }]">
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
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { Plus, Minus } from '@element-plus/icons-vue'
import { ElMessage, ElNotification } from 'element-plus'
import { useScriptStore, addPrefixToBinding } from '../stores/scriptStore'
import type { ScriptRecord, EquipmentRecord, Project, CameraBinding } from '../types/script'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  projectId: string
  record?: ScriptRecord | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const store = useScriptStore()
const formRef = ref()
const changeCardFormRef = ref()
const addPrefixFormRef = ref()
const sceneNumberInput = ref<HTMLInputElement | null>(null)

const isEdit = computed(() => !!props.record)

const form = reactive({
  projectId: props.projectId,
  date: new Date().toISOString().split('T')[0],
  sceneNumber: '',
  shotNumber: '',
  takeCount: 1,
  status: 'passed' as 'passed' | 'ng' | 'retake',
  sceneType: 'int' as 'int' | 'ext',
  timeOfDay: 'day' as 'day' | 'night',
  soundType: 'none' as 'none' | 'os' | 'vo',
  actors: '',
  directorNote: '',
  cameraNote: '',
  note: '',
  equipment: [] as EquipmentRecord[],
})

const equipmentList = reactive<EquipmentRecord[]>([])

const submitting = ref(false)

// 从项目机位绑定生成设备列表
function initEquipmentFromBindings() {
  const project = getProject()
  if (!project || !project.cameraBindings || project.cameraBindings.length === 0) {
    equipmentList.splice(0, equipmentList.length)
    return
  }

  // 保存当前设备的启用状态（如果有的话）
  const currentEnabledStatus = new Map<string, boolean>()
  for (const eq of equipmentList) {
    if (eq.label) {
      currentEnabledStatus.set(eq.label, eq.enabled ?? true)
    }
  }

  // 按机位绑定顺序生成设备列表
  const bindings = project.cameraBindings
  const newEquipment: EquipmentRecord[] = bindings.map((binding: CameraBinding) => {
    // 检查上一条记录中该设备的启用状态
    let enabled = true // 默认启用
    
    // 如果有上一条记录，参考上一条记录中该设备的启用状态
    if (lastRecord.value?.equipment) {
      const lastEq = lastRecord.value.equipment.find(e => e.label === binding.label)
      if (lastEq) {
        enabled = lastEq.enabled ?? true
      }
    }
    
    // 如果当前已有该设备的启用状态，优先使用（保存后重置表单时）
    if (currentEnabledStatus.has(binding.label)) {
      enabled = currentEnabledStatus.get(binding.label)!
    }
    
    // 默认前缀：先查找历史记录中该设备标识最后一次使用的前缀，否则用绑定中的第一个前缀
    let prefix = getLastPrefixForDevice(binding.label)
    if (!prefix && binding.prefixes) {
      prefix = binding.prefixes.split(',')[0].trim()
    }
    // 查找历史记录中该设备标识+前缀的最大文件名
    const lastFileName = getLastFileNameForDevice(binding.label, prefix)
    const nextFileNum = parseInt(lastFileName || '0', 10) + 1
    
    return {
      id: uuidv4(),
      type: binding.type,
      label: binding.label,
      prefix: prefix,
      shotSize: '',
      fileName: String(nextFileNum).padStart(3, '0'),
      fileCode: '',
      changeCard: false,
      remark: '',
      enabled: enabled,
    }
  })

  equipmentList.splice(0, equipmentList.length, ...newEquipment)
  
  // 初始化后自动尝试生成文件编码
  for (let i = 0; i < equipmentList.length; i++) {
    tryGenerateFileCode(i)
  }
}
const lastRecord = ref<ScriptRecord | null>(null)

// 表单数据持久化 key
const FORM_STORAGE_KEY = 'script-clerk-unsaved-form'

// 恢复未保存的表单数据
function restoreFormFromStorage() {
  try {
    const saved = localStorage.getItem(FORM_STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.projectId === props.projectId && !props.record) {
        Object.assign(form, data.form)
        // 恢复时保留 enabled 状态
        if (data.equipment && data.equipment.length > 0) {
          equipmentList.splice(0, equipmentList.length, ...(data.equipment || []))
        }
        console.log('[Form] 已从本地恢复未保存的表单数据')
      }
    }
  } catch (e) {
    console.error('恢复表单数据失败', e)
  }
}

// 保存表单数据到本地
function saveFormToStorage() {
  try {
    const data = {
      projectId: props.projectId,
      form: { ...form },
      equipment: JSON.parse(JSON.stringify(equipmentList))
    }
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存表单数据失败', e)
  }
}

// 清除本地保存的表单数据
function clearFormStorage() {
  localStorage.removeItem(FORM_STORAGE_KEY)
}

// 切换预设值（多选）
function togglePreset(field: string, value: string) {
  const current = (form as any)[field] || ''
  const values = current ? current.split('、').map((v: string) => v.trim()).filter(Boolean) : []
  const idx = values.indexOf(value)
  if (idx >= 0) {
    values.splice(idx, 1)
  } else {
    values.push(value)
  }
  (form as any)[field] = values.join('、')
}

// 检查预设值是否选中
function isPresetSelected(field: string, value: string): boolean {
  const current = (form as any)[field] || ''
  const values = current ? current.split('、').map((v: string) => v.trim()).filter(Boolean) : []
  return values.includes(value)
}

// 初始化表单（新建/编辑）
function initForm() {
  if (props.record) {
    Object.assign(form, {
      projectId: props.record.projectId,
      date: props.record.date,
      sceneNumber: props.record.sceneNumber,
      shotNumber: props.record.shotNumber,
      takeCount: props.record.takeCount,
      status: props.record.status,
      sceneType: props.record.sceneType,
      timeOfDay: props.record.timeOfDay,
      soundType: props.record.soundType,
      actors: props.record.actors,
      directorNote: props.record.directorNote,
      cameraNote: props.record.cameraNote,
      note: props.record.note,
    })
    // 编辑模式：直接使用记录中的设备数据
    equipmentList.splice(0, equipmentList.length, ...JSON.parse(JSON.stringify(props.record.equipment || [])))
  } else {
    restoreFormFromStorage()
    // 如果没有从本地恢复设备数据，则从项目绑定初始化
    if (equipmentList.length === 0) {
      initEquipmentFromBindings()
    }
    // 如果有上一条记录，继承启用的设备
    if (lastRecord.value?.equipment) {
      inheritFromLastRecord()
    }
    if (lastRecord.value) {
      if (!form.sceneNumber) form.sceneNumber = lastRecord.value.sceneNumber || ''
      if (!form.shotNumber) form.shotNumber = lastRecord.value.shotNumber || ''
      
      // 新增：如果场景号和镜号相同，条数自动+1
      if (form.sceneNumber === lastRecord.value.sceneNumber && form.shotNumber === lastRecord.value.shotNumber) {
        form.takeCount = lastRecord.value.takeCount + 1
      }
    }
  }
}

/**
 * 获取某个设备标识在历史记录中的最大文件名
 * @param label 设备标识
 * @returns 最大文件名（数字字符串），如果没有记录则返回 '000'
 */
function getLastFileNameForDevice(label: string, prefix: string): string {
  const allRecords = store.getRecords(props.projectId)
  let maxFileNum = 0

  for (const record of allRecords) {
    if (record.equipment && record.equipment.length > 0) {
      for (const eq of record.equipment) {
        if (eq.label === label && eq.prefix === prefix && eq.fileName) {
          const num = parseInt(eq.fileName, 10)
          if (!isNaN(num) && num > maxFileNum) {
            maxFileNum = num
          }
        }
      }
    }
  }

  return String(maxFileNum).padStart(3, '0')
}

/**
 * 获取某个设备标识在历史记录中最后一次使用的前缀
 * @param label 设备标识
 * @returns 最后一次使用的前缀，如果没有记录则返回空字符串
 */
function getLastPrefixForDevice(label: string): string {
  const allRecords = store.getRecords(props.projectId)
  let lastPrefix = ''
  let lastDate = ''

  for (const record of allRecords) {
    if (record.equipment && record.equipment.length > 0) {
      for (const eq of record.equipment) {
        if (eq.label === label && eq.prefix) {
          // 简单处理：取最后一条记录的前缀（假设记录按时间顺序添加）
          if (!lastDate || record.createdAt >= lastDate) {
            lastPrefix = eq.prefix
            lastDate = record.createdAt
          }
        }
      }
    }
  }

  return lastPrefix
}

// 从 lastRecord 继承设备信息（继承每个设备的启用状态）
function inheritFromLastRecord() {
  // 处理每个设备
  for (let i = 0; i < equipmentList.length; i++) {
    const eq = equipmentList[i]
    
    // 如果有上一条记录，继承启用状态
    if (lastRecord.value?.equipment) {
      const lastEq = lastRecord.value.equipment.find(e => e.label === eq.label)
      if (lastEq) {
        eq.enabled = lastEq.enabled
        
        if (eq.enabled) {
          eq.type = lastEq.type
          eq.prefix = lastEq.prefix
          eq.shotSize = lastEq.shotSize || ''
        }
      }
    }
    
    // 只要设备启用，就根据历史记录中同标识+同前缀的最大文件名+1
    if (eq.enabled && eq.label && eq.prefix) {
      const lastFileName = getLastFileNameForDevice(eq.label, eq.prefix)
      eq.fileName = String(parseInt(lastFileName || '0', 10) + 1).padStart(3, '0')
      eq.fileCode = ''
      eq.changeCard = false
      tryGenerateFileCode(i)
    }
  }
}

// 换卡弹窗
const changeCardDialogVisible = ref(false)
const changeCardIndex = ref(-1)
const changeCardCurrentLabel = ref('')
const changeCardForm = reactive({ newPrefix: '' })

// 重复文件编码弹窗
const duplicateDialogVisible = ref(false)
const duplicateFileCodes = ref<string[]>([])

// 预设
const actorPresets = computed<string[]>(() => {
  const project = store.getProjects().find(p => p.id === props.projectId)
  return project?.presets?.filter(p => p.category === 'actors').map(p => p.value) ?? []
})
const directorNotePresets = computed<string[]>(() => {
  const project = store.getProjects().find(p => p.id === props.projectId)
  return project?.presets?.filter(p => p.category === 'directorNote').map(p => p.value) ?? []
})
const cameraNotePresets = computed<string[]>(() => {
  const project = store.getProjects().find(p => p.id === props.projectId)
  return project?.presets?.filter(p => p.category === 'cameraNote').map(p => p.value) ?? []
})
const notePresets = computed<string[]>(() => {
  const project = store.getProjects().find(p => p.id === props.projectId)
  return project?.presets?.filter(p => p.category === 'note').map(p => p.value) ?? []
})

// 表单验证规则
const rules = {
  sceneNumber: [{ required: true, message: '请输入场景号', trigger: 'blur' }],
  shotNumber: [{ required: true, message: '请输入镜号', trigger: 'blur' }],
}

// 状态映射
function statusType(s: string) {
  return s === 'passed' ? 'success' : s === 'ng' ? 'danger' : 'warning'
}
function statusText(s: string) {
  return s === 'passed' ? '通过' : s === 'ng' ? 'NG' : '补拍'
}

// 项目绑定的机位
function getProject(): Project | undefined {
  return store.getProjects().find(p => p.id === props.projectId)
}

function filteredBindings(type: string) {
  const project = getProject()
  if (!project) return []
  return (project.cameraBindings ?? []).filter(b => b.type === type)
}

function availablePrefixes(eq: EquipmentRecord): string[] {
  const project = getProject()
  if (!project) return []
  const binding = (project.cameraBindings ?? []).find(b => b.label === eq.label)
  if (!binding?.prefixes) return []
  return binding.prefixes.split(',').map(s => s.trim()).filter(Boolean)
}

// ========== 新建前缀功能 ==========
const addPrefixDialogVisible = ref(false)
const addPrefixTargetLabel = ref('')
const addPrefixTargetEquipmentIndex = ref(-1)
const addPrefixForm = reactive({ newPrefix: '' })

function openAddPrefixDialog(eq: EquipmentRecord) {
  if (!eq.label) {
    ElMessage.warning('请先选择设备标识')
    return
  }
  addPrefixTargetLabel.value = eq.label
  addPrefixTargetEquipmentIndex.value = equipmentList.indexOf(eq)
  addPrefixForm.newPrefix = ''
  addPrefixDialogVisible.value = true
}

function confirmAddPrefix() {
  if (!addPrefixForm.newPrefix.trim()) {
    ElMessage.warning('请输入前缀名称')
    return
  }

  const success = addPrefixToBinding(props.projectId, addPrefixTargetLabel.value, addPrefixForm.newPrefix.trim())
  if (success) {
    ElMessage.success(`已为「${addPrefixTargetLabel.value}」添加前缀「${addPrefixForm.newPrefix.trim()}」`)
    if (addPrefixTargetEquipmentIndex.value >= 0) {
      equipmentList[addPrefixTargetEquipmentIndex.value].prefix = addPrefixForm.newPrefix.trim()
      tryGenerateFileCode(addPrefixTargetEquipmentIndex.value)
    }
    addPrefixDialogVisible.value = false
  } else {
    ElMessage.error('添加失败，前缀可能已存在')
  }
}

// 设备类型变化时重置标识
function onEquipmentTypeChange(idx: number) {
  equipmentList[idx].label = ''
  equipmentList[idx].prefix = ''
  equipmentList[idx].fileCode = ''
}

// 标识变化时尝试自动生成
function onLabelChange(idx: number) {
  const eq = equipmentList[idx]
  
  // 如果已经有 prefix，查找历史最大文件名并+1
  if (eq.label && eq.prefix) {
    const lastFileName = getLastFileNameForDevice(eq.label, eq.prefix)
    eq.fileName = String(parseInt(lastFileName || '0', 10) + 1).padStart(3, '0')
  } else if (lastRecord.value?.equipment) {
    const prevEq = lastRecord.value.equipment.find(e => e.label === eq.label)
    if (prevEq?.prefix) {
      eq.prefix = prevEq.prefix
      // 查找历史最大文件名并+1
      const lastFileName = getLastFileNameForDevice(eq.label, eq.prefix)
      eq.fileName = String(parseInt(lastFileName || '0', 10) + 1).padStart(3, '0')
    }
  }
  tryGenerateFileCode(idx)
}

// 尝试生成文件编码
function tryGenerateFileCode(idx: number) {
  const eq = equipmentList[idx]
  if (eq.prefix && eq.fileName) {
    const letter = calcDeviceLetter(eq)
    eq.fileCode = `${letter}-${eq.prefix}${eq.fileName}`
  }
}

// 前缀变化处理（检测特殊值）
function onPrefixChange(idx: number, prefix: string) {
  if (prefix === '__ADD_NEW_PREFIX__') {
    equipmentList[idx].prefix = ''
    openAddPrefixDialog(equipmentList[idx])
  } else {
    // 查找历史最大文件名并+1
    const eq = equipmentList[idx]
    if (eq.label && prefix) {
      const lastFileName = getLastFileNameForDevice(eq.label, prefix)
      eq.fileName = String(parseInt(lastFileName || '0', 10) + 1).padStart(3, '0')
    }
    tryGenerateFileCode(idx)
  }
}

// 计算设备字母（A/B/C...）基于 label 中的机位字母
function calcDeviceLetter(eq: EquipmentRecord): string {
  if (eq.label && /^[A-Z]/i.test(eq.label)) {
    return eq.label.charAt(0).toUpperCase()
  }
  const sameType = equipmentList.filter(e => e.type === eq.type)
  const pos = sameType.indexOf(eq)
  return String.fromCharCode(65 + pos)
}

// 文件名失去焦点时补零
function onFileNameBlur(idx: number) {
  const eq = equipmentList[idx]
  if (eq.fileName) {
    eq.fileName = eq.fileName.padStart(3, '0')
    tryGenerateFileCode(idx)
  }
}

// 调整文件名 ±1
function adjustFileName(idx: number, delta: number) {
  const eq = equipmentList[idx]
  const num = parseInt(eq.fileName || '0', 10)
  const newNum = Math.max(0, num + delta)
  eq.fileName = String(newNum).padStart(3, '0')
  tryGenerateFileCode(idx)
}

// 换卡
function onChangeCard(idx: number) {
  const eq = equipmentList[idx]
  if (eq.changeCard) {
    changeCardIndex.value = idx
    changeCardCurrentLabel.value = eq.label || `设备${idx + 1}`
    changeCardForm.newPrefix = ''
    changeCardDialogVisible.value = true
  }
}

function confirmChangeCard() {
  const eq = equipmentList[changeCardIndex.value]
  if (eq && changeCardForm.newPrefix) {
    // 自动将新前缀添加到项目设置的机位绑定中
    addPrefixToBinding(props.projectId, eq.label, changeCardForm.newPrefix)
    eq.prefix = changeCardForm.newPrefix
    eq.fileName = '001'
    tryGenerateFileCode(changeCardIndex.value)
  }
  changeCardDialogVisible.value = false
  changeCardIndex.value = -1
}

// 换卡弹窗关闭时的处理（点击X号或取消）
function onChangeCardDialogClose() {
  // 取消勾选换卡选项
  if (changeCardIndex.value >= 0 && changeCardIndex.value < equipmentList.length) {
    equipmentList[changeCardIndex.value].changeCard = false
  }
  changeCardIndex.value = -1
}

// 取消换卡按钮
function cancelChangeCard() {
  changeCardDialogVisible.value = false
  onChangeCardDialogClose()
}

/**
 * 检查文件编码是否重复
 */
function findDuplicateFileCodes(): string[] {
  const allRecords = store.getRecords(props.projectId)
  const duplicates: string[] = []
  // 只检查启用的设备
  for (const eq of equipmentList) {
    if (!eq.enabled || !eq.fileCode) continue
    const match = allRecords.find(r =>
      r.id !== props.record?.id && r.equipment?.some(e => e.fileCode === eq.fileCode)
    )
    if (match) {
      duplicates.push(eq.fileCode)
    }
  }
  return [...new Set(duplicates)]
}

/**
 * 真正的保存逻辑
 */
async function doSave() {
  const projectName = store.getProjectName(props.projectId)
  // 只保存启用的设备
  const enabledEquipment = equipmentList.filter(eq => eq.enabled)
  const payload = {
    ...form,
    projectName,
    equipment: JSON.parse(JSON.stringify(enabledEquipment)),
  }
  if (isEdit.value && props.record) {
    store.updateRecord(props.record.id, payload)
  } else {
    store.addRecord(payload as any)
  }

  // 新建模式下，重新初始化表单数据（条数和文件名+1）
  if (!isEdit.value) {
    // 保存当前场景号和镜号
    const savedSceneNumber = form.sceneNumber
    const savedShotNumber = form.shotNumber

    // 更新 lastRecord 为刚刚保存的记录
    lastRecord.value = store.getLastRecord(props.projectId)

    // 重置表单字段
    form.status = 'passed'
    form.actors = ''
    form.directorNote = ''
    form.cameraNote = ''
    form.note = ''

    // 保存当前设备的启用状态
    const currentEnabledStatus = equipmentList.map(eq => ({ label: eq.label, enabled: eq.enabled }))
    
    // 重新从项目绑定初始化设备（保持启用状态）
    initEquipmentFromBindings()
    
    // 恢复设备的启用状态
    for (const eq of equipmentList) {
      const savedStatus = currentEnabledStatus.find(s => s.label === eq.label)
      if (savedStatus) {
        eq.enabled = savedStatus.enabled
      }
    }
    
    // 继承上一条记录中启用的设备信息（文件名+1）
    if (lastRecord.value?.equipment) {
      for (let i = 0; i < equipmentList.length; i++) {
        const eq = equipmentList[i]
        if (!eq.enabled) continue // 只处理启用的设备
        
        const lastEq = lastRecord.value.equipment.find(e => e.label === eq.label)
        if (lastEq) {
          eq.type = lastEq.type
          eq.prefix = lastEq.prefix
          eq.shotSize = lastEq.shotSize || ''
          const lastFileName = getLastFileNameForDevice(eq.label, eq.prefix)
          eq.fileName = String(parseInt(lastFileName || '0', 10) + 1).padStart(3, '0')
          eq.fileCode = ''
          eq.changeCard = false
          tryGenerateFileCode(i)
        }
      }
    }

    // 条数+1（如果场景号和镜号相同）
    if (savedSceneNumber === lastRecord.value?.sceneNumber && savedShotNumber === lastRecord.value?.shotNumber) {
      form.takeCount = lastRecord.value.takeCount + 1
    } else {
      form.takeCount = 1
    }
  }

  // 滚动到顶部
  nextTick(() => {
    const el = document.querySelector('.main-content') || document.documentElement
    el.scrollTo({ top: 0, behavior: 'instant' })
  })

  // 更明显的提示
  ElNotification({
    title: '保存成功',
    message: '场记记录已保存，可继续添加新记录',
    type: 'success',
    duration: 3000,
    position: 'top-right'
  })

  emit('saved')
  clearFormStorage()

  // 聚焦到场景号输入框（需要延迟等待 DOM 更新）
  setTimeout(() => {
    sceneNumberInput.value?.focus()
  }, 100)
}

/**
 * 提交
 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const dups = findDuplicateFileCodes()
  if (dups.length > 0) {
    duplicateFileCodes.value = dups
    duplicateDialogVisible.value = true
    return
  }

  await doSave()
}

// 确认重复文件编码后继续保存
async function confirmDuplicate() {
  duplicateDialogVisible.value = false
  await doSave()
}

function handleReset() {
  formRef.value?.resetFields()
  form.date = new Date().toISOString().split('T')[0]
  form.takeCount = 1
  form.status = 'passed'
  form.sceneType = 'int'
  form.timeOfDay = 'day'
  form.soundType = 'none'
  // 重置时重新从项目绑定初始化设备
  initEquipmentFromBindings()
  clearFormStorage()
}

// 组件挂载时初始化
onMounted(() => {
  lastRecord.value = store.getLastRecord(props.projectId)
  initForm()
})

// 监听表单变化，自动保存到本地（仅新建模式）
watch(
  () => [form, [...equipmentList]],
  () => {
    if (!isEdit.value) {
      saveFormToStorage()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.script-form {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

/* 悬浮摘要：position sticky */
.sticky-summary-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  margin-bottom: 16px;
}

.form-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.equipment-row {
  padding: 8px 0;
  border-bottom: 1px dashed #ebeef5;
}
.equipment-row:last-child {
  border-bottom: none;
}
.equipment-row.disabled-row {
  background-color: #f5f7fa;
  opacity: 0.7;
}
.disabled-text {
  color: #909399;
}
.checkbox-col-inline {
  display: flex;
  align-items: center;
  height: 32px;
  margin-top: 22px;
}
.change-card-tag {
  color: #e6a23c;
  font-weight: bold;
}
.format-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 6px 12px;
  border-radius: 4px;
}
.format-hint code {
  background: #e9eef3;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
.empty-tip {
  color: #909399;
  text-align: center;
  padding: 20px 0;
  font-size: 14px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0;
}
/* 上一条摘要样式 */
.prev-summary {
  background: linear-gradient(135deg, #f0f9eb 0%, #e8f5e9 100%);
  border-color: #c8e6be;
}
.prev-summary-content {
  padding: 4px 0;
}
.prev-summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
}
.prev-field {
  display: flex;
  align-items: center;
  gap: 4px;
}
.prev-label {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}
.prev-value {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.prev-equipment {
  margin-top: 10px;
  font-size: 13px;
  padding-top: 8px;
  border-top: 1px dashed #c8e6be;
}
.prev-eq-label {
  color: #606266;
  font-weight: 500;
}
/* 预设标签多选样式 */
.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.preset-tag {
  padding: 2px 10px;
  background: #f4f4f5;
  color: #606266;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.preset-tag:hover {
  background: #ecf5ff;
  color: #409eff;
}
.preset-tag.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.duplicate-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0;
}
/* 紧凑表单项样式 */
.compact-item {
  margin-bottom: 8px;
}
.compact-item :deep(.el-form-item__label) {
  font-size: 12px;
  padding-bottom: 2px;
  line-height: 1;
}
.compact-item :deep(.el-form-item__content) {
  line-height: 1;
}
.compact-item :deep(.el-select) {
  width: 100%;
}
.compact-item :deep(.el-form-item) {
  margin-bottom: 0;
}
.equipment-row-inner {
  padding: 0;
  margin: 0;
}
.equipment-row-inner .el-col {
  padding-left: 2px;
  padding-right: 2px;
}
.equipment-row-inner .el-col:first-child {
  padding-left: 0;
}
.equipment-row-inner .el-col:last-child {
  padding-right: 0;
}
/* 文件名输入框组 */
.file-name-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}
.adj-btn {
  padding: 4px;
  min-width: 24px;
  height: 24px;
}
</style>




