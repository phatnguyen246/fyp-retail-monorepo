import axios from 'axios'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PactV3, MatchersV3 } from '@pact-foundation/pact'
import { fetchCatalogDiscoveryOptions } from '../../src/api/catalogDiscoveryClient'

const { eachLike, like, integer } = MatchersV3

const pactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../pacts')

const provider = new PactV3({
  consumer: 'retail-frontend',
  provider: 'retail-backend',
  dir: pactDir,
})

describe('catalog discovery contract', () => {
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
      const httpClient = axios.create({
        baseURL: mockServer.url,
        timeout: 5000,
      })

      const payload = await fetchCatalogDiscoveryOptions({
        httpClient,
      })

      expect(payload.data).toBeTruthy()
      expect(payload.data.sortModes[0].value).toBe('newest')
      expect(payload.data.priceBounds.step).toBe(500000)
    })
  })
})
