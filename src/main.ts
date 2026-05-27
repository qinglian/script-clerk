import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
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
  app.component(key, component as any)
}

app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
