<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createEmptyProductDraft, useAdminStore } from '../../store/admin'

const router = useRouter()
const adminStore = useAdminStore()

const product = ref(createEmptyProductDraft())
const saving = ref(false)
const errorMessage = ref('')

const referenceOptions = computed(() => adminStore.referenceOptions)

function toggleListValue(list, value) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }

  return [...list, value]
}

async function handleSubmit() {
  saving.value = true
  errorMessage.value = ''

  const payload = {
    productGroupCode: product.value.productGroupCode,
    title: product.value.title,
    brandCode: product.value.brandCode,
    categoryCode: product.value.categoryCode,
    productType: product.value.productType,
    shortDescription: product.value.shortDescription || undefined,
    longDescription: product.value.longDescription || undefined,
    tagCodes: product.value.tagCodes,
    badges: product.value.badges,
    specs: product.value.specs,
    status: product.value.status,
    contactWhenOutOfStock: product.value.contactWhenOutOfStock,
  }

  const result = await adminStore.createProduct(payload)

  if (result.success) {
    await router.push({
      name: 'admin-product-detail',
      params: { productId: result.data.id },
    })
  } else {
    errorMessage.value = result.error
  }

  saving.value = false
}

onMounted(() => {
  adminStore.ensureReferenceOptions()
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Bút lục mới</p>
        <h1 class="admin-page-title">Khởi tạo sản phẩm</h1>
        <p class="admin-page-subtitle">
          Tạo product theo đúng schema backend, kèm badge, tag và toàn bộ smartphone specs cấp product.
        </p>
      </div>
    </header>

    <form class="admin-card admin-form-grid" @submit.prevent="handleSubmit">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Thông tin cốt lõi</p>
          <h2 class="admin-card-title">Hồ sơ product</h2>
        </div>
      </div>

      <div class="admin-two-column-grid">
        <label class="admin-field">
          <span class="admin-label">Tên sản phẩm</span>
          <input v-model="product.title" class="admin-input" type="text" required />
        </label>

        <label class="admin-field">
          <span class="admin-label">Product group code</span>
          <input v-model="product.productGroupCode" class="admin-input" type="text" required />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Thương hiệu</span>
          <select v-model="product.brandCode" class="admin-select">
            <option v-for="option in referenceOptions.brands" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Danh mục</span>
          <select v-model="product.categoryCode" class="admin-select">
            <option
              v-for="option in referenceOptions.categories"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Lifecycle</span>
          <select v-model="product.status" class="admin-select">
            <option
              v-for="option in referenceOptions.productStatuses"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="admin-field">
        <span class="admin-label">Mô tả ngắn</span>
        <textarea v-model="product.shortDescription" class="admin-textarea" rows="3" />
      </label>

      <label class="admin-field">
        <span class="admin-label">Mô tả dài</span>
        <textarea v-model="product.longDescription" class="admin-textarea" rows="5" />
      </label>

      <div class="admin-card-divider"></div>

      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Phân loại</p>
          <h2 class="admin-card-title">Badge và tag</h2>
        </div>
      </div>

      <div class="admin-chip-grid">
        <label
          v-for="option in referenceOptions.badges"
          :key="option.value"
          class="admin-check-chip"
          :class="{ 'admin-check-chip-active': product.badges.includes(option.value) }"
        >
          <input
            type="checkbox"
            class="admin-check-chip-input"
            :checked="product.badges.includes(option.value)"
            @change="product.badges = toggleListValue(product.badges, option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>

      <div class="admin-chip-grid">
        <label
          v-for="option in referenceOptions.tags"
          :key="option.value"
          class="admin-check-chip"
          :class="{ 'admin-check-chip-active': product.tagCodes.includes(option.value) }"
        >
          <input
            type="checkbox"
            class="admin-check-chip-input"
            :checked="product.tagCodes.includes(option.value)"
            @change="product.tagCodes = toggleListValue(product.tagCodes, option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>

      <label class="admin-toggle-row">
        <input v-model="product.contactWhenOutOfStock" type="checkbox" />
        <span>Cho phép khách để lại nhu cầu khi hệ thống ghi nhận hết hàng</span>
      </label>

      <div class="admin-card-divider"></div>

      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Smartphone specs</p>
          <h2 class="admin-card-title">Thông số cấp product</h2>
        </div>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Kích thước màn hình</span>
          <input v-model="product.specs.screen.size" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Công nghệ màn hình</span>
          <input v-model="product.specs.screen.technology" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Độ phân giải</span>
          <input v-model="product.specs.screen.resolution" class="admin-input" type="text" />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Tần số quét</span>
          <input v-model="product.specs.screen.refreshRate" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Chipset</span>
          <input v-model="product.specs.chipset" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Pin</span>
          <input v-model="product.specs.battery" class="admin-input" type="text" />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Camera sau</span>
          <input v-model="product.specs.rearCamera" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Camera trước</span>
          <input v-model="product.specs.frontCamera" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Hệ điều hành</span>
          <input v-model="product.specs.operatingSystem" class="admin-input" type="text" />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">SIM</span>
          <input v-model="product.specs.sim" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Mạng</span>
          <input v-model="product.specs.network" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Sạc</span>
          <input v-model="product.specs.charging" class="admin-input" type="text" />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Kích thước máy</span>
          <input v-model="product.specs.dimensions" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Khối lượng</span>
          <input v-model="product.specs.weight" class="admin-input" type="text" />
        </label>

        <label class="admin-field">
          <span class="admin-label">Chất liệu</span>
          <input v-model="product.specs.material" class="admin-input" type="text" />
        </label>
      </div>

      <label class="admin-field">
        <span class="admin-label">Chuẩn kháng nước</span>
        <input v-model="product.specs.waterResistance" class="admin-input" type="text" />
      </label>

      <div v-if="errorMessage" class="admin-alert admin-alert-danger">
        {{ errorMessage }}
      </div>

      <div class="admin-button-row">
        <button type="button" class="admin-button admin-button-secondary" @click="router.back()">
          Quay lại
        </button>
        <button type="submit" class="admin-button admin-button-primary" :disabled="saving">
          {{ saving ? 'Đang tạo...' : 'Tạo product' }}
        </button>
      </div>
    </form>
  </section>
</template>
