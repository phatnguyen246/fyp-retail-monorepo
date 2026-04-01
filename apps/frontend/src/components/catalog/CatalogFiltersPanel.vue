<script setup>
import { formatCurrency } from '../../services/formatters'

defineProps({
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

function onMinPriceChange(event) {
  emit('update:min-price', Number(event.target.value))
}

function onMaxPriceChange(event) {
  emit('update:max-price', Number(event.target.value))
}
</script>

<template>
  <aside
    class="catalog-sidebar-panel catalog-scrollbar flex flex-col gap-8 px-6 py-8 text-white xl:sticky xl:top-20 xl:h-[calc(100vh-5rem)] xl:overflow-y-auto 2xl:px-8 2xl:py-10"
  >
    <div class="flex flex-col gap-8">
      <h3 class="catalog-sidebar-title !mb-0 !border-none !pb-0 text-lg">Filters</h3>

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
        <input
          class="catalog-range w-full"
          :min="options.priceBounds.min"
          :max="options.priceBounds.max"
          :step="options.priceBounds.step"
          type="range"
          :value="filters.maxPrice"
          @input="onMaxPriceChange"
        />
        <div class="mt-2 flex justify-between text-[0.6875rem] text-white/60">
          <span>{{ options.priceBounds.min }}</span>
          <span>{{ formatCurrency(options.priceBounds.max) }}</span>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <input
            class="catalog-sidebar-input text-xs"
            :min="options.priceBounds.min"
            :max="filters.maxPrice"
            placeholder="Min"
            type="number"
            :value="filters.minPrice"
            @change="onMinPriceChange"
          />
          <input
            class="catalog-sidebar-input text-xs"
            :min="filters.minPrice"
            :max="options.priceBounds.max"
            placeholder="Max"
            type="number"
            :value="filters.maxPrice"
            @change="onMaxPriceChange"
          />
        </div>
      </section>
    </div>

    <div class="mt-auto flex flex-col gap-3 border-t border-white/10 pt-6">
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
