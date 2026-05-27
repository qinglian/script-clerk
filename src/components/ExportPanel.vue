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
                v-for="(binding, bIdx) in projectBindings"
                :key="'device-' + bIdx"
                :label="binding.label"
                min-width="140"
              >
                <template #default="{ row }">
                  <div v-if="getEquipmentForBinding(row, binding)">
                    <el-tag
                      size="small"
                      :type="getEquipmentForBinding(row, binding).type === 'camera' ? 'primary' : 'success'"
                    >
                      {{ getEquipmentForBinding(row, binding).type === 'camera' ? '📽' : '🎤' }} {{ getEquipmentForBinding(row, binding).fileCode }}
                      <span v-if="getEquipmentForBinding(row, binding).shotSize" class="eq-shot">[{{ getEquipmentForBinding(row, binding).shotSize }}]</span>
                    </el-tag>
                    <el-tag
                      v-if="getEquipmentForBinding(row, binding).changeCard"
                      size="small"
                      type="danger"
                      effect="dark"
                      style="margin-left: 4px; font-weight: bold;"
                    >
                      🔄 换卡
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

        <el-tab-pane label="Excel" name="excel">
          <div class="excel-export-content">
            <el-empty v-if="records.length === 0" description="暂无数据" />
            <div v-else class="excel-info">
              <el-alert
                title="Excel 导出说明"
                type="info"
                :closable="false"
                style="margin-bottom: 20px;"
              >
                <p>导出的文件使用 CSV 格式（Excel 兼容格式），包含以下数据：</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>所有场记记录数据</li>
                  <li>设备信息（摄像机/录音设备文件编码）</li>
                  <li>场景、镜号、条数、状态等完整信息</li>
                </ul>
                <p>下载后可直接用 Microsoft Excel 或 WPS 打开。</p>
              </el-alert>

              <div class="excel-preview">
                <h4>数据预览（前 5 条）：</h4>
                <el-table :data="records.slice(0, 5)" size="small" border style="margin-top: 10px;">
                  <el-table-column prop="sceneNumber" label="场景号" width="80" />
                  <el-table-column prop="shotNumber" label="镜号" width="60" />
                  <el-table-column prop="takeCount" label="条数" width="50" />
                  <el-table-column label="状态" width="60">
                    <template #default="{ row }">
                      {{ row.status === 'passed' ? '通过' : row.status === 'ng' ? 'NG' : '补拍' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="actors" label="演员" min-width="100" />
                </el-table>
                <p v-if="records.length > 5" class="preview-more">... 还有 {{ records.length - 5 }} 条记录</p>
              </div>

              <el-button type="success" size="large" @click="downloadExcel" style="margin-top: 20px;">
                <el-icon><Download /></el-icon>
                下载 Excel 文件
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="PDF" name="pdf">
          <div class="pdf-export-content">
            <el-empty v-if="records.length === 0" description="暂无数据" />
            <div v-else class="pdf-info">
              <el-alert
                title="PDF 导出说明"
                type="info"
                :closable="false"
                style="margin-bottom: 20px;"
              >
                <p>PDF 导出将生成适合打印的 HTML 页面，包含：</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>项目标题和统计信息</li>
                  <li>表格形式的所有记录</li>
                  <li>设备信息展开显示</li>
                  <li>适合打印的样式</li>
                </ul>
                <p>在新窗口中打开后，可以使用浏览器的「打印」功能另存为 PDF。</p>
              </el-alert>

              <div class="pdf-preview-info">
                <h4>导出内容预览：</h4>
                <el-descriptions :column="2" border size="small" style="margin-top: 10px;">
                  <el-descriptions-item label="项目名称">{{ projectName || '未命名项目' }}</el-descriptions-item>
                  <el-descriptions-item label="记录总数">{{ records.length }} 条</el-descriptions-item>
                  <el-descriptions-item label="总场景数">{{ stats?.totalScenes || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="总条数">{{ stats?.totalTakes || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="通过">{{ stats?.passed || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="NG">{{ stats?.ng || 0 }}</el-descriptions-item>
                </el-descriptions>
              </div>

              <div class="pdf-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                <el-button type="primary" size="large" @click="openPDFPreview">
                  <el-icon><View /></el-icon>
                  打开打印预览
                </el-button>
                <el-button type="success" size="large" @click="downloadPDF">
                  <el-icon><Document /></el-icon>
                  下载 HTML 文件
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, View, Document } from '@element-plus/icons-vue'
import { getRecords, exportToMarkdown, exportToCSV, exportToExcel, exportToPDF, getStats, getProjectName, getProject } from '../stores/scriptStore'

const props = defineProps<{
  projectId: string | null
}>()

const activeTab = ref('preview')

const records = computed(() => {
  if (!props.projectId) return []
  return getRecords(props.projectId)
})

const projectName = computed(() => {
  if (!props.projectId) return ''
  return getProjectName(props.projectId)
})

const stats = computed(() => {
  if (!props.projectId) return null
  return getStats(props.projectId)
})

const projectBindings = computed(() => {
  if (!props.projectId) return []
  const project = getProject(props.projectId)
  return project?.cameraBindings || []
})

function getEquipmentForBinding(row: any, binding: any) {
  if (!row.equipment) return null
  return row.equipment.find((e: any) => e.label === binding.label && e.enabled) || null
}

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
  ElMessage.success('CSV 文件已下载')
}

function downloadExcel() {
  if (!props.projectId) return
  const blob = exportToExcel(props.projectId)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const projectNameSafe = projectName.value.replace(/[\\/:*?"<>|]/g, '_')
  link.download = `${projectNameSafe}_场记单_${new Date().toISOString().split('T')[0]}.xls`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('Excel 文件已下载（CSV 兼容格式）')
}

function openPDFPreview() {
  if (!props.projectId) return
  const htmlContent = exportToPDF(props.projectId)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  ElMessage.success('已在新的标签页打开打印预览')
}

function downloadPDF() {
  if (!props.projectId) return
  const htmlContent = exportToPDF(props.projectId)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const projectNameSafe = projectName.value.replace(/[\\/:*?"<>|]/g, '_')
  link.download = `${projectNameSafe}_场记单_${new Date().toISOString().split('T')[0]}.html`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('HTML 文件已下载，可用浏览器打开后打印为 PDF')
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

.excel-export-content,
.pdf-export-content {
  padding: 10px 0;
}

.excel-info,
.pdf-info {
  max-width: 800px;
}

.excel-preview,
.pdf-preview-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.excel-preview h4,
.pdf-preview-info h4 {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

.preview-more {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: 10px;
}

.pdf-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
</style>
