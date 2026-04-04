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
    label: 'Bản nháp',
    color: '#94a3b8',
    note: 'Cần hoàn thiện nội dung trước khi mở bán.',
  },
  active: {
    label: 'Đang bán',
    color: '#2563eb',
    note: 'Sẵn sàng cho luồng bán hàng và hiển thị sản phẩm.',
  },
  inactive: {
    label: 'Tạm ngưng',
    color: '#f59e0b',
    note: 'Tạm dừng bán để rà soát hoặc chờ kích hoạt lại.',
  },
  discontinued: {
    label: 'Ngừng kinh doanh',
    color: '#dc2626',
    note: 'Không còn trong vòng đời kinh doanh hiện tại.',
  },
})

const ORDER_STATUS_META = Object.freeze({
  pending: {
    label: 'Chờ xử lý',
    color: '#f59e0b',
    note: 'Cần xác nhận hoặc thao tác tiếp theo từ admin.',
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: '#3b82f6',
    note: 'Đã đi vào luồng xử lý và chờ hoàn tất.',
  },
  completed: {
    label: 'Hoàn tất',
    color: '#16a34a',
    note: 'Đơn đã kết thúc toàn bộ quy trình.',
  },
  cancelled: {
    label: 'Đã hủy',
    color: '#ef4444',
    note: 'Đơn đã rời khỏi pipeline xử lý.',
  },
})

const PAYMENT_STATUS_META = Object.freeze({
  pending: {
    label: 'Chờ thanh toán',
    color: '#f59e0b',
    note: 'Cần chờ callback/IPN hoặc đối soát thanh toán.',
  },
  paid: {
    label: 'Đã thanh toán',
    color: '#16a34a',
    note: 'Đơn đã ghi nhận trạng thái thanh toán thành công.',
  },
  failed: {
    label: 'Thất bại',
    color: '#dc2626',
    note: 'Giao dịch thanh toán không hoàn tất.',
  },
  cancelled: {
    label: 'Đã hủy thanh toán',
    color: '#64748b',
    note: 'Thanh toán không còn tiếp tục xử lý.',
  },
})

const INVENTORY_RISK_META = Object.freeze({
  healthy: {
    label: 'Ổn định',
    color: '#22c55e',
    note: 'Tồn kho đang nằm trên ngưỡng cảnh báo.',
  },
  lowStock: {
    label: 'Sát ngưỡng',
    color: '#f59e0b',
    note: 'Vẫn còn hàng nhưng đã rơi vào vùng low stock.',
  },
  outOfStock: {
    label: 'Hết hàng',
    color: '#ef4444',
    note: 'Stock đã về 0 và cần xử lý gấp.',
  },
})

const LOW_STOCK_DATASET_META = Object.freeze({
  stockQuantity: {
    label: 'Tồn hiện tại',
    color: '#2563eb',
  },
  lowStockThreshold: {
    label: 'Ngưỡng cảnh báo',
    color: '#f59e0b',
  },
  shortageQuantity: {
    label: 'Thiếu so với ngưỡng',
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

const lowStockPreview = computed(() => overview.value.lowStockRecords.slice(0, 6))
const lowStockChartRecords = computed(() => overview.value.charts.lowStockTop.records || [])

function getChartMeta(meta, key) {
  return meta[key] || {
    label: key,
    color: '#94a3b8',
    note: 'Chưa có mô tả cho nhóm dữ liệu này.',
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
    label: 'Đã xóa mềm',
    value: overview.value.productMeta.deleted,
    note: 'Không nằm trong tổng sản phẩm đang quản lý mặc định.',
  },
  {
    label: 'Active nhưng hết hàng',
    value: overview.value.productMeta.outOfStock,
    note: 'Có active variant nhưng không còn hàng để bán.',
  },
])

const orderStatusHighlights = computed(() => [
  {
    label: 'Tổng đơn hàng',
    value: overview.value.orderMeta.total,
    note: 'Snapshot hiện tại trên toàn bộ hệ thống.',
  },
  {
    label: 'VNPAY chờ đối soát',
    value: overview.value.orderMeta.vnpayPending,
    note: 'Đơn online chưa hoàn tất trạng thái thanh toán.',
  },
])

const paymentStatusHighlights = computed(() => [
  {
    label: 'Đã thanh toán',
    value: overview.value.paymentMeta.paid,
    note: 'Đã ghi nhận giao dịch thành công.',
  },
  {
    label: 'VNPAY chờ đối soát',
    value: overview.value.paymentMeta.vnpayPending,
    note: 'Nhóm thanh toán cần ưu tiên kiểm tra.',
  },
])

const inventoryRiskHighlights = computed(() => [
  {
    label: 'Bản ghi inventory',
    value: overview.value.charts.inventoryRisk.total,
    note: 'Tổng số record tồn kho đang theo dõi.',
  },
  {
    label: 'Hết hàng',
    value: overview.value.lowStockMeta.outOfStock,
    note: 'Record tồn kho đã chạm 0.',
  },
])

const lowStockHighlights = computed(() => [
  {
    label: 'Mức low stock',
    value: overview.value.lowStockMeta.total,
    note: 'Toàn bộ record đang nằm ở vùng rủi ro tồn kho.',
  },
  {
    label: 'Hết hàng',
    value: overview.value.lowStockMeta.outOfStock,
    note: 'Nhóm record cần ưu tiên nhập bổ sung ngay.',
  },
  {
    label: 'Thiếu so với ngưỡng',
    value: lowStockChartRecords.value.reduce(
      (total, record) => total + Number(record.shortageQuantity || 0),
      0,
    ),
    note: 'Tổng đơn vị còn thiếu để đưa top record lên trên ngưỡng cảnh báo.',
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
          return `${context.dataset.label}: ${formatNumber(context.raw)} chiếc`
        },
        afterBody(items) {
          const record = lowStockChartRecords.value[items[0]?.dataIndex ?? -1]

          return [
            record?.sku ? `SKU ${record.sku}` : '',
            record?.variantLabel ? `Biến thể ${record.variantLabel}` : '',
            record?.updatedAt ? `Cập nhật ${formatDate(record.updatedAt)}` : '',
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
        <p class="admin-page-kicker">Bảng điều hành</p>
        <h1 class="admin-page-title">Tổng quan quản trị</h1>
        <p class="admin-page-subtitle">
          Snapshot hiện tại của danh mục, đơn hàng, thanh toán và tồn kho để ưu tiên xử lý nhanh.
        </p>
      </div>

      <div class="admin-toolbar">
        <RouterLink :to="{ name: 'admin-product-create' }" class="admin-button admin-button-primary">
          Soạn sản phẩm mới
        </RouterLink>
        <button type="button" class="admin-button admin-button-secondary" @click="loadOverview">
          Làm mới số liệu
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="admin-alert admin-alert-danger">
      {{ errorMessage }}
    </div>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Sản phẩm</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.total) }}</p>
        <p class="admin-stat-note">Tổng số sản phẩm đang được quản lý trong hệ thống.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Đang bán</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.active) }}</p>
        <p class="admin-stat-note">Các sản phẩm đang ở trạng thái active cho vận hành bán hàng.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Chờ hoàn thiện</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.draft) }}</p>
        <p class="admin-stat-note">Sản phẩm chưa sẵn sàng mở bán và cần rà soát nội dung.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Đơn chờ xử lý</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.pending) }}</p>
        <p class="admin-stat-note">Các đơn mới đang chờ xác nhận hoặc cập nhật trạng thái.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Thanh toán cần kiểm tra</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.vnpayPending) }}</p>
        <p class="admin-stat-note">Đơn thanh toán online chưa hoàn tất, cần đối chiếu thêm.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Đã hoàn tất</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.completed) }}</p>
        <p class="admin-stat-note">Số đơn đã xử lý xong và hoàn tất giao dịch.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Đã thanh toán</p>
        <p class="admin-stat-value">{{ formatNumber(overview.paymentMeta.paid) }}</p>
        <p class="admin-stat-note">Những đơn đã ghi nhận trạng thái thanh toán thành công.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Tồn kho thấp</p>
        <p class="admin-stat-value">{{ formatNumber(overview.lowStockMeta.total) }}</p>
        <p class="admin-stat-note">Mặt hàng cần nhập thêm để tránh ảnh hưởng đơn mới.</p>
      </article>
    </div>

    <div class="admin-overview-chart-grid">
      <section class="admin-card admin-overview-chart-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Snapshot catalog</p>
            <h2 class="admin-card-title">Phân bổ trạng thái sản phẩm</h2>
            <p class="admin-chart-caption">Nhóm này phản ánh trạng thái vận hành của catalog hiện tại.</p>
          </div>

          <RouterLink :to="{ name: 'admin-products' }" class="admin-inline-link">
            Mở danh sách
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Đang dựng dữ liệu trạng thái sản phẩm...
        </div>

        <div v-else-if="!hasProductStatusChart" class="admin-empty-state admin-empty-state-plain">
          Chưa có dữ liệu sản phẩm đủ để sơ đồ hóa.
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

      <section class="admin-card admin-overview-chart-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Luồng đơn hàng</p>
            <h2 class="admin-card-title">Phân bổ trạng thái đơn hàng</h2>
            <p class="admin-chart-caption">Bám sát flow xử lý `pending → confirmed → completed` và nhánh hủy.</p>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Mở đơn hàng
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Đang dựng pipeline đơn hàng...
        </div>

        <div v-else-if="!hasOrderStatusChart" class="admin-empty-state admin-empty-state-plain">
          Chưa có dữ liệu đơn hàng đủ để sơ đồ hóa.
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

      <section class="admin-card admin-overview-chart-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Snapshot thanh toán</p>
            <h2 class="admin-card-title">Trạng thái thanh toán</h2>
            <p class="admin-chart-caption">
              Tách riêng logic payment để phân biệt `paid` với `vnpayPending` và các ca thất bại.
            </p>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Mở đơn hàng
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Đang tổng hợp trạng thái thanh toán...
        </div>

        <div v-else-if="!hasPaymentStatusChart" class="admin-empty-state admin-empty-state-plain">
          Chưa có dữ liệu thanh toán đủ để sơ đồ hóa.
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

      <section class="admin-card admin-overview-chart-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Rủi ro inventory</p>
            <h2 class="admin-card-title">Rủi ro tồn kho</h2>
            <p class="admin-chart-caption">
              Tách nhóm `healthy`, `lowStock` và `outOfStock` để nhìn độ căng tồn kho tức thời.
            </p>
          </div>

          <RouterLink :to="{ name: 'admin-inventory' }" class="admin-inline-link">
            Mở bàn tồn kho
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Đang đối chiếu risk inventory...
        </div>

        <div v-else-if="!hasInventoryRiskChart" class="admin-empty-state admin-empty-state-plain">
          Chưa có inventory record đủ để sơ đồ hóa.
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

    <section class="admin-card admin-overview-wide-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Ưu tiên bổ sung</p>
          <h2 class="admin-card-title">Top cảnh báo tồn kho thấp</h2>
          <p class="admin-chart-caption">
            Backend đã trả về top record nguy cấp nhất để theo dõi trực tiếp bằng bar chart ngang.
          </p>
        </div>

        <RouterLink :to="{ name: 'admin-inventory' }" class="admin-inline-link">
          Mở bàn tồn kho
        </RouterLink>
      </div>

      <div v-if="loading" class="admin-empty-state">
        Đang dựng chart ưu tiên nhập bổ sung...
      </div>

      <div v-else-if="!hasLowStockTopChart" class="admin-empty-state">
        Chưa có record low stock để sơ đồ hóa ưu tiên bổ sung.
      </div>

      <div v-else class="admin-chart-shell">
        <div class="admin-chart-highlights">
          <article
            v-for="item in lowStockHighlights"
            :key="item.label"
            class="admin-chart-highlight"
          >
            <p class="admin-chart-highlight-label">{{ item.label }}</p>
            <p class="admin-chart-highlight-value">{{ formatNumber(item.value) }}</p>
            <p class="admin-chart-highlight-note">{{ item.note }}</p>
          </article>
        </div>

        <div class="admin-chart-canvas admin-chart-canvas-wide">
          <Bar :data="lowStockTopChartData" :options="lowStockTopChartOptions" />
        </div>
      </div>
    </section>

    <div class="admin-content-grid">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Nhật ký gần đây</p>
            <h2 class="admin-card-title">Đơn hàng mới nhất</h2>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Xem toàn bộ
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state admin-empty-state-plain">
          Đang tải tổng quan đơn hàng...
        </div>

        <div v-else-if="overview.recentOrders.length === 0" class="admin-empty-state admin-empty-state-plain">
          Chưa có đơn hàng để hiển thị.
        </div>

        <div v-else class="admin-ledger-list">
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
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Theo dõi tồn kho</p>
            <h2 class="admin-card-title">Cảnh báo tồn kho thấp</h2>
          </div>

          <RouterLink :to="{ name: 'admin-inventory' }" class="admin-inline-link">
            Mở bàn tồn kho
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state">Đang đối chiếu tồn kho thấp...</div>

        <div v-else-if="lowStockPreview.length === 0" class="admin-empty-state">
          Chưa có mặt hàng nào cần cảnh báo tồn kho.
        </div>

        <div v-else class="admin-ledger-list">
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
                Ngưỡng {{ formatNumber(record.lowStockThreshold ?? 0) }} • Cập nhật
                {{ formatDate(record.updatedAt) }}
              </p>
              <p class="admin-ledger-subtitle">
                Thiếu {{ formatNumber(getLowStockShortage(record)) }} chiếc để quay lại trên ngưỡng cảnh báo.
              </p>
            </div>

            <div class="admin-ledger-trailing">
              <span class="admin-status-pill" :data-tone="record.isInStock ? 'warning' : 'danger'">
                {{ formatNumber(record.stockQuantity) }} chiếc
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
