<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Xác nhận thao tác',
  },
  message: {
    type: String,
    default: '',
  },
  confirmLabel: {
    type: String,
    default: 'Xác nhận',
  },
  cancelLabel: {
    type: String,
    default: 'Hủy',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-dialog-backdrop" @click.self="emit('cancel')">
      <div
        class="confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        :aria-busy="loading ? 'true' : 'false'"
      >
        <h2 class="confirm-dialog-title">{{ title }}</h2>
        <p class="confirm-dialog-message">{{ message }}</p>

        <div class="confirm-dialog-actions">
          <button type="button" class="confirm-dialog-button confirm-dialog-button-secondary" @click="emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="confirm-dialog-button confirm-dialog-button-primary"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? 'Đang xử lý...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(17, 24, 39, 0.4);
}

.confirm-dialog-panel {
  width: min(100%, 26rem);
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1rem;
  background: white;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  padding: 1.5rem;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--catalog-text);
}

.confirm-dialog-message {
  margin: 0.75rem 0 0;
  line-height: 1.6;
  color: var(--catalog-text-muted);
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.confirm-dialog-button {
  border: 1px solid transparent;
  border-radius: 0.625rem;
  padding: 0.8rem 1rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease, background-color 160ms ease;
}

.confirm-dialog-button:hover:not(:disabled) {
  opacity: 0.92;
}

.confirm-dialog-button:active:not(:disabled) {
  transform: scale(0.985);
}

.confirm-dialog-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.confirm-dialog-button-primary {
  background: var(--catalog-primary);
  color: white;
}

.confirm-dialog-button-secondary {
  border-color: var(--catalog-border-soft);
  background: white;
  color: var(--catalog-text);
}
</style>
