import { onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const DEFAULT_ROUTE_MESSAGE = 'Bạn có thay đổi chưa lưu. Rời đi?'

export function useUnsavedChanges({ isDirty, onRouteAttempt, routeMessage = DEFAULT_ROUTE_MESSAGE } = {}) {
  const bypassGuard = ref(false)

  function handleBeforeUnload(event) {
    if (!isDirty?.value || bypassGuard.value) {
      return
    }

    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeRouteLeave((to, from) => {
    if (!isDirty?.value || bypassGuard.value) {
      return true
    }

    if (typeof onRouteAttempt === 'function') {
      onRouteAttempt(to, from)
      return false
    }

    return window.confirm(routeMessage)
  })

  async function bypassUnsavedChangesGuard(task) {
    bypassGuard.value = true

    try {
      return await task()
    } finally {
      bypassGuard.value = false
    }
  }

  return {
    bypassUnsavedChangesGuard,
  }
}
