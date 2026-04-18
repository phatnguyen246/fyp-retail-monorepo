<script setup>
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Bar, Doughnut } from 'vue-chartjs'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip)

const PRODUCT_STATUS_META = Object.freeze({
  draft: {
    label: 'Draft',
    color: '#94a3b8',
    note: 'Content must be completed before publication.',
  },
  active: {
    label: 'Active',
    color: '#2563eb',
    note: 'Available for sales flow and storefront visibility.',
  },
  inactive: {
    label: 'Inactive',
    color: '#f59e0b',
    note: 'Temporarily paused for review or reactivation.',
  },
  discontinued: {
    label: 'Discontinued',
    color: '#dc2626',
    note: 'No longer in the active business lifecycle.',
  },
})

const ORDER_STATUS_META = Object.freeze({
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    note: 'Needs confirmation or next admin action.',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#3b82f6',
    note: 'In processing flow and waiting for completion.',
  },
  completed: {
    label: 'Completed',
    color: '#16a34a',
    note: 'Order has completed the full process.',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    note: 'Order has exited the processing flow.',
  },
})

const PAYMENT_STATUS_META = Object.freeze({
  pending: {
    label: 'Pending payment',
    color: '#f59e0b',
    note: 'Waiting for callback/IPN or payment reconciliation.',
  },
  paid: {
    label: 'Paid',
    color: '#16a34a',
    note: 'Successful payment has been recorded.',
  },
  failed: {
    label: 'Failed',
    color: '#dc2626',
    note: 'Payment transaction did not complete.',
  },
  cancelled: {
    label: 'Payment cancelled',
    color: '#64748b',
    note: 'Payment flow is no longer active.',
  },
})

const INVENTORY_RISK_META = Object.freeze({
  healthy: {
    label: 'Stable',
    color: '#22c55e',
    note: 'Stock level is above threshold.',
  },
  lowStock: {
    label: 'Low stock',
    color: '#f59e0b',
    note: 'Still in stock but already in warning range.',
  },
  outOfStock: {
    label: 'Out of stock',
    color: '#ef4444',
    note: 'Stock has reached zero and needs urgent handling.',
  },
})

const LOW_STOCK_DATASET_META = Object.freeze({
  stockQuantity: {
    label: 'Current stock',
    color: '#2563eb',
  },
  lowStockThreshold: {
    label: 'Low-stock threshold',
    color: '#f59e0b',
  },
  shortageQuantity: {
    label: 'Threshold shortage',
    color: '#dc2626',
  },
})

const chartPalette = Object.freeze({
  border: '#ffffff',
  text: '#43576b',
  grid: 'rgba(148, 163, 184, 0.18)',
  tooltipBackground: 'rgba(15, 23, 42, 0.96)',
  tooltipText: '#e2e8f0',
})

const adminStore = useAdminStore()

const loading = ref(true)
const errorMessage = ref('')

function createEmptyChart() {
  return {
    total: 0,
    labels: [],
    datasets: [],
    breakdown: [],
    highlighted: {
      vnpayPending: 0,
    },
    records: [],
  }
}

const overview = ref({
  productMeta: {
    total: 0,
    draft: 0,
    active: 0,
    inactive: 0,
    discontinued: 0,
    deleted: 0,
    outOfStock: 0,
  },
  orderMeta: {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    vnpayPending: 0,
  },
  paymentMeta: {
    total: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    vnpayPending: 0,
  },
  lowStockMeta: {
    total: 0,
    outOfStock: 0,
  },
  recentOrders: [],
  lowStockRecords: [],
  charts: {
    productStatus: createEmptyChart(),
    orderStatus: createEmptyChart(),
    paymentStatus: createEmptyChart(),
    inventoryRisk: createEmptyChart(),
    lowStockTop: createEmptyChart(),
  },
})

const lowStockPreview = computed(() => overview.value.lowStockRecords.slice(0, 5))
const lowStockChartRecords = computed(() => overview.value.charts.lowStockTop.records || [])

function getChartMeta(meta, key) {
  return meta[key] || {
    label: key,
    color: '#94a3b8',
    note: 'No description available for this data group.',
  }
}

function formatShare(value, total) {
  if (!total) {
    return '0%'
  }

  return `${Math.round((Number(value || 0) / total) * 100)}%`
}

function createBreakdownEntries(chart, meta) {
  return (chart.breakdown || []).map((entry) => {
    const resolvedMeta = getChartMeta(meta, entry.key)

    return {
      key: entry.key,
      label: resolvedMeta.label,
      color: resolvedMeta.color,
      note: resolvedMeta.note,
      value: Number(entry.value || 0),
      shareLabel: formatShare(entry.value, chart.total),
    }
  })
}

function truncateLabel(label, maxLength = 34) {
  const normalized = String(label || '')

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1)}…`
}

function getChartDataset(chart, key) {
  return (
    (chart.datasets || []).find((dataset) => dataset.key === key) || {
      key,
      label: key,
      data: [],
    }
  )
}

function hasPositiveChartValues(chart) {
  return (chart.datasets || []).some((dataset) =>
    (dataset.data || []).some((value) => Number(value || 0) > 0),
  )
}

function createDoughnutChartData(chart, meta) {
  const breakdown = createBreakdownEntries(chart, meta)
  const primaryDataset = chart.datasets?.[0]

  return {
    labels: breakdown.map((entry) => entry.label),
    datasets: [
      {
        label: primaryDataset?.label || 'count',
        data:
          primaryDataset?.data && primaryDataset.data.length > 0
            ? primaryDataset.data.map((value) => Number(value || 0))
            : breakdown.map((entry) => entry.value),
        backgroundColor: breakdown.map((entry) => entry.color),
        borderColor: chartPalette.border,
        borderWidth: 3,
        hoverOffset: 12,
      },
    ],
  }
}

function createBreakdownTooltipLabel(context, chart, meta) {
  const entry = chart.breakdown?.[context.dataIndex]
  const resolvedMeta = getChartMeta(meta, entry?.key)
  const value = Number(context.raw || 0)

  return `${resolvedMeta.label}: ${formatNumber(value)} (${formatShare(value, chart.total)})`
}

function createDoughnutChartOptions(chart, meta) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBackground,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label(context) {
            return createBreakdownTooltipLabel(context, chart, meta)
          },
        },
      },
    },
  }
}

function createBarChartOptions({ onLabel, onTooltipLabel, showLegend = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          color: chartPalette.text,
          usePointStyle: true,
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: chartPalette.tooltipBackground,
        titleColor: chartPalette.tooltipText,
        bodyColor: chartPalette.tooltipText,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label(context) {
            return onTooltipLabel(context)
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: chartPalette.text,
          callback(value) {
            return formatNumber(value)
          },
        },
        grid: {
          color: chartPalette.grid,
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: chartPalette.text,
          callback(value, index) {
            return onLabel(index, value)
          },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  }
}

const productStatusBreakdown = computed(() =>
  createBreakdownEntries(overview.value.charts.productStatus, PRODUCT_STATUS_META),
)

const orderStatusBreakdown = computed(() =>
  createBreakdownEntries(overview.value.charts.orderStatus, ORDER_STATUS_META),
)

const paymentStatusBreakdown = computed(() =>
  createBreakdownEntries(overview.value.charts.paymentStatus, PAYMENT_STATUS_META),
)

const inventoryRiskBreakdown = computed(() =>
  createBreakdownEntries(overview.value.charts.inventoryRisk, INVENTORY_RISK_META),
)

const productStatusHighlights = computed(() => [
  {
    label: 'Soft deleted',
    value: overview.value.productMeta.deleted,
    note: 'Excluded from default managed product totals.',
  },
  {
    label: 'Active but out of stock',
    value: overview.value.productMeta.outOfStock,
    note: 'Contains active variants but currently has no stock.',
  },
])

const orderStatusHighlights = computed(() => [
  {
    label: 'Total orders',
    value: overview.value.orderMeta.total,
    note: 'Current aggregate across the whole system.',
  },
  {
    label: 'VNPAY pending reconciliation',
    value: overview.value.orderMeta.vnpayPending,
    note: 'Online orders with incomplete payment status.',
  },
])

const paymentStatusHighlights = computed(() => [
  {
    label: 'Paid',
    value: overview.value.paymentMeta.paid,
    note: 'Successful transactions have been recorded.',
  },
  {
    label: 'VNPAY pending reconciliation',
    value: overview.value.paymentMeta.vnpayPending,
    note: 'Payment segment that should be prioritized for review.',
  },
])

const inventoryRiskHighlights = computed(() => [
  {
    label: 'Inventory records',
    value: overview.value.charts.inventoryRisk.total,
    note: 'Total tracked inventory records.',
  },
  {
    label: 'Out of stock',
    value: overview.value.lowStockMeta.outOfStock,
    note: 'Inventory records that reached zero stock.',
  },
])

const lowStockHighlights = computed(() => [
  {
    label: 'Low-stock alerts',
    value: overview.value.lowStockMeta.total,
    note: 'All records currently in inventory-risk range.',
  },
  {
    label: 'Out of stock',
    value: overview.value.lowStockMeta.outOfStock,
    note: 'Records that should be replenished with highest priority.',
  },
  {
    label: 'Threshold shortage',
    value: lowStockChartRecords.value.reduce(
      (total, record) => total + Number(record.shortageQuantity || 0),
      0,
    ),
    note: 'Total units missing to bring top records above threshold.',
  },
])

const hasProductStatusChart = computed(() => hasPositiveChartValues(overview.value.charts.productStatus))
const hasOrderStatusChart = computed(() => hasPositiveChartValues(overview.value.charts.orderStatus))
const hasPaymentStatusChart = computed(() => hasPositiveChartValues(overview.value.charts.paymentStatus))
const hasInventoryRiskChart = computed(() => hasPositiveChartValues(overview.value.charts.inventoryRisk))
const hasLowStockTopChart = computed(() => lowStockChartRecords.value.length > 0)

const productStatusChartData = computed(() =>
  createDoughnutChartData(overview.value.charts.productStatus, PRODUCT_STATUS_META),
)

const orderStatusChartData = computed(() => {
  const chart = overview.value.charts.orderStatus
  const dataset = chart.datasets?.[0]

  return {
    labels: orderStatusBreakdown.value.map((entry) => entry.label),
    datasets: [
      {
        label: dataset?.label || 'orderCount',
        data:
          dataset?.data && dataset.data.length > 0
            ? dataset.data.map((value) => Number(value || 0))
            : orderStatusBreakdown.value.map((entry) => entry.value),
        backgroundColor: orderStatusBreakdown.value.map((entry) => entry.color),
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 26,
      },
    ],
  }
})

const paymentStatusChartData = computed(() =>
  createDoughnutChartData(overview.value.charts.paymentStatus, PAYMENT_STATUS_META),
)

const inventoryRiskChartData = computed(() =>
  createDoughnutChartData(overview.value.charts.inventoryRisk, INVENTORY_RISK_META),
)

const lowStockTopChartData = computed(() => {
  const chart = overview.value.charts.lowStockTop
  const stockQuantityDataset = getChartDataset(chart, 'stockQuantity')
  const lowStockThresholdDataset = getChartDataset(chart, 'lowStockThreshold')
  const shortageQuantityDataset = getChartDataset(chart, 'shortageQuantity')

  return {
    labels: lowStockChartRecords.value.map((record) => truncateLabel(record.chartLabel)),
    datasets: [
      {
        label: LOW_STOCK_DATASET_META.stockQuantity.label,
        data: stockQuantityDataset.data.map((value) => Number(value || 0)),
        backgroundColor: LOW_STOCK_DATASET_META.stockQuantity.color,
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 18,
      },
      {
        label: LOW_STOCK_DATASET_META.lowStockThreshold.label,
        data: lowStockThresholdDataset.data.map((value) => Number(value || 0)),
        backgroundColor: LOW_STOCK_DATASET_META.lowStockThreshold.color,
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 18,
      },
      {
        label: LOW_STOCK_DATASET_META.shortageQuantity.label,
        data: shortageQuantityDataset.data.map((value) => Number(value || 0)),
        backgroundColor: LOW_STOCK_DATASET_META.shortageQuantity.color,
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 18,
      },
    ],
  }
})

const productStatusChartOptions = computed(() =>
  createDoughnutChartOptions(overview.value.charts.productStatus, PRODUCT_STATUS_META),
)

const orderStatusChartOptions = computed(() =>
  createBarChartOptions({
    onLabel(index, value) {
      return orderStatusChartData.value.labels[index] || value
    },
    onTooltipLabel(context) {
      const entry = orderStatusBreakdown.value[context.dataIndex]
      const value = Number(context.raw || 0)

      return `${entry?.label || context.label}: ${formatNumber(value)} (${formatShare(
        value,
        overview.value.charts.orderStatus.total,
      )})`
    },
  }),
)

const paymentStatusChartOptions = computed(() =>
  createDoughnutChartOptions(overview.value.charts.paymentStatus, PAYMENT_STATUS_META),
)

const inventoryRiskChartOptions = computed(() =>
  createDoughnutChartOptions(overview.value.charts.inventoryRisk, INVENTORY_RISK_META),
)

const lowStockTopChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartPalette.text,
        usePointStyle: true,
        boxWidth: 12,
        boxHeight: 12,
      },
    },
    tooltip: {
      backgroundColor: chartPalette.tooltipBackground,
      titleColor: chartPalette.tooltipText,
      bodyColor: chartPalette.tooltipText,
      padding: 12,
      displayColors: true,
      usePointStyle: true,
      callbacks: {
        title(items) {
          const record = lowStockChartRecords.value[items[0]?.dataIndex ?? -1]
          return record?.chartLabel || items[0]?.label || ''
        },
        label(context) {
          return `${context.dataset.label}: ${formatNumber(context.raw)} units`
        },
        afterBody(items) {
          const record = lowStockChartRecords.value[items[0]?.dataIndex ?? -1]

          return [
            record?.sku ? `SKU ${record.sku}` : '',
            record?.variantLabel ? `Variant ${record.variantLabel}` : '',
            record?.updatedAt ? `Updated ${formatDate(record.updatedAt)}` : '',
          ].filter(Boolean)
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: chartPalette.text,
        callback(value) {
          return formatNumber(value)
        },
      },
      grid: {
        color: chartPalette.grid,
      },
      border: {
        display: false,
      },
    },
    y: {
      ticks: {
        color: chartPalette.text,
      },
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
    },
  },
}))

function getLowStockTitle(record) {
  return record.productName || `Variant ${record.variantId}`
}

function getLowStockSubtitle(record) {
  return [record.productGroupCode, record.variantLabel, record.sku ? `SKU ${record.sku}` : null]
    .filter(Boolean)
    .join(' • ')
}

function getLowStockShortage(record) {
  return Math.max(Number(record.lowStockThreshold || 0) - Number(record.stockQuantity || 0), 0)
}

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  const result = await adminStore.fetchAdminOverview()

  if (result.success) {
    overview.value = result.data
  } else {
    errorMessage.value = result.error
  }

  loading.value = false
}

onMounted(() => {
  loadOverview()
})
</script>

<template>
  <section class="admin-page admin-page-overview">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Operations Dashboard</p>
        <h1 class="admin-page-title">Admin Overview</h1>
        <p class="admin-page-subtitle">
          Current view of catalog, orders, payments, and inventory to prioritize actions quickly.
        </p>
      </div>

      <div class="admin-toolbar">
        <RouterLink :to="{ name: 'admin-product-create' }" class="admin-button admin-button-primary">
          Create Product
        </RouterLink>
        <button type="button" class="admin-button admin-button-secondary" @click="loadOverview">
          Refresh data
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="admin-alert admin-alert-danger">
      {{ errorMessage }}
    </div>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Products</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.total) }}</p>
        <p class="admin-stat-note">Total products currently managed in the system.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Active</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.active) }}</p>
        <p class="admin-stat-note">Products currently available for sale.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Draft</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.draft) }}</p>
        <p class="admin-stat-note">Products not ready for sale and still pending review.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Pending orders</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.pending) }}</p>
        <p class="admin-stat-note">New orders waiting for confirmation or status updates.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Payments to review</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.vnpayPending) }}</p>
        <p class="admin-stat-note">Online payments not finalized and requiring reconciliation.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Completed orders</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.completed) }}</p>
        <p class="admin-stat-note">Orders fully processed and completed.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Paid orders</p>
        <p class="admin-stat-value">{{ formatNumber(overview.paymentMeta.paid) }}</p>
        <p class="admin-stat-note">Orders with successful payment status recorded.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Low stock</p>
        <p class="admin-stat-value">{{ formatNumber(overview.lowStockMeta.total) }}</p>
        <p class="admin-stat-note">Items that need replenishment to avoid order impact.</p>
      </article>
    </div>

    <div class="admin-overview-chart-grid">
      <section class="admin-card admin-overview-chart-card admin-overview-card-product-status">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Catalog Snapshot</p>
            <h2 class="admin-card-title">Product Status Distribution</h2>
            <p class="admin-chart-caption">This view reflects current operational status across the catalog.</p>
          </div>

          <RouterLink :to="{ name: 'admin-products' }" class="admin-inline-link">
            Open list
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Building product status data...
        </div>

        <div v-else-if="!hasProductStatusChart" class="admin-empty-state admin-empty-state-plain">
          Not enough product data to visualize.
        </div>

        <div v-else class="admin-chart-shell admin-chart-shell-doughnut">
          <div class="admin-chart-canvas">
            <Doughnut :data="productStatusChartData" :options="productStatusChartOptions" />
          </div>

          <div class="admin-chart-detail-stack">
            <div class="admin-chart-highlights">
              <article
                v-for="item in productStatusHighlights"
                :key="item.label"
                class="admin-chart-highlight"
              >
                <p class="admin-chart-highlight-label">{{ item.label }}</p>
                <p class="admin-chart-highlight-value">{{ formatNumber(item.value) }}</p>
                <p class="admin-chart-highlight-note">{{ item.note }}</p>
              </article>
            </div>

            <div class="admin-chart-breakdown">
              <article
                v-for="entry in productStatusBreakdown"
                :key="entry.key"
                class="admin-chart-breakdown-row"
              >
                <div class="admin-chart-breakdown-main">
                  <p class="admin-chart-key">
                    <span class="admin-chart-swatch" :style="{ backgroundColor: entry.color }"></span>
                    <span>{{ entry.label }}</span>
                  </p>
                  <p class="admin-chart-breakdown-note">{{ entry.note }}</p>
                </div>

                <div class="admin-chart-breakdown-values">
                  <strong>{{ formatNumber(entry.value) }}</strong>
                  <span>{{ entry.shareLabel }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-card admin-overview-chart-card admin-overview-card-order-status">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Order Workflow</p>
            <h2 class="admin-card-title">Order Status Distribution</h2>
            <p class="admin-chart-caption">Track progression from pending to confirmed, completed, and cancelled branch.</p>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Open orders
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Aggregating order workflow data...
        </div>

        <div v-else-if="!hasOrderStatusChart" class="admin-empty-state admin-empty-state-plain">
          Not enough order data to visualize.
        </div>

        <div v-else class="admin-chart-shell">
          <div class="admin-chart-highlights">
            <article
              v-for="item in orderStatusHighlights"
              :key="item.label"
              class="admin-chart-highlight"
            >
              <p class="admin-chart-highlight-label">{{ item.label }}</p>
              <p class="admin-chart-highlight-value">{{ formatNumber(item.value) }}</p>
              <p class="admin-chart-highlight-note">{{ item.note }}</p>
            </article>
          </div>

          <div class="admin-chart-canvas">
            <Bar :data="orderStatusChartData" :options="orderStatusChartOptions" />
          </div>

          <div class="admin-chart-breakdown">
            <article
              v-for="entry in orderStatusBreakdown"
              :key="entry.key"
              class="admin-chart-breakdown-row"
            >
              <div class="admin-chart-breakdown-main">
                <p class="admin-chart-key">
                  <span class="admin-chart-swatch" :style="{ backgroundColor: entry.color }"></span>
                  <span>{{ entry.label }}</span>
                </p>
                <p class="admin-chart-breakdown-note">{{ entry.note }}</p>
              </div>

              <div class="admin-chart-breakdown-values">
                <strong>{{ formatNumber(entry.value) }}</strong>
                <span>{{ entry.shareLabel }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="admin-card admin-overview-chart-card admin-overview-card-payment-status">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Payment Overview</p>
            <h2 class="admin-card-title">Payment Status</h2>
            <p class="admin-chart-caption">
              Monitor paid, pending, and failed transactions separately for timely handling.
            </p>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Open orders
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Aggregating payment status...
        </div>

        <div v-else-if="!hasPaymentStatusChart" class="admin-empty-state admin-empty-state-plain">
          Not enough payment data to visualize.
        </div>

        <div v-else class="admin-chart-shell admin-chart-shell-doughnut">
          <div class="admin-chart-canvas">
            <Doughnut :data="paymentStatusChartData" :options="paymentStatusChartOptions" />
          </div>

          <div class="admin-chart-detail-stack">
            <div class="admin-chart-highlights">
              <article
                v-for="item in paymentStatusHighlights"
                :key="item.label"
                class="admin-chart-highlight"
              >
                <p class="admin-chart-highlight-label">{{ item.label }}</p>
                <p class="admin-chart-highlight-value">{{ formatNumber(item.value) }}</p>
                <p class="admin-chart-highlight-note">{{ item.note }}</p>
              </article>
            </div>

            <div class="admin-chart-breakdown">
              <article
                v-for="entry in paymentStatusBreakdown"
                :key="entry.key"
                class="admin-chart-breakdown-row"
              >
                <div class="admin-chart-breakdown-main">
                  <p class="admin-chart-key">
                    <span class="admin-chart-swatch" :style="{ backgroundColor: entry.color }"></span>
                    <span>{{ entry.label }}</span>
                  </p>
                  <p class="admin-chart-breakdown-note">{{ entry.note }}</p>
                </div>

                <div class="admin-chart-breakdown-values">
                  <strong>{{ formatNumber(entry.value) }}</strong>
                  <span>{{ entry.shareLabel }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-card admin-overview-chart-card admin-overview-card-inventory-risk">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Inventory Risk</p>
            <h2 class="admin-card-title">Inventory Risk</h2>
            <p class="admin-chart-caption">
              Track stable, low-stock, and out-of-stock groups to detect inventory bottlenecks over time.
            </p>
          </div>

          <RouterLink :to="{ name: 'admin-inventory' }" class="admin-inline-link">
            Open inventory
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Aggregating inventory risk...
        </div>

        <div v-else-if="!hasInventoryRiskChart" class="admin-empty-state admin-empty-state-plain">
          Not enough inventory data to visualize.
        </div>

        <div v-else class="admin-chart-shell admin-chart-shell-doughnut">
          <div class="admin-chart-canvas">
            <Doughnut :data="inventoryRiskChartData" :options="inventoryRiskChartOptions" />
          </div>

          <div class="admin-chart-detail-stack">
            <div class="admin-chart-highlights">
              <article
                v-for="item in inventoryRiskHighlights"
                :key="item.label"
                class="admin-chart-highlight"
              >
                <p class="admin-chart-highlight-label">{{ item.label }}</p>
                <p class="admin-chart-highlight-value">{{ formatNumber(item.value) }}</p>
                <p class="admin-chart-highlight-note">{{ item.note }}</p>
              </article>
            </div>

            <div class="admin-chart-breakdown">
              <article
                v-for="entry in inventoryRiskBreakdown"
                :key="entry.key"
                class="admin-chart-breakdown-row"
              >
                <div class="admin-chart-breakdown-main">
                  <p class="admin-chart-key">
                    <span class="admin-chart-swatch" :style="{ backgroundColor: entry.color }"></span>
                    <span>{{ entry.label }}</span>
                  </p>
                  <p class="admin-chart-breakdown-note">{{ entry.note }}</p>
                </div>

                <div class="admin-chart-breakdown-values">
                  <strong>{{ formatNumber(entry.value) }}</strong>
                  <span>{{ entry.shareLabel }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="admin-content-grid">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Recent Activity</p>
            <h2 class="admin-card-title">Latest Orders</h2>
          </div>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Loading order overview...
        </div>

        <div v-else-if="overview.recentOrders.length === 0" class="admin-empty-state admin-empty-state-plain">
          No orders to display.
        </div>

        <div v-else class="admin-ledger-list admin-recent-orders-preview">
          <article
            v-for="order in overview.recentOrders"
            :key="order.id"
            class="admin-ledger-entry"
          >
            <div>
              <p class="admin-ledger-title">{{ order.orderCode }}</p>
              <p class="admin-ledger-subtitle">
                {{ order.recipientName }} • {{ formatDate(order.createdAt) }}
              </p>
            </div>

            <div class="admin-ledger-trailing">
              <span class="admin-status-pill" :data-tone="order.orderStatus">
                {{ order.orderStatus }}
              </span>
              <p class="admin-ledger-amount">{{ formatCurrency(order.grandTotal) }}</p>
            </div>
          </article>
          <div class="admin-recent-orders-cta-wrap">
            <div class="admin-recent-orders-cta-blur"></div>
            <RouterLink
              :to="{ name: 'admin-orders' }"
              class="admin-button admin-button-secondary admin-recent-orders-cta"
            >
              Open orders page
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Inventory Monitoring</p>
            <h2 class="admin-card-title">Low-stock Alerts</h2>
          </div>
        </div>

        <div v-if="loading" class="admin-empty-state">Checking low-stock records...</div>

        <div v-else-if="lowStockPreview.length === 0" class="admin-empty-state">
          No items currently require low-stock alerts.
        </div>

        <div v-else class="admin-ledger-list admin-low-stock-preview">
          <article
            v-for="record in lowStockPreview"
            :key="record.id || record.variantId"
            class="admin-ledger-entry"
          >
            <div>
              <p class="admin-ledger-title">{{ getLowStockTitle(record) }}</p>
              <p class="admin-ledger-subtitle">
                {{ getLowStockSubtitle(record) || `Variant ${record.variantId}` }}
              </p>
              <p class="admin-ledger-subtitle">
                Threshold {{ formatNumber(record.lowStockThreshold ?? 0) }} • Updated
                {{ formatDate(record.updatedAt) }}
              </p>
              <p class="admin-ledger-subtitle">
                Short by {{ formatNumber(getLowStockShortage(record)) }} units to return above threshold.
              </p>
            </div>

            <div class="admin-ledger-trailing">
              <span class="admin-status-pill" :data-tone="record.isInStock ? 'warning' : 'danger'">
                {{ formatNumber(record.stockQuantity) }} units
              </span>
            </div>
          </article>
          <div class="admin-low-stock-cta-wrap">
            <div class="admin-low-stock-cta-blur"></div>
            <RouterLink
              :to="{ name: 'admin-inventory' }"
              class="admin-button admin-button-secondary admin-low-stock-cta"
            >
              Open inventory page
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.admin-overview-chart-grid {
  align-items: start;
}

.admin-overview-chart-card :deep(.admin-chart-shell-doughnut) {
  align-items: start;
}

.admin-overview-chart-card :deep(.admin-chart-canvas) {
  align-self: start;
}

.admin-overview-card-product-status {
  order: 1;
}

.admin-overview-card-inventory-risk {
  order: 2;
}

.admin-overview-card-payment-status {
  order: 3;
}

.admin-overview-card-order-status {
  order: 4;
}

.admin-low-stock-preview {
  position: relative;
  padding-bottom: 3rem;
}

.admin-recent-orders-preview {
  position: relative;
  padding-bottom: 3rem;
}

.admin-low-stock-cta-wrap {
  position: absolute;
  left: 50%;
  bottom: 0.5rem;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.admin-low-stock-cta-blur {
  position: absolute;
  inset: -0.3rem -0.8rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0) 70%);
  filter: blur(7px);
  opacity: 0.65;
  pointer-events: none;
}

.admin-low-stock-cta {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  backdrop-filter: blur(1px);
}

.admin-recent-orders-cta-wrap {
  position: absolute;
  left: 50%;
  bottom: 0.5rem;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.admin-recent-orders-cta-blur {
  position: absolute;
  inset: -0.3rem -0.8rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0) 70%);
  filter: blur(7px);
  opacity: 0.65;
  pointer-events: none;
}

.admin-recent-orders-cta {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  backdrop-filter: blur(1px);
}
</style>
