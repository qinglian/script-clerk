<template>
  <div class="script-stats" v-if="stats">
    <h3 class="stats-title">📊 统计概览</h3>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalScenes }}</div>
          <div class="stat-label">场景数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalShots }}</div>
          <div class="stat-label">镜号数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalTakes }}</div>
          <div class="stat-label">总条数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">
            <span class="text-success">{{ stats.passed }}</span> /
            <span class="text-danger">{{ stats.ng }}</span> /
            <span class="text-warning">{{ stats.retake }}</span>
          </div>
          <div class="stat-label">通过 / NG / 补拍</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card camera">
          <div class="stat-value">🎥 {{ stats.totalCameras }}</div>
          <div class="stat-label">摄像机文件数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card audio">
          <div class="stat-value">🎤 {{ stats.totalAudioDevices }}</div>
          <div class="stat-label">录音文件数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card os">
          <div class="stat-value">📢 {{ stats.osCount }}</div>
          <div class="stat-label">OS 画外音</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card vo">
          <div class="stat-value">🎙️ {{ stats.voCount }}</div>
          <div class="stat-label">VO 旁白</div>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <el-empty v-else description="暂无统计数据" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getStats } from '../stores/scriptStore'

const props = defineProps<{
  projectId: string | null
}>()

const stats = computed(() => {
  if (!props.projectId) return null
  return getStats(props.projectId)
})
</script>

<style scoped>
.script-stats {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.stats-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.stat-card {
  text-align: center;
}

.stat-card .stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.4;
}

.stat-card .stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.stat-card.camera .stat-value { color: #409eff; }
.stat-card.audio .stat-value { color: #67c23a; }
.stat-card.os .stat-value { color: #e6a23c; }
.stat-card.vo .stat-value { color: #f56c6c; }

.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
</style>