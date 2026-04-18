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
        <p class="admin-page-kicker">New Record</p>
        <h1 class="admin-page-title">Create Product</h1>
        <p class="admin-page-subtitle">
          Create a new product record with business metadata, visibility settings, and published specifications.
        </p>
      </div>
    </header>

    <form class="admin-card admin-form-grid" @submit.prevent="handleSubmit">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Core Information</p>
          <h2 class="admin-card-title">Product Profile</h2>
        </div>
      </div>

      <div class="admin-two-column-grid">
        <label class="admin-field">
          <span class="admin-label">Product Name</span>
          <input
            v-model="product.title"
            class="admin-input"
            type="text"
            placeholder="Example: iPhone 16 Pro Max"
            required
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Product Group Code</span>
          <input
            v-model="product.productGroupCode"
            class="admin-input"
            type="text"
            placeholder="Example: APPLE_IPHONE_16_PRO_MAX"
            required
          />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Brand</span>
          <select v-model="product.brandCode" class="admin-select">
            <option v-for="option in referenceOptions.brands" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Category</span>
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
          <span class="admin-label">Display Lifecycle</span>
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

      <div class="admin-card-divider"></div>

      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Classification</p>
          <h2 class="admin-card-title">Badges and Tags</h2>
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
        <span>Allow customers to leave demand when this product is out of stock</span>
      </label>

      <div class="admin-card-divider"></div>

      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Specifications</p>
          <h2 class="admin-card-title">Product-level Specs</h2>
        </div>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Screen Size</span>
          <input
            v-model="product.specs.screen.size"
            class="admin-input"
            type="text"
            placeholder="Example: 6.7 inches"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Display Technology</span>
          <input
            v-model="product.specs.screen.technology"
            class="admin-input"
            type="text"
            placeholder="Example: LTPO OLED"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Resolution</span>
          <input
            v-model="product.specs.screen.resolution"
            class="admin-input"
            type="text"
            placeholder="Example: 2796 x 1290"
          />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Refresh Rate</span>
          <input
            v-model="product.specs.screen.refreshRate"
            class="admin-input"
            type="text"
            placeholder="Example: 120Hz"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Chipset</span>
          <input
            v-model="product.specs.chipset"
            class="admin-input"
            type="text"
            placeholder="Example: Apple A18 Pro"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Battery</span>
          <input
            v-model="product.specs.battery"
            class="admin-input"
            type="text"
            placeholder="Example: 4685mAh"
          />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Rear Camera</span>
          <input
            v-model="product.specs.rearCamera"
            class="admin-input"
            type="text"
            placeholder="Example: 48MP + 12MP + 12MP"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Front Camera</span>
          <input
            v-model="product.specs.frontCamera"
            class="admin-input"
            type="text"
            placeholder="Example: 12MP"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Operating System</span>
          <input
            v-model="product.specs.operatingSystem"
            class="admin-input"
            type="text"
            placeholder="Example: iOS 18"
          />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">SIM</span>
          <input
            v-model="product.specs.sim"
            class="admin-input"
            type="text"
            placeholder="Example: Dual SIM (Nano-SIM + eSIM)"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Network</span>
          <input
            v-model="product.specs.network"
            class="admin-input"
            type="text"
            placeholder="Example: 5G, Wi-Fi 6E, Bluetooth 5.3"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Charging</span>
          <input
            v-model="product.specs.charging"
            class="admin-input"
            type="text"
            placeholder="Example: USB-C, 30W fast charge"
          />
        </label>
      </div>

      <div class="admin-three-column-grid">
        <label class="admin-field">
          <span class="admin-label">Dimensions</span>
          <input
            v-model="product.specs.dimensions"
            class="admin-input"
            type="text"
            placeholder="Example: 163 x 77.6 x 8.25 mm"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Weight</span>
          <input
            v-model="product.specs.weight"
            class="admin-input"
            type="text"
            placeholder="Example: 227g"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Materials</span>
          <input
            v-model="product.specs.material"
            class="admin-input"
            type="text"
            placeholder="Example: Titanium + reinforced glass"
          />
        </label>
      </div>

      <label class="admin-field">
        <span class="admin-label">Water Resistance</span>
        <input
          v-model="product.specs.waterResistance"
          class="admin-input"
          type="text"
          placeholder="Example: IP68"
        />
      </label>

      <div v-if="errorMessage" class="admin-alert admin-alert-danger">
        {{ errorMessage }}
      </div>

      <div class="admin-button-row">
        <button type="button" class="admin-button admin-button-secondary" @click="router.back()">
          Back
        </button>
        <button type="submit" class="admin-button admin-button-primary" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create Product' }}
        </button>
      </div>
    </form>
  </section>
</template>
