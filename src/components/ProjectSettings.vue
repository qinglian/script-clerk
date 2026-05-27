<template>
  <div class="project-settings">
    <el-card class="settings-card">
      <template #header><span>⚙️ 机位绑定</span></template>
      <p class="section-desc">配置每个机位的标识和文件名前缀，方便设备选择和文件编码自动生成。</p>

      <div v-if="bindings.length === 0" class="empty-tip">暂无机位绑定，点击下方添加</div>

      <div v-for="b in bindings" :key="b.id" class="binding-row">
        <el-row :gutter="12" style="align-items: center">
          <el-col :span="4">
            <el-select v-model="b.type" placeholder="类型" size="small">
              <el-option label="摄像机" value="camera" />
              <el-option label="录音设备" value="audio" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-input v-model="b.label" placeholder="机位标识，如 A机位" size="small" />
          </el-col>
          <el-col :span="4">
            <el-input v-model="b.prefixes" placeholder="前缀，如 C（可逗号分隔多个）" size="small" />
          </el-col>
          <el-col :span="2">
            <el-button type="danger" text size="small" @click="removeBinding(b.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-col>
        </el-row>
      </div>

      <el-button type="primary" text @click="addBinding" style="margin-top: 12px">+ 添加机位</el-button>
      <el-button type="success" @click="saveBindings" style="margin-top: 12px">保存机位绑定</el-button>
    </el-card>

    <!-- 预设管理 -->
    <el-card class="settings-card" style="margin-top: 20px">
      <template #header><span>📝 预设管理</span></template>
      <p class="section-desc">为演员、备注等字段创建预设内容，填写场记时可快速选择。</p>

      <el-tabs v-model="presetTab">
        <el-tab-pane label="演员预设" name="actors">
          <div class="preset-list">
            <div v-for="p in actorPresets" :key="p.id" class="preset-item">
              <el-tag closable @close="removePreset(p.id)" type="primary">{{ p.value }}</el-tag>
            </div>
            <el-input
              v-model="newActor"
              placeholder="输入演员名（多人用逗号分隔）"
              size="small"
              style="width: 300px"
            >
              <template #append>
                <el-button @click="addPresetItem('actors', newActor); newActor = ''">添加</el-button>
              </template>
            </el-input>
          </div>
        </el-tab-pane>

        <el-tab-pane label="导演备注预设" name="directorNote">
          <div class="preset-list">
            <div v-for="p in directorNotePresets" :key="p.id" class="preset-item">
              <el-tag closable @close="removePreset(p.id)" type="warning">{{ p.value }}</el-tag>
            </div>
            <el-input
              v-model="newDirectorNote"
              placeholder="输入常用导演备注"
              size="small"
              style="width: 300px"
            >
              <template #append>
                <el-button @click="addPresetItem('directorNote', newDirectorNote); newDirectorNote = ''">添加</el-button>
              </template>
            </el-input>
          </div>
        </el-tab-pane>

        <el-tab-pane label="摄影备注预设" name="cameraNote">
          <div class="preset-list">
            <div v-for="p in cameraNotePresets" :key="p.id" class="preset-item">
              <el-tag closable @close="removePreset(p.id)" type="success">{{ p.value }}</el-tag>
            </div>
            <el-input
              v-model="newCameraNote"
              placeholder="输入常用摄影备注"
              size="small"
              style="width: 300px"
            >
              <template #append>
                <el-button @click="addPresetItem('cameraNote', newCameraNote); newCameraNote = ''">添加</el-button>
              </template>
            </el-input>
          </div>
        </el-tab-pane>

        <el-tab-pane label="场记备注预设" name="note">
          <div class="preset-list">
            <div v-for="p in notePresets" :key="p.id" class="preset-item">
              <el-tag closable @close="removePreset(p.id)" type="info">{{ p.value }}</el-tag>
            </div>
            <el-input
              v-model="newNote"
              placeholder="输入常用场记备注"
              size="small"
              style="width: 300px"
            >
              <template #append>
                <el-button @click="addPresetItem('note', newNote); newNote = ''">添加</el-button>
              </template>
            </el-input>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getCameraBindings,
  addCameraBinding,
  updateCameraBinding,
  removeCameraBinding,
  getPresets,
  addPreset as addPresetToStore,
  removePreset as removePresetFromStore,
} from '../stores/scriptStore'
import type { CameraBinding, PresetItem } from '../types/script'

const props = defineProps<{
  projectId: string
}>()

const bindings = ref<CameraBinding[]>([])
const presetTab = ref('actors')

const newActor = ref('')
const newDirectorNote = ref('')
const newCameraNote = ref('')
const newNote = ref('')

const allPresets = ref<PresetItem[]>([])
const actorPresets = computed(() => allPresets.value.filter(p => p.category === 'actors'))
const directorNotePresets = computed(() => allPresets.value.filter(p => p.category === 'directorNote'))
const cameraNotePresets = computed(() => allPresets.value.filter(p => p.category === 'cameraNote'))
const notePresets = computed(() => allPresets.value.filter(p => p.category === 'note'))

onMounted(() => {
  bindings.value = getCameraBindings(props.projectId)
  allPresets.value = getPresets(props.projectId)
})

function addBinding() {
  addCameraBinding(props.projectId, { type: 'camera', label: '', prefixes: '' })
  bindings.value = getCameraBindings(props.projectId)
}

function removeBinding(id: string) {
  removeCameraBinding(props.projectId, id)
  bindings.value = getCameraBindings(props.projectId)
}

function saveBindings() {
  for (const b of bindings.value) {
    updateCameraBinding(props.projectId, b.id, { type: b.type, label: b.label, prefixes: b.prefixes })
  }
  ElMessage.success('机位绑定已保存')
}

function addPresetItem(category: PresetItem['category'], value: string) {
  if (!value) return
  addPresetToStore(props.projectId, category, value)
  allPresets.value = getPresets(props.projectId)
  ElMessage.success('预设已添加')
}

function removePreset(id: string) {
  removePresetFromStore(props.projectId, id)
  allPresets.value = getPresets(props.projectId)
}
</script>

<style scoped>
.project-settings {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.section-desc {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.binding-row {
  padding: 6px 0;
  border-bottom: 1px dashed #ebeef5;
}

.binding-row:last-child {
  border-bottom: none;
}

.empty-tip {
  color: #909399;
  text-align: center;
  padding: 16px 0;
  font-size: 13px;
}

.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.preset-item {
  margin-bottom: 4px;
}
</style>
