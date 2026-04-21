function normalizeMessage(message) {
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim()
  }

  return 'Unknown notification.'
}

function getToneLabel(tone) {
  const normalizedTone = typeof tone === 'string' ? tone.trim().toLowerCase() : 'info'

  if (normalizedTone === 'success') return 'SUCCESS'
  if (normalizedTone === 'warning') return 'WARNING'
  if (normalizedTone === 'danger' || normalizedTone === 'error') return 'ERROR'

  return 'INFO'
}

export function useAdminPopup() {
  function notify(message, tone = 'info') {
    const normalizedMessage = normalizeMessage(message)
    const label = getToneLabel(tone)
    window.alert(`[${label}] ${normalizedMessage}`)
  }

  return {
    notify,
  }
}

