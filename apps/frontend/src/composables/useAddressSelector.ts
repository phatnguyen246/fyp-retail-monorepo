import { ref } from 'vue'
import {
  createProvincesOpenApiLocationService,
  type District,
  type LocationService,
  type Province,
  type Ward,
} from '@packages/location-client'

const defaultLocationService = createProvincesOpenApiLocationService()

function normalizeCode(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

export function useAddressSelector(options: { locationService?: LocationService } = {}) {
  const locationService = options.locationService ?? defaultLocationService
  const provinces = ref<Province[]>([])
  const districts = ref<District[]>([])
  const wards = ref<Ward[]>([])
  const selectedProvince = ref<number | null>(null)
  const selectedDistrict = ref<number | null>(null)
  const selectedWard = ref<number | null>(null)
  const loadingProvinces = ref(false)
  const loadingDistricts = ref(false)
  const loadingWards = ref(false)
  const errorMessage = ref('')

  function clearError() {
    errorMessage.value = ''
  }

  function resetDistrictSelection() {
    districts.value = []
    selectedDistrict.value = null
    resetWardSelection()
  }

  function resetWardSelection() {
    wards.value = []
    selectedWard.value = null
  }

  async function loadProvinces() {
    loadingProvinces.value = true
    clearError()

    try {
      provinces.value = await locationService.getProvinces()
    } catch (_error) {
      provinces.value = []
      errorMessage.value = 'Khong the tai danh sach tinh/thanh pho. Vui long thu lai.'
    } finally {
      loadingProvinces.value = false
    }
  }

  async function onProvinceChange(nextProvinceCode: number | string | null | undefined) {
    selectedProvince.value = normalizeCode(nextProvinceCode)
    resetDistrictSelection()
    clearError()

    if (!selectedProvince.value) {
      return
    }

    loadingDistricts.value = true

    try {
      districts.value = await locationService.getDistricts(selectedProvince.value)
    } catch (_error) {
      districts.value = []
      errorMessage.value = 'Khong the tai danh sach quan/huyen. Vui long thu lai.'
    } finally {
      loadingDistricts.value = false
    }
  }

  async function onDistrictChange(nextDistrictCode: number | string | null | undefined) {
    selectedDistrict.value = normalizeCode(nextDistrictCode)
    resetWardSelection()
    clearError()

    if (!selectedDistrict.value) {
      return
    }

    loadingWards.value = true

    try {
      wards.value = await locationService.getWards(selectedDistrict.value)
    } catch (_error) {
      wards.value = []
      errorMessage.value = 'Khong the tai danh sach phuong/xa. Vui long thu lai.'
    } finally {
      loadingWards.value = false
    }
  }

  function onWardChange(nextWardCode: number | string | null | undefined) {
    selectedWard.value = normalizeCode(nextWardCode)
  }

  async function hydrateSelection({
    provinceCode,
    districtCode,
    wardCode,
  }: {
    provinceCode?: number | string | null
    districtCode?: number | string | null
    wardCode?: number | string | null
  } = {}) {
    await loadProvinces()

    const normalizedProvinceCode = normalizeCode(provinceCode)
    const normalizedDistrictCode = normalizeCode(districtCode)
    const normalizedWardCode = normalizeCode(wardCode)

    if (!normalizedProvinceCode) {
      return
    }

    await onProvinceChange(normalizedProvinceCode)

    if (!normalizedDistrictCode) {
      return
    }

    await onDistrictChange(normalizedDistrictCode)

    if (!normalizedWardCode) {
      return
    }

    selectedWard.value = wards.value.some((ward) => ward.code === normalizedWardCode)
      ? normalizedWardCode
      : null
  }

  return {
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
    loadProvinces,
    onProvinceChange,
    onDistrictChange,
    onWardChange,
    hydrateSelection,
  }
}
