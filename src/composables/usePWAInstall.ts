import { ref, onMounted } from 'vue'

export function usePWAInstall() {
  const deferredPrompt = ref<any>(null)
  const isInstallable = ref(false)
  const isInstalled = ref(false)

  onMounted(() => {
    // 检测是否已经安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
    }

    // 监听 beforeinstallprompt 事件
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e
      isInstallable.value = true
      console.log('[PWA] Install prompt available')
    })

    // 监听 appinstalled 事件
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      deferredPrompt.value = null
      isInstallable.value = false
      console.log('[PWA] App installed')
    })
  })

  const installApp = async () => {
    if (!deferredPrompt.value) {
      console.log('[PWA] No install prompt available')
      return false
    }

    try {
      // 显示安装提示
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install')
      } else {
        console.log('[PWA] User dismissed install')
      }

      deferredPrompt.value = null
      return outcome === 'accepted'
    } catch (error) {
      console.error('[PWA] Install failed:', error)
      return false
    }
  }

  return {
    isInstallable,
    isInstalled,
    installApp
  }
}
