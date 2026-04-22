import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { PactV3, MatchersV3 } from '@pact-foundation/pact'
import http from '../../src/services/http'
import {
  fetchCatalogOptions,
  fetchCatalogProductDetail,
  fetchCatalogProducts,
} from '../../src/services/catalog.service'

const { eachLike, like, integer } = MatchersV3

const pactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../pacts')

const provider = new PactV3({
  consumer: 'retail-frontend',
  provider: 'retail-backend',
  dir: pactDir,
})

describe('catalog discovery contract', () => {
  const originalBaseURL = http.defaults.baseURL

  afterEach(() => {
    http.defaults.baseURL = originalBaseURL
  })

  it('returns discovery options for storefront filters', async () => {
    provider
      .given('catalog discovery options exist for smartphone category')
      .uponReceiving('a request for smartphone catalog discovery options')
      .withRequest({
        method: 'GET',
        path: '/catalog/discovery-options',
        query: {
          categoryCode: 'SMARTPHONE',
          productType: 'smartphone',
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          data: {
            brands: eachLike({
              label: like('Apple'),
              value: like('APPLE'),
            }),
            tags: eachLike({
              label: like('Camera Phone'),
              value: like('camera-phone'),
            }),
            ram: eachLike({
              label: like('8 GB'),
              value: like('8GB'),
            }),
            rom: eachLike({
              label: like('256 GB'),
              value: like('256GB'),
            }),
            colors: eachLike({
              label: like('Blue'),
              value: like('Blue'),
            }),
            sortModes: eachLike({
              label: like('Mới nhất'),
              value: like('newest'),
            }),
            priceBounds: {
              min: integer(0),
              max: integer(30000000),
              step: integer(500000),
            },
          },
        },
      })

    await provider.executeTest(async (mockServer) => {
      http.defaults.baseURL = mockServer.url

      const options = await fetchCatalogOptions()

      expect(options).toBeTruthy()
      expect(options.sortModes[0].value).toBe('newest')
      expect(options.priceBounds.step).toBe(500000)
    })
  })

  it('returns storefront product listing', async () => {
    provider
      .given('catalog product list exists for smartphone storefront')
      .uponReceiving('a request for storefront product listing')
      .withRequest({
        method: 'GET',
        path: '/catalog/products',
        query: {
          categoryCode: 'SMARTPHONE',
          productType: 'smartphone',
          page: '1',
          limit: '12',
          sortMode: 'newest',
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          data: eachLike({
            id: like('65f100000000000000000010'),
            title: like('iPhone 16'),
            slug: like('dien-thoai-iphone-16'),
            minSalePrice: integer(24990000),
            hasInStockVariants: like(true),
          }),
          meta: {
            page: integer(1),
            limit: integer(12),
            total: integer(1),
            totalPages: integer(1),
          },
        },
      })

    await provider.executeTest(async (mockServer) => {
      http.defaults.baseURL = mockServer.url

      const result = await fetchCatalogProducts({
        page: 1,
        limit: 12,
        sortMode: 'newest',
        search: '',
        brand: '',
        tag: '',
        ram: [],
        rom: [],
        color: [],
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].title).toBe('iPhone 16')
      expect(result.meta.total).toBe(1)
    })
  })

  it('returns storefront product detail', async () => {
    const productId = '65f100000000000000000010'
    const productSlug = 'dien-thoai-iphone-16'

    provider
      .given('catalog product detail exists for iphone 16')
      .uponReceiving('a request for storefront product detail')
      .withRequest({
        method: 'GET',
        path: `/catalog/products/${productId}/${productSlug}`,
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          data: {
            id: like(productId),
            title: like('iPhone 16'),
            slug: like(productSlug),
            minSalePrice: integer(24990000),
            variants: eachLike({
              id: like('65f100000000000000000020'),
              sku: like('IP16-BLU-256'),
              isInStock: like(true),
            }),
          },
          meta: {
            canonicalSlug: like(productSlug),
          },
        },
      })

    await provider.executeTest(async (mockServer) => {
      http.defaults.baseURL = mockServer.url

      const result = await fetchCatalogProductDetail(productId, productSlug)

      expect(result.item.id).toBe(productId)
      expect(result.item.variants.length).toBeGreaterThan(0)
      expect(result.meta.canonicalSlug).toBe(productSlug)
    })
  })
})
