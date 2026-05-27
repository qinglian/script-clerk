<template>
  <el-dialog
    v-model="visible"
    title="文件浏览器"
    width="700px"
    :close-on-click-modal="true"
    @open="loadFiles"
  >
    <!-- 路径导航 -->
    <div class="file-browser-path">
      <el-icon><FolderOpened /></el-icon>
      <span class="path-text">{{ folderName }}</span>
      <el-tag size="small" type="info" style="margin-left: 8px">{{ files.length }} 个文件</el-tag>
      <el-button type="primary" text size="small" style="margin-left: auto" @click="copyPath">
        <el-icon><CopyDocument /></el-icon>
        复制路径
      </el-button>
    </div>

    <!-- 文件列表 -->
    <div class="file-browser-content">
      <el-table :data="files" stripe style="width: 100%" max-height="400" :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }">
        <el-table-column label="名称" min-width="250">
          <template #default="{ row }">
            <div class="file-name-cell" @click="previewFile(row)" style="cursor: pointer">
              <el-icon :size="18" :color="getFileIconColor(row.name)">
                <Document />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatModified(row.modified) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-if="loading" class="loading-mask">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-if="!loading && files.length === 0" class="empty-tip">
        <el-empty description="文件夹为空" :image-size="60" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpened, Document, Loading, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCurrentSaveDirectory } from '../stores/fileStorage'

interface FileEntry {
  name: string
  size: number
  modified: Date
  kind: 'file' | 'directory'
  entry?: any
}

const visible = ref(false)
const files = ref<FileEntry[]>([])
const folderName = ref('')
const loading = ref(false)

function open() {
  visible.value = true
}

async function loadFiles() {
  loading.value = true
  files.value = []
  try {
    const dirHandle = getCurrentSaveDirectory()
    if (!dirHandle) return

    folderName.value = dirHandle.name || '未知文件夹'

    const entries: FileEntry[] = []
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile()
          entries.push({
            name: file.name,
            size: file.size,
            modified: new Date(file.lastModified),
            kind: 'file',
            entry: entry
          })
        } catch {
          // skip
        }
      } else if (entry.kind === 'directory') {
        entries.push({
          name: entry.name,
          size: 0,
          modified: new Date(),
          kind: 'directory',
          entry: entry
        })
      }
    }

    // 按名称排序，文件夹在前
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    files.value = entries
  } catch (error) {
    console.error('加载文件列表失败:', error)
  } finally {
    loading.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatModified(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return y + '/' + m + '/' + d + ' ' + h + ':' + min
}

function getFileIconColor(name: string): string {
  if (name.endsWith('.json')) return '#409eff'
  if (name.endsWith('.csv')) return '#67c23a'
  if (name.endsWith('.pdf')) return '#f56c6c'
  return '#909399'
}

async function previewFile(row: FileEntry) {
  if (row.kind === 'directory') return
  try {
    const dirHandle = getCurrentSaveDirectory()
    if (!dirHandle) return
    const fileHandle = await dirHandle.getFileHandle(row.name)
    const file = await fileHandle.getFile()
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error) {
    console.error('预览文件失败:', error)
    ElMessage.error('预览文件失败')
  }
}

async function copyPath() {
  try {
    const path = '已保存到文件夹: ' + folderName.value
    await navigator.clipboard.writeText(path)
    ElMessage.success('复制成功')
  } catch (error) {
    console.error('复制路径失败:', error)
    ElMessage.error('复制路径失败')
  }
}

defineExpose({ open })
</script>

<style scoped>
.file-browser-path {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
}

.path-text {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-left: 6px;
}

.file-browser-content {
  position: relative;
  min-height: 200px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name-cell:hover {
  color: #409eff;
}

.loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: #909399;
  font-size: 14px;
  z-index: 10;
}

.empty-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
