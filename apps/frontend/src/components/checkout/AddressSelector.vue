<script setup>
import { computed, onMounted } from 'vue'
import { useAddressSelector } from '../../composables/useAddressSelector'
import { createEmptyShippingAddress, normalizeShippingAddress } from '../../services/shipping-address'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => createEmptyShippingAddress(),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const {
  provinces,
  districts,
  wards,
  selectedProvince,
  selectedDistrict,
  selectedWard,
  loadingProvinces,
  loadingDistricts,
  loadingWards,
  errorMessage,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  hydrateSelection,
} = useAddressSelector()

const addressValue = computed(() => normalizeShippingAddress(props.modelValue))

const provinceSelectValue = computed(() => selectedProvince.value ?? '')
const districtSelectValue = computed(() => selectedDistrict.value ?? '')
const wardSelectValue = computed(() => selectedWard.value ?? '')

function updateModel(patch = {}) {
  emit('update:modelValue', {
    ...addressValue.value,
    ...patch,
  })
}

async function handleProvinceChange(event) {
  await onProvinceChange(event?.target?.value ?? null)

  const selectedOption = provinces.value.find((province) => province.code === selectedProvince.value)

  updateModel({
    provinceCode: selectedProvince.value,
    provinceName: selectedOption?.name ?? '',
    districtCode: null,
    districtName: '',
    wardCode: null,
    wardName: '',
  })
}

async function handleDistrictChange(event) {
  await onDistrictChange(event?.target?.value ?? null)

  const selectedOption = districts.value.find((district) => district.code === selectedDistrict.value)

  updateModel({
    districtCode: selectedDistrict.value,
    districtName: selectedOption?.name ?? '',
    wardCode: null,
    wardName: '',
  })
}

function handleWardChange(event) {
  onWardChange(event?.target?.value ?? null)

  const selectedOption = wards.value.find((ward) => ward.code === selectedWard.value)

  updateModel({
    wardCode: selectedWard.value,
    wardName: selectedOption?.name ?? '',
  })
}

onMounted(async () => {
  await hydrateSelection({
    provinceCode: addressValue.value.provinceCode,
    districtCode: addressValue.value.districtCode,
    wardCode: addressValue.value.wardCode,
  })
})
</script>

<template>
  <div class="grid gap-5 md:grid-cols-3">
    <label class="flex flex-col gap-3">
      <span class="text-sm font-medium text-[var(--catalog-text)]">Tinh/Thanh pho</span>
      <select
        :value="provinceSelectValue"
        class="checkout-input"
        :disabled="disabled || loadingProvinces"
        @change="handleProvinceChange"
      >
        <option value="">
          {{ loadingProvinces ? 'Dang tai tinh/thanh pho...' : 'Chon tinh/thanh pho' }}
        </option>
        <option v-for="province in provinces" :key="province.code" :value="province.code">
          {{ province.name }}
        </option>
      </select>
    </label>

    <label class="flex flex-col gap-3">
      <span class="text-sm font-medium text-[var(--catalog-text)]">Quan/Huyen</span>
      <select
        :value="districtSelectValue"
        class="checkout-input"
        :disabled="disabled || !selectedProvince || loadingDistricts"
        @change="handleDistrictChange"
      >
        <option value="">
          {{ loadingDistricts ? 'Dang tai quan/huyen...' : 'Chon quan/huyen' }}
        </option>
        <option v-for="district in districts" :key="district.code" :value="district.code">
          {{ district.name }}
        </option>
      </select>
    </label>

    <label class="flex flex-col gap-3">
      <span class="text-sm font-medium text-[var(--catalog-text)]">Phuong/Xa</span>
      <select
        :value="wardSelectValue"
        class="checkout-input"
        :disabled="disabled || !selectedDistrict || loadingWards"
        @change="handleWardChange"
      >
        <option value="">
          {{ loadingWards ? 'Dang tai phuong/xa...' : 'Chon phuong/xa' }}
        </option>
        <option v-for="ward in wards" :key="ward.code" :value="ward.code">
          {{ ward.name }}
        </option>
      </select>
    </label>
  </div>

  <p v-if="errorMessage" class="mt-3 rounded-[1rem] bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm text-[var(--catalog-danger)]">
    {{ errorMessage }}
  </p>
</template>

<style scoped>
.checkout-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid var(--catalog-border-soft);
  background: rgba(255, 255, 255, 0.92);
  padding: 0.8rem 0.95rem;
  font-size: 0.95rem;
  line-height: 1.5rem;
  color: var(--catalog-text);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.checkout-input:focus {
  outline: none;
  border-color: rgba(139, 117, 0, 0.35);
  box-shadow: 0 0 0 4px rgba(139, 117, 0, 0.08);
  background: #fff;
}

.checkout-input:disabled {
  cursor: not-allowed;
  background: rgba(241, 237, 227, 0.8);
  color: var(--catalog-text-soft);
}
</style>
