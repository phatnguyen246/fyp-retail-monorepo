const currencyFormatters = new Map()
const numberFormatter = new Intl.NumberFormat('vi-VN')
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function getCurrencyFormatter(currency) {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }),
    )
  }

  return currencyFormatters.get(currency)
}

export function formatCurrency(value, currency = 'VND') {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return 'Liên hệ'
  }

  return getCurrencyFormatter(currency).format(amount)
}

export function formatNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? numberFormatter.format(amount) : '0'
}

export function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return dateFormatter.format(date)
}
