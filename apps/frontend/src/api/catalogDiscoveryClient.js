import http from '../services/http'

export async function fetchCatalogDiscoveryOptions({
  httpClient = http,
  categoryCode = 'SMARTPHONE',
  productType = 'smartphone',
} = {}) {
  const response = await httpClient.get('/catalog/discovery-options', {
    params: {
      categoryCode,
      productType,
    },
  })

  return response.data
}
