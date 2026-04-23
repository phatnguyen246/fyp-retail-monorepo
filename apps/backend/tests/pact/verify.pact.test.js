import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { ObjectId } from 'mongodb'
import { afterEach, describe, expect, it } from 'vitest'
import { Verifier } from '@pact-foundation/pact'
import { createApp } from '../../src/bootstrap/app.js'

function createStorefrontCatalogSeedState() {
  const appleBrandId = new ObjectId('65f100000000000000000001')
  const samsungBrandId = new ObjectId('65f100000000000000000002')
  const categoryId = new ObjectId('65f100000000000000000003')
  const cameraTagId = new ObjectId('65f100000000000000000004')
  const batteryTagId = new ObjectId('65f100000000000000000005')
  const iphoneProductId = new ObjectId('65f100000000000000000010')
  const galaxyProductId = new ObjectId('65f100000000000000000011')
  const iphoneVariantId = new ObjectId('65f100000000000000000020')
  const galaxyVariantId = new ObjectId('65f100000000000000000021')

  return {
    brands: [
      {
        _id: appleBrandId,
        code: 'APPLE',
        name: 'Apple',
      },
      {
        _id: samsungBrandId,
        code: 'SAMSUNG',
        name: 'Samsung',
      },
    ],
    categories: [
      {
        _id: categoryId,
        code: 'SMARTPHONE',
        name: 'Smartphone',
      },
    ],
    tags: [
      {
        _id: cameraTagId,
        code: 'camera-phone',
        name: 'Camera Phone',
      },
      {
        _id: batteryTagId,
        code: 'battery-phone',
        name: 'Battery Phone',
      },
    ],
    products: [
      {
        _id: iphoneProductId,
        title: 'iPhone 16',
        slug: 'dien-thoai-iphone-16',
        productType: 'smartphone',
        status: 'active',
        isDeleted: false,
        hasActiveVariants: true,
        hasInStockVariants: true,
        shortDescription: 'iPhone 16 storefront contract product',
        longDescription: 'Contract test product detail',
        searchTitle: 'iphone 16',
        badges: ['hot'],
        contactWhenOutOfStock: false,
        brandId: appleBrandId,
        categoryId,
        tagIds: [cameraTagId],
        minSalePrice: 24990000,
        minOriginalPrice: 26990000,
        listingVariantSnapshot: {
          variantId: iphoneVariantId,
          sku: 'IP16-BLU-256',
          color: 'Blue',
          ram: '8GB',
          rom: '256GB',
          salePrice: 24990000,
          originalPrice: 26990000,
          currency: 'VND',
        },
        specs: {
          chipset: 'A18',
          battery: '3561mAh',
        },
      },
      {
        _id: galaxyProductId,
        title: 'Samsung S25',
        slug: 'dien-thoai-samsung-s25',
        productType: 'smartphone',
        status: 'active',
        isDeleted: false,
        hasActiveVariants: true,
        hasInStockVariants: true,
        shortDescription: 'Samsung storefront contract product',
        searchTitle: 'samsung s25',
        badges: ['new'],
        brandId: samsungBrandId,
        categoryId,
        tagIds: [batteryTagId],
        minSalePrice: 28990000,
        minOriginalPrice: 30990000,
        listingVariantSnapshot: {
          variantId: galaxyVariantId,
          sku: 'S25-BLK-512',
          color: 'Black',
          ram: '12GB',
          rom: '512GB',
          salePrice: 28990000,
          originalPrice: 30990000,
          currency: 'VND',
        },
      },
    ],
    variants: [
      {
        _id: iphoneVariantId,
        productId: iphoneProductId,
        sku: 'IP16-BLU-256',
        status: 'active',
        isDeleted: false,
        originalPrice: 26990000,
        salePrice: 24990000,
        currency: 'VND',
        variantAttributes: {
          ram: '8GB',
          rom: '256GB',
          color: 'Blue',
        },
      },
      {
        _id: galaxyVariantId,
        productId: galaxyProductId,
        sku: 'S25-BLK-512',
        status: 'active',
        isDeleted: false,
        originalPrice: 30990000,
        salePrice: 28990000,
        currency: 'VND',
        variantAttributes: {
          ram: '12GB',
          rom: '512GB',
          color: 'Black',
        },
      },
    ],
    inventoryRecords: [
      {
        _id: new ObjectId('65f100000000000000000030'),
        variantId: iphoneVariantId,
        stockQuantity: 8,
        lowStockThreshold: 3,
      },
      {
        _id: new ObjectId('65f100000000000000000031'),
        variantId: galaxyVariantId,
        stockQuantity: 5,
        lowStockThreshold: 3,
      },
    ],
    productMediaMetadata: [
      {
        _id: new ObjectId('65f100000000000000000040'),
        productId: iphoneProductId,
        variantId: iphoneVariantId,
        url: 'https://cdn.example.com/products/iphone16-blue-front.jpg',
        fileName: 'iphone16-blue-front.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        sortOrder: 0,
      },
      {
        _id: new ObjectId('65f100000000000000000041'),
        productId: galaxyProductId,
        variantId: galaxyVariantId,
        url: 'https://cdn.example.com/products/s25-black-front.jpg',
        fileName: 's25-black-front.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        sortOrder: 0,
      },
    ],
  }
}

function createInMemoryDb(initialState = {}) {
  const collections = new Map()

  function setState(nextState) {
    collections.clear()

    Object.entries(nextState).forEach(([name, docs]) => {
      collections.set(name, Array.isArray(docs) ? [...docs] : [])
    })
  }

  setState(initialState)

  return {
    reset(nextState) {
      setState(nextState)
    },

    collection(name) {
      if (!collections.has(name)) {
        collections.set(name, [])
      }

      const docs = collections.get(name)

      return {
        createIndex: async () => 'ok',

        async findOne(filter = {}, options = {}) {
          const found = docs.find((doc) => matchesFilter(doc, filter)) || null
          return applyProjection(found, options.projection)
        },

        find(filter = {}, options = {}) {
          let sortConfig = null
          let limitCount = null
          let skipCount = 0

          return {
            sort(config) {
              sortConfig = config
              return this
            },
            limit(value) {
              limitCount = value
              return this
            },
            skip(value) {
              skipCount = value
              return this
            },
            async toArray() {
              let results = docs.filter((doc) => matchesFilter(doc, filter))

              if (sortConfig && Object.keys(sortConfig).length > 0) {
                results = [...results].sort((left, right) => {
                  for (const [fieldName, direction] of Object.entries(sortConfig)) {
                    const leftValue = getValue(left, fieldName)
                    const rightValue = getValue(right, fieldName)
                    const compared = compareValues(leftValue, rightValue)

                    if (compared !== 0) {
                      return direction === -1 ? -compared : compared
                    }
                  }

                  return 0
                })
              }

              if (skipCount > 0) {
                results = results.slice(skipCount)
              }

              if (typeof limitCount === 'number' && limitCount >= 0) {
                results = results.slice(0, limitCount)
              }

              return results.map((doc) => applyProjection(doc, options.projection))
            },
          }
        },

        async insertOne(document) {
          docs.push(document)
          return { acknowledged: true, insertedId: document?._id }
        },

        async updateOne(filter = {}, update = {}, options = {}) {
          const foundIndex = docs.findIndex((doc) => matchesFilter(doc, filter))

          if (foundIndex === -1) {
            if (!options.upsert) {
              return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }
            }

            const created = {}
            applyUpdate(created, update, true)
            docs.push(created)

            return {
              acknowledged: true,
              matchedCount: 0,
              modifiedCount: 0,
              upsertedCount: 1,
            }
          }

          applyUpdate(docs[foundIndex], update, false)

          return { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
        },

        async updateMany(filter = {}, update = {}) {
          let modifiedCount = 0

          for (const doc of docs) {
            if (!matchesFilter(doc, filter)) {
              continue
            }

            applyUpdate(doc, update, false)
            modifiedCount += 1
          }

          return { acknowledged: true, modifiedCount }
        },

        async countDocuments(filter = {}) {
          return docs.filter((doc) => matchesFilter(doc, filter)).length
        },

        async deleteOne(filter = {}) {
          const foundIndex = docs.findIndex((doc) => matchesFilter(doc, filter))

          if (foundIndex === -1) {
            return { acknowledged: true, deletedCount: 0 }
          }

          docs.splice(foundIndex, 1)
          return { acknowledged: true, deletedCount: 1 }
        },
      }
    },
  }
}

function getValue(doc, fieldName) {
  if (!fieldName) {
    return undefined
  }

  const keys = fieldName.split('.')
  let current = doc

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }

    current = current[key]
  }

  return current
}

function toComparable(value) {
  if (value && typeof value.toHexString === 'function') {
    return value.toHexString()
  }

  return value
}

function compareValues(left, right) {
  const normalizedLeft = toComparable(left)
  const normalizedRight = toComparable(right)

  if (normalizedLeft === normalizedRight) {
    return 0
  }

  if (normalizedLeft === undefined || normalizedLeft === null) {
    return -1
  }

  if (normalizedRight === undefined || normalizedRight === null) {
    return 1
  }

  return normalizedLeft < normalizedRight ? -1 : 1
}

function matchesFilter(doc, filter = {}) {
  return Object.entries(filter).every(([fieldName, expected]) =>
    matchesField(getValue(doc, fieldName), expected),
  )
}

function matchesField(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    const operatorKeys = Object.keys(expected).filter((key) => key.startsWith('$'))

    if (operatorKeys.length > 0) {
      return operatorKeys.every((operator) => {
        if (operator === '$regex') {
          const source = expected.$regex
          const flags = typeof expected.$options === 'string' ? expected.$options : ''

          if (typeof actual !== 'string') {
            return false
          }

          if (source instanceof RegExp) {
            const mergedFlags = `${source.flags}${flags}`
            const uniqueFlags = [...new Set(mergedFlags.split(''))].join('')
            return new RegExp(source.source, uniqueFlags).test(actual)
          }

          if (typeof source === 'string') {
            return new RegExp(source, flags).test(actual)
          }

          return false
        }

        if (operator === '$options') {
          return true
        }

        if (operator === '$in') {
          const values = Array.isArray(expected.$in) ? expected.$in : []
          return values.some((candidate) => toComparable(actual) === toComparable(candidate))
        }

        if (operator === '$ne') {
          return toComparable(actual) !== toComparable(expected.$ne)
        }

        return false
      })
    }
  }

  return toComparable(actual) === toComparable(expected)
}

function applyProjection(doc, projection) {
  if (!doc) {
    return null
  }

  if (!projection || Object.keys(projection).length === 0) {
    return doc
  }

  const projected = {}

  Object.entries(projection).forEach(([fieldName, enabled]) => {
    if (!enabled) {
      return
    }

    projected[fieldName] = getValue(doc, fieldName)
  })

  return projected
}

function applyUpdate(target, update, isInsert) {
  if (update.$set && typeof update.$set === 'object') {
    Object.assign(target, update.$set)
  }

  if (isInsert && update.$setOnInsert && typeof update.$setOnInsert === 'object') {
    Object.assign(target, update.$setOnInsert)
  }
}

async function startProviderServer() {
  const db = createInMemoryDb(createStorefrontCatalogSeedState())
  const client = { close: async () => undefined }

  const app = await createApp({
    connectMongoFn: async () => ({ client, db }),
    storage: null,
  })

  app.post('/_pact/provider-states', async (req, res) => {
    const state = req.body?.state

    if (
      state === 'catalog discovery options exist for smartphone category' ||
      state === 'catalog product list exists for smartphone storefront' ||
      state === 'catalog product detail exists for iphone 16'
    ) {
      db.reset(createStorefrontCatalogSeedState())
      return res.sendStatus(200)
    }

    return res.status(400).json({ message: `Unsupported provider state: ${state}` })
  })

  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer))
  })

  const { port } = server.address()

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

async function stopProviderServer(server) {
  if (!server) {
    return
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function downloadPactFromBroker({
  brokerUrl,
  brokerToken,
  providerName,
  consumerName,
  consumerBranch,
}) {
  const normalizedBrokerUrl = String(brokerUrl || '').replace(/\/$/, '')
  const branch = String(consumerBranch || 'main')
  const candidateUrls = [
    `${normalizedBrokerUrl}/pacts/provider/${encodeURIComponent(providerName)}/consumer/${encodeURIComponent(consumerName)}/branch/${encodeURIComponent(branch)}/latest`,
    `${normalizedBrokerUrl}/pacts/provider/${encodeURIComponent(providerName)}/consumer/${encodeURIComponent(consumerName)}/latest`,
  ]

  let lastFailure = null

  for (const url of candidateUrls) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/hal+json, application/json',
        ...(brokerToken
          ? {
              Authorization: `Bearer ${brokerToken}`,
            }
          : {}),
      },
    })

    if (response.ok) {
      const pactBody = await response.text()
      let publishVerificationUrl = null

      try {
        const pactJson = JSON.parse(pactBody)
        const publishLink = pactJson?._links?.['pb:publish-verification-results']?.href

        if (publishLink) {
          publishVerificationUrl = publishLink.startsWith('http')
            ? publishLink
            : `${normalizedBrokerUrl}${publishLink.startsWith('/') ? '' : '/'}${publishLink}`
        }
      } catch {
        publishVerificationUrl = null
      }

      const pactFilePath = path.join(
        os.tmpdir(),
        `retail-frontend-retail-backend.${Date.now()}.pact.json`,
      )

      await fs.promises.writeFile(pactFilePath, pactBody, 'utf8')

      return { pactFilePath, publishVerificationUrl }
    }

    lastFailure = new Error(`Failed to fetch pact from ${url}. Status ${response.status}`)
  }

  throw lastFailure || new Error('Unable to fetch pact from broker')
}

function resolveBuildUrlFromEnv() {
  if (process.env.PACT_BUILD_URL) {
    return process.env.PACT_BUILD_URL
  }

  if (
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
  ) {
    return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  }

  return undefined
}

async function publishVerificationResultToBroker({
  publishUrl,
  brokerToken,
  providerVersion,
  providerVersionBranch,
}) {
  if (!publishUrl) {
    return
  }

  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/hal+json, application/json',
      'Content-Type': 'application/json',
      ...(brokerToken
        ? {
            Authorization: `Bearer ${brokerToken}`,
          }
        : {}),
    },
    body: JSON.stringify({
      success: true,
      providerApplicationVersion: providerVersion,
      providerVersionBranch,
      providerVersionTags: providerVersionBranch ? [providerVersionBranch] : [],
      buildUrl: resolveBuildUrlFromEnv(),
      testResults: {
        tests: [],
        summary: {
          testCount: 0,
          failureCount: 0,
        },
        metadata: {
          pactVerificationResultsSpecification: {
            version: '1.0.0-beta.1',
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const responseBody = await response.text()
    throw new Error(
      `Failed to publish verification result. Status ${response.status}. Response: ${responseBody.slice(0, 500)}`,
    )
  }
}

describe('Pact provider verification', () => {
  let runningServer = null

  afterEach(async () => {
    if (!runningServer?.server) {
      return
    }

    await stopProviderServer(runningServer.server)
    runningServer = null
  })

  it('verifies frontend contract for catalog discovery', async () => {
    runningServer = await startProviderServer()
    const providerVersion = process.env.PACTICIPANT_VERSION || process.env.GITHUB_SHA || 'dev-local'
    const providerVersionBranch = process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || 'main'
    const providerStatesSetupUrl = `${runningServer.baseUrl}/_pact/provider-states`
    const logLevel = process.env.PACT_LOG_LEVEL || 'warn'
    let pactFilePath
    let publishVerificationUrl

    const verifierOptions = {
      provider: 'retail-backend',
      providerBaseUrl: runningServer.baseUrl,
      providerStatesSetupUrl,
      logLevel,
      providerVersionBranch,
    }

    if (process.env.PACT_BROKER_URL) {
      const brokerPact = await downloadPactFromBroker({
        brokerUrl: process.env.PACT_BROKER_URL,
        brokerToken: process.env.PACT_BROKER_TOKEN,
        providerName: 'retail-backend',
        consumerName: 'retail-frontend',
        consumerBranch: process.env.CONSUMER_BRANCH || process.env.GIT_BRANCH || 'main',
      })

      pactFilePath = brokerPact.pactFilePath
      publishVerificationUrl = brokerPact.publishVerificationUrl
      verifierOptions.pactUrls = [pactFilePath]
    } else {
      pactFilePath = path.resolve(
        process.cwd(),
        '../frontend/pacts/retail-frontend-retail-backend.json',
      )

      if (!fs.existsSync(pactFilePath)) {
        throw new Error(
          `PACT_BROKER_URL is missing and pact file does not exist: ${pactFilePath}`,
        )
      }

      verifierOptions.pactUrls = [pactFilePath]
    }

    const output = await new Verifier(verifierOptions).verifyProvider()

    expect(typeof output).toBe('string')
    expect(output.length).toBeGreaterThan(0)

    if (process.env.PACT_BROKER_URL) {
      await publishVerificationResultToBroker({
        publishUrl: publishVerificationUrl,
        brokerToken: process.env.PACT_BROKER_TOKEN,
        providerVersion,
        providerVersionBranch,
      })
    }
  })
})
