<template>
  <div class="export-panel">
    <el-card>
      <template #header><span>📤 导出场记单</span></template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="预览" name="preview">
          <div class="preview-content" v-if="records.length > 0">
            <el-table :data="records" size="small" border stripe max-height="500">
              <el-table-column prop="sceneNumber" label="场景号" width="80" />
              <el-table-column label="场景" width="80">
                <template #default="{ row }">
                  {{ row.sceneType === 'int' ? '内景' : '外景' }}{{ row.timeOfDay === 'day' ? '日' : '夜' }}
                </template>
              </el-table-column>
              <el-table-column prop="shotNumber" label="镜号" width="60" />
              <el-table-column prop="takeCount" label="条数" width="50" />
              <el-table-column label="状态" width="60">
                <template #default="{ row }">
                  {{ row.status === 'passed' ? '通过' : row.status === 'ng' ? 'NG' : '补拍' }}
                </template>
              </el-table-column>
              <el-table-column label="声音" width="50" align="center">
                <template #default="{ row }">
                  {{ row.soundType === 'os' ? 'OS' : row.soundType === 'vo' ? 'VO' : '' }}
                </template>
              </el-table-column>
              <el-table-column prop="actors" label="演员" width="100" show-overflow-tooltip />
              
              <!-- 动态设备列 -->
              <el-table-column
                v-for="(colIdx) in maxDevices"
                :key="'device-' + colIdx"
                :label="'设备' + colIdx"
                min-width="140"
              >
                <template #default="{ row }">
                  <div v-if="row.equipment && row.equipment[colIdx - 1]">
                    <el-tag
                      size="small"
                      :type="row.equipment[colIdx - 1].type === 'camera' ? 'primary' : 'success'"
                    >
                      {{ row.equipment[colIdx - 1].type === 'camera' ? '🎥' : '🎤' }} {{ row.equipment[colIdx - 1].fileCode }}
                      <span v-if="row.equipment[colIdx - 1].shotSize" class="eq-shot">[{{ row.equipment[colIdx - 1].shotSize }}]</span>
                      <span v-if="row.equipment[colIdx - 1].changeCard" class="eq-change-card">🔄</span>
                    </el-tag>
                  </div>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
              
              <el-table-column prop="directorNote" label="导演备注" min-width="120" show-overflow-tooltip />
            </el-table>
          </div>
          <el-empty v-else description="暂无数据" />
        </el-tab-pane>

        <el-tab-pane label="Markdown" name="markdown">
          <el-input type="textarea" :model-value="markdownContent" :rows="20" readonly />
          <el-button type="primary" style="margin-top: 12px" @click="copyToClipboard(markdownContent)">复制 Markdown</el-button>
        </el-tab-pane>

        <el-tab-pane label="CSV" name="csv">
          <el-input type="textarea" :model-value="csvContent" :rows="20" readonly />
          <el-button type="primary" style="margin-top: 12px" @click="copyToClipboard(csvContent)">复制 CSV</el-button>
          <el-button style="margin-top: 12px" @click="downloadCSV">下载 CSV 文件</el-button>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getRecords, exportToMarkdown, exportToCSV } from '../stores/scriptStore'

const props = defineProps<{
  projectId: string | null
}>()

const activeTab = ref('preview')

const records = computed(() => {
  if (!props.projectId) return []
  return getRecords(props.projectId)
})

const maxDevices = computed(() => {
  if (records.value.length === 0) return 0
  return Math.max(...records.value.map(r => r.equipment?.length ?? 0))
})

// 设备信息已在模板中直接遍历显示

const markdownContent = computed(() => {
  if (!props.projectId) return ''
  return exportToMarkdown(props.projectId)
})

const csvContent = computed(() => {
  if (!props.projectId) return ''
  return exportToCSV(props.projectId)
})

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function downloadCSV() {
  if (!props.projectId) return
  const content = exportToCSV(props.projectId)
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `场记单_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.export-panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.preview-content {
  max-height: 500px;
  overflow-y: auto;
}

.eq-shot {
  color: #909399;
  font-size: 11px;
}

.eq-change-card {
  color: #e6a23c;
  font-size: 11px;
}

.text-muted {
  color: #c0c4cc;
}
</style>
