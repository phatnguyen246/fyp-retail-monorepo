<script setup>
import { onBeforeUnmount, ref, toRefs } from 'vue'
import { formatCurrency } from '../../services/formatters'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  hasPendingChanges: {
    type: Boolean,
    default: false,
  },
})

const { filters, options, hasPendingChanges } = toRefs(props)

const emit = defineEmits([
  'set-tag',
  'set-brand',
  'toggle-ram',
  'toggle-rom',
  'toggle-color',
  'update:min-price',
  'update:max-price',
  'apply-filters',
  'clear-filters',
])

const priceRangeRef = ref(null)
let activeThumb = null

function onMinPriceChange(event) {
  emit('update:min-price', Number(event.target.value))
}

function onMaxPriceChange(event) {
  emit('update:max-price', Number(event.target.value))
}

function getPricePercent(value) {
  const min = options.value.priceBounds.min
  const max = options.value.priceBounds.max
  const range = max - min

  if (range <= 0) {
    return 0
  }

  return ((value - min) / range) * 100
}

function clampSliderValue(value) {
  const { min, max, step } = options.value.priceBounds
  const normalizedStep = Number(step) > 0 ? Number(step) : 1
  const clampedValue = Math.min(Math.max(value, min), max)
  const steppedValue = Math.round((clampedValue - min) / normalizedStep) * normalizedStep + min

  return Math.min(Math.max(steppedValue, min), max)
}

function getPriceFromPointer(clientX) {
  const trackElement = priceRangeRef.value

  if (!trackElement) {
    return options.value.priceBounds.min
  }

  const rect = trackElement.getBoundingClientRect()
  const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
  const boundedRatio = Math.min(Math.max(ratio, 0), 1)
  const rawValue =
    options.value.priceBounds.min +
    boundedRatio * (options.value.priceBounds.max - options.value.priceBounds.min)

  return clampSliderValue(rawValue)
}

function setSliderValue(thumbName, nextValue) {
  const resolvedValue = clampSliderValue(nextValue)

  if (thumbName === 'min') {
    emit('update:min-price', Math.min(resolvedValue, filters.value.maxPrice))
    return
  }

  emit('update:max-price', Math.max(resolvedValue, filters.value.minPrice))
}

function updateSliderFromPointer(clientX) {
  if (!activeThumb) {
    return
  }

  setSliderValue(activeThumb, getPriceFromPointer(clientX))
}

function onWindowPointerMove(event) {
  updateSliderFromPointer(event.clientX)
}

function stopSliderDrag() {
  activeThumb = null
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', stopSliderDrag)
}

function startSliderDrag(thumbName, event) {
  activeThumb = thumbName
  updateSliderFromPointer(event.clientX)
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', stopSliderDrag)
}

function onSliderTrackPointerDown(event) {
  const clickedValue = getPriceFromPointer(event.clientX)
  const distanceToMin = Math.abs(clickedValue - filters.value.minPrice)
  const distanceToMax = Math.abs(clickedValue - filters.value.maxPrice)
  const targetThumb = distanceToMin <= distanceToMax ? 'min' : 'max'

  startSliderDrag(targetThumb, event)
}

onBeforeUnmount(() => {
  stopSliderDrag()
})
</script>

<template>
  <aside
    class="catalog-sidebar-panel flex flex-col px-6 py-8 text-white xl:sticky xl:top-20 xl:h-[calc(100vh-5rem)] xl:overflow-hidden 2xl:px-8 2xl:py-10"
  >
    <div class="catalog-sidebar-chrome flex shrink-0 flex-col gap-6">
      <h3 class="catalog-sidebar-title !mb-0 text-lg">Filters</h3>
    </div>

    <div class="catalog-sidebar-options catalog-scrollbar mt-6 flex-1 overflow-y-auto pr-1 xl:min-h-0">
      <div class="flex flex-col gap-8">
        <section>
          <label class="catalog-filter-label">Tags</label>
          <div>
            <button
              v-for="tag in options.tags"
              :key="tag.value"
              class="catalog-filter-row w-full justify-between"
              :class="
                filters.tag === tag.value
                  ? 'border-white/20 bg-white/18 text-white'
                  : 'border-transparent text-white/80'
              "
              type="button"
              @click="emit('set-tag', tag.value)"
            >
              <span class="text-sm font-light">{{ tag.label }}</span>
              <span
                class="h-2.5 w-2.5 rounded-full border border-white/40"
                :class="filters.tag === tag.value ? 'bg-white' : 'bg-transparent'"
              />
            </button>
          </div>
        </section>

        <section>
          <label class="catalog-filter-label">Brand</label>
          <div>
            <button
              v-for="brand in options.brands"
              :key="brand.value"
              class="catalog-filter-row w-full justify-between"
              :class="
                filters.brand === brand.value
                  ? 'border-white/20 bg-white/18 text-white'
                  : 'border-transparent text-white/80'
              "
              type="button"
              @click="emit('set-brand', brand.value)"
            >
              <span class="text-sm font-light">{{ brand.label }}</span>
              <span
                class="h-2.5 w-2.5 rounded-full border border-white/40"
                :class="filters.brand === brand.value ? 'bg-white' : 'bg-transparent'"
              />
            </button>
          </div>
        </section>

        <section>
          <label class="catalog-filter-label">RAM Memory</label>
          <div>
            <button
              v-for="ramOption in options.ram"
              :key="ramOption.value"
              class="catalog-filter-row w-full justify-between"
              :class="
                filters.ram.includes(ramOption.value)
                  ? 'border-white/20 bg-white/18 text-white'
                  : 'border-transparent text-white/80'
              "
              type="button"
              @click="emit('toggle-ram', ramOption.value)"
            >
              <span class="text-sm font-light">{{ ramOption.label }}</span>
              <span
                class="h-2.5 w-2.5 rounded-full border border-white/40"
                :class="filters.ram.includes(ramOption.value) ? 'bg-white' : 'bg-transparent'"
              />
            </button>
          </div>
        </section>

        <section>
          <label class="catalog-filter-label">ROM Storage</label>
          <div>
            <button
              v-for="romOption in options.rom"
              :key="romOption.value"
              class="catalog-filter-row w-full justify-between"
              :class="
                filters.rom.includes(romOption.value)
                  ? 'border-white/20 bg-white/18 text-white'
                  : 'border-transparent text-white/80'
              "
              type="button"
              @click="emit('toggle-rom', romOption.value)"
            >
              <span class="text-sm font-light">{{ romOption.label }}</span>
              <span
                class="h-2.5 w-2.5 rounded-full border border-white/40"
                :class="filters.rom.includes(romOption.value) ? 'bg-white' : 'bg-transparent'"
              />
            </button>
          </div>
        </section>

        <section>
          <label class="catalog-filter-label">Color</label>
          <div>
            <button
              v-for="colorOption in options.colors"
              :key="colorOption.value"
              class="catalog-filter-row w-full justify-between"
              :class="
                filters.color.includes(colorOption.value)
                  ? 'border-white/20 bg-white/18 text-white'
                  : 'border-transparent text-white/80'
              "
              type="button"
              @click="emit('toggle-color', colorOption.value)"
            >
              <span class="text-sm font-light">{{ colorOption.label }}</span>
              <span
                class="h-2.5 w-2.5 rounded-full border border-white/40"
                :class="filters.color.includes(colorOption.value) ? 'bg-white' : 'bg-transparent'"
              />
            </button>
          </div>
        </section>

        <section>
          <label class="catalog-filter-label">Price Range</label>
          <div
            ref="priceRangeRef"
            class="catalog-range-slider"
            @pointerdown="onSliderTrackPointerDown"
          >
            <div class="catalog-range-track" aria-hidden="true" />
            <div
              class="catalog-range-selection"
              :style="{
                left: `${getPricePercent(filters.minPrice)}%`,
                right: `${100 - getPricePercent(filters.maxPrice)}%`,
              }"
              aria-hidden="true"
            />
            <button
              class="catalog-range-thumb"
              type="button"
              :style="{ left: `${getPricePercent(filters.minPrice)}%` }"
              :aria-valuemin="options.priceBounds.min"
              :aria-valuemax="filters.maxPrice"
              :aria-valuenow="filters.minPrice"
              aria-label="Minimum price"
              role="slider"
              @pointerdown.stop="startSliderDrag('min', $event)"
            />
            <button
              class="catalog-range-thumb"
              type="button"
              :style="{ left: `${getPricePercent(filters.maxPrice)}%` }"
              :aria-valuemin="filters.minPrice"
              :aria-valuemax="options.priceBounds.max"
              :aria-valuenow="filters.maxPrice"
              aria-label="Maximum price"
              role="slider"
              @pointerdown.stop="startSliderDrag('max', $event)"
            />
          </div>
          <div class="mt-2 flex justify-between text-[0.6875rem] text-white/60">
            <span>{{ formatCurrency(filters.minPrice) }}</span>
            <span>{{ formatCurrency(filters.maxPrice) }}</span>
          </div>
        </section>
      </div>
    </div>

    <div class="catalog-sidebar-chrome mt-6 flex shrink-0 flex-col gap-3 border-t border-white/10 pt-6">
      <button
        class="catalog-primary-button w-full"
        :class="!hasPendingChanges ? 'cursor-not-allowed opacity-60' : ''"
        :disabled="!hasPendingChanges"
        type="button"
        @click="emit('apply-filters')"
      >
        Apply Filters
      </button>

      <button class="catalog-reset-button w-full" type="button" @click="emit('clear-filters')">
        Reset bộ lọc
      </button>
    </div>
  </aside>
</template>
