export interface ShippingAddress {
  street: string
  provinceCode: number | null
  provinceName: string
  districtCode: number | null
  districtName: string
  wardCode: number | null
  wardName: string
}

export function createEmptyShippingAddress(): ShippingAddress {
  return {
    street: '',
    provinceCode: null,
    provinceName: '',
    districtCode: null,
    districtName: '',
    wardCode: null,
    wardName: '',
  }
}

export function normalizeShippingAddress(value: Partial<ShippingAddress> | null | undefined): ShippingAddress {
  return {
    ...createEmptyShippingAddress(),
    ...(value ?? {}),
  }
}

export function isShippingAddressComplete(value: Partial<ShippingAddress> | null | undefined): boolean {
  const address = normalizeShippingAddress(value)

  return (
    address.street.trim().length > 0 &&
    Number.isInteger(address.provinceCode) &&
    Number.isInteger(address.districtCode) &&
    Number.isInteger(address.wardCode) &&
    address.provinceName.trim().length > 0 &&
    address.districtName.trim().length > 0 &&
    address.wardName.trim().length > 0
  )
}

export function composeShippingAddressLine(value: Partial<ShippingAddress> | null | undefined): string {
  const address = normalizeShippingAddress(value)

  return [address.street, address.wardName, address.districtName, address.provinceName]
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join(', ')
}
