export interface EquipmentRecord {
  /** 唯一 ID（前端生成，用于 v-for key） */
  id: string
  /** 设备类型: camera | audio */
  type: 'camera' | 'audio'
  /** 设备标识，选择项目机位绑定中的标识 */
  label: string
  /** 文件名前缀，勾选机位绑定中该机位设置的文件名前缀 */
  prefix: string
  /** 文件编码，格式：{设备字母}-{文件名前缀}{文件名}，如 A-C001 */
  fileCode: string
  /** 文件名（输入数字自动补零为三位，如 1→001） */
  fileName: string
  /** 机位景别（仅摄像机），如 全景/中景/近景/特写 */
  shotSize: string
  /** 备注 */
  remark: string
  /** 换卡标记（摄像机设备）：勾选后需要新建前缀，文件名从001重新开始 */
  changeCard?: boolean
}

/** 机位绑定：机位标识 → 文件名前缀映射 */
export interface CameraBinding {
  /** 唯一 ID */
  id: string
  /** 机位标识，如 A机位 / B机位 */
  label: string
  /** 文件名前缀，如 C / D，支持多个逗号分隔 */
  prefixes: string
  /** 设备类型 */
  type: 'camera' | 'audio'
}

/** 预设项：用于演员、备注等字段的快捷选择 */
export interface PresetItem {
  id: string
  category: 'actors' | 'directorNote' | 'cameraNote' | 'note'
  value: string
}

export interface ScriptRecord {
  id: string
  projectId: string
  projectName: string

  // 场景信息
  sceneNumber: string
  sceneType: 'int' | 'ext'
  timeOfDay: 'day' | 'night'
  sceneDesc: string

  // 镜号信息
  shotNumber: string
  /** 条数编号（非数量），同场景+同镜号时自动累加 1,2,3... */
  takeCount: number

  // 拍摄信息
  status: 'passed' | 'ng' | 'retake'
  /** 声音类型：无 / OS画外音 / VO旁白（单选） */
  soundType: 'none' | 'os' | 'vo'
  directorNote: string
  cameraNote: string
  note: string

  // 演员信息
  actors: string

  // 时间信息
  date: string
  startTime: string
  endTime: string

  // 设备与文件编码（多机位 + 录音设备）
  equipment: EquipmentRecord[]

  // 元数据
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  director: string
  scriptSupervisor: string
  /** 机位绑定配置 */
  cameraBindings: CameraBinding[]
  /** 预设配置 */
  presets: PresetItem[]
  createdAt: string
}

export interface Stats {
  totalScenes: number
  totalShots: number
  totalTakes: number
  passed: number
  ng: number
  retake: number
  totalCameras: number
  totalAudioDevices: number
  osCount: number
  voCount: number
}

export interface AppData {
  projects: Project[]
  records: ScriptRecord[]
  currentProjectId: string | null
}