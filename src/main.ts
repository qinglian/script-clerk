import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
import { usePWAInstall } from './composables/usePWAInstall'
import './assets/main.css'

// 注册 Service Worker
const basePath = import.meta.env.BASE_URL || '/'
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${basePath}sw.js`)
      .then(reg => console.log('[SW] Service Worker registered:', reg.scope))
      .catch(err => console.error('[SW] Service Worker registration failed:', err))
  })
}

// 创建 Vue 应用
const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn })
app.mount('#app')

// 初始化 PWA 安装功能
const { isInstallable, installApp } = usePWAInstall()

// 暴露 installApp 到全局，方便在组件中调用
window.addEventListener('load', () => {
  ;(window as any).installPWA = () => {
    if (isInstallable.value) {
      installApp()
    } else {
      // 如果没有触发 beforeinstallprompt，尝试打开manifest
      window.open(`${basePath}manifest.json`, '_blank')
    }
  }
})
