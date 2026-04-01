import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ObjectId } from "mongodb";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { createInventoryBaseRepository } from "../../inventory/adapters/persistence/inventory-base.repository.js";
import { INVENTORY_COLLECTIONS } from "../../inventory/constants/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { ensureInventoryIndexes } from "../../inventory/seeds/setup-inventory-indexes.js";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";
import { createProduct, createVariant } from "../models/index.js";
import { computeProductDerivedFields } from "../utils/compute-product-derived-fields.js";
import { seedCatalogBase } from "./seed-catalog-base.js";
import { STOREFRONT_SMARTPHONE_SEED_DATA } from "./storefront-smartphones.seed-data.js";

const DEFAULT_CATEGORY_CODE = "SMARTPHONE";
const DEFAULT_PRODUCT_TYPE = "smartphone";
const DEFAULT_PRODUCT_STATUS = "active";
const DEFAULT_VARIANT_STATUS = "active";
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const SEED_ACTOR = "seed:catalog:storefront";
const SEED_VARIANT_PRIMITIVE_COLOR_MAP = Object.freeze({
    Icyblue: "Blue",
    Navy: "Blue",
    "Silver Shadow": "Gray",
    Mint: "Green",
    "Titanium Silverblue": "Blue",
    "Titanium Black": "Black",
    "Titanium Gray": "Gray",
    "Awesome Graphite": "Black",
    "Awesome Lightgray": "Gray",
    "Awesome Olive": "Green",
    Obsidian: "Black",
    Porcelain: "White",
    Wintergreen: "Green",
    Hazel: "Brown",
    "Black Eclipse": "Black",
    "Arctic Dawn": "White",
    "Midnight Ocean": "Blue",
    "Astral Trail": "Gray",
    "Nebula Noir": "Black",
    "Mercurial Silver": "Gray",
    "Oasis Green": "Green",
    "Obsidian Midnight": "Black",
    "Space Black": "Black",
    "Star Grey": "Gray",
    "Shell Pink": "Pink",
    "Pearl White": "White",
    "Graphite Grey": "Gray",
    "Luminous Blue": "Blue",
    "Plume Purple": "Purple",
    Titanium: "Gray",
    "Ancora Red": "Red",
    "Satin Black": "Black",
    "Mist Purple": "Purple",
    "Midnight Black": "Black",
    "Coral Green": "Green",
    "Lavender Purple": "Purple",
    "Frost Blue": "Blue",
});

async function requireSeedReference({
    repository,
    collectionName,
    fieldName = "code",
    value,
    label,
} = {}) {
    const document = await repository.findOneByField({
        collectionName,
        fieldName,
        value,
    });

    if (!document) {
        throw new Error(
            `Missing ${label ?? `${collectionName}.${fieldName}`} for value "${value}"`
        );
    }

    return document;
}

export async function seedStorefrontCatalog({
    connectMongoFn = connectMongo,
    seedCatalogBaseFn = seedCatalogBase,
    ensureInventoryIndexesFn = ensureInventoryIndexes,
    createCatalogBaseRepositoryFn = createCatalogBaseRepository,
    createInventoryBaseRepositoryFn = createInventoryBaseRepository,
    createProductFn = createProduct,
    createVariantFn = createVariant,
    createInventoryRecordFn = createInventoryRecord,
    seedData = STOREFRONT_SMARTPHONE_SEED_DATA,
    logger = console,
    now = new Date(),
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await seedCatalogBaseFn({
            connectMongoFn: async () => ({
                client: {
                    close: async () => undefined,
                },
                db,
            }),
            logger,
            now,
        });
        await ensureInventoryIndexesFn({ db });

        const catalogRepository = createCatalogBaseRepositoryFn({ db });
        const inventoryRepository = createInventoryBaseRepositoryFn({ db });
        const category = await requireSeedReference({
            repository: catalogRepository,
            collectionName: CATALOG_COLLECTIONS.categories,
            value: DEFAULT_CATEGORY_CODE,
            label: "seeded category",
        });

        const referenceCache = await buildReferenceCache({
            catalogRepository,
            category,
            seedData,
        });
        let productCount = 0;
        let variantCount = 0;

        for (const productSeed of seedData) {
            const preparedProduct = buildPreparedProduct({
                category,
                createProductFn,
                createVariantFn,
                createInventoryRecordFn,
                productSeed,
                referenceCache,
            });

            await upsertProductDocument({
                repository: catalogRepository,
                product: preparedProduct.product,
            });

            for (const variant of preparedProduct.variants) {
                await upsertVariantDocument({
                    repository: catalogRepository,
                    variant,
                });
            }

            for (const inventoryRecord of preparedProduct.inventoryRecords) {
                await upsertInventoryRecord({
                    repository: inventoryRepository,
                    inventoryRecord,
                });
            }

            productCount += 1;
            variantCount += preparedProduct.variants.length;
        }

        logger.log(
            `Storefront catalog seed ensured successfully: ${productCount} products / ${variantCount} variants`
        );
    } finally {
        await client.close();
    }
}

async function buildReferenceCache({ catalogRepository, category, seedData } = {}) {
    const brandCodes = [...new Set(seedData.map((item) => item.brandCode))];
    const tagCodes = [
        ...new Set(seedData.flatMap((item) => item.tagCodes ?? [])),
    ];
    const brandMap = new Map();
    const tagMap = new Map();

    for (const brandCode of brandCodes) {
        brandMap.set(
            brandCode,
            await requireSeedReference({
                repository: catalogRepository,
                collectionName: CATALOG_COLLECTIONS.brands,
                value: brandCode,
                label: "seeded brand",
            })
        );
    }

    for (const tagCode of tagCodes) {
        tagMap.set(
            tagCode,
            await requireSeedReference({
                repository: catalogRepository,
                collectionName: CATALOG_COLLECTIONS.tags,
                value: tagCode,
                label: "seeded tag",
            })
        );
    }

    return {
        category,
        brandMap,
        tagMap,
    };
}

function buildPreparedProduct({
    category,
    createInventoryRecordFn,
    createProductFn,
    createVariantFn,
    productSeed,
    referenceCache,
} = {}) {
    const brand = referenceCache.brandMap.get(productSeed.brandCode);
    const tagIds = (productSeed.tagCodes ?? []).map(
        (tagCode) => referenceCache.tagMap.get(tagCode)._id
    );
    const baseDate = new Date(productSeed.releaseDate);
    const productId = createDeterministicObjectId(
        `product:${productSeed.productGroupCode}`
    );
    const variants = productSeed.variants.map((variantSeed, index) =>
        createVariantFn({
            _id: createDeterministicObjectId(
                `variant:${productSeed.productGroupCode}:${index}:${variantSeed.ram}:${variantSeed.rom}:${resolveSeedVariantIdentityColor(variantSeed)}`
            ),
            productId,
            sku: buildSku(productSeed.productGroupCode, variantSeed),
            variantAttributes: {
                ram: variantSeed.ram,
                rom: variantSeed.rom,
                ...normalizeSeedVariantColor(variantSeed.color),
            },
            ramSort: toRamSort(variantSeed.ram),
            romSort: toRomSort(variantSeed.rom),
            colorPriority: index,
            variantSortOrder: index,
            isPrimaryColor: variantSeed.isPrimaryColor === true,
            originalPrice: variantSeed.originalPrice,
            salePrice: variantSeed.salePrice,
            currency: "VND",
            status: DEFAULT_VARIANT_STATUS,
            isInStock: Number(variantSeed.stockQuantity) > 0,
            createdAt: shiftDate(baseDate, index + 1),
            updatedAt: shiftDate(baseDate, index + 1),
        })
    );
    const inventoryRecords = variants.map((variant, index) =>
        createInventoryRecordFn({
            _id: createDeterministicObjectId(`inventory:${variant._id.toHexString()}`),
            variantId: variant._id,
            stockQuantity: productSeed.variants[index].stockQuantity,
            lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
            createdAt: shiftDate(baseDate, 30 + index),
            updatedAt: shiftDate(baseDate, 30 + index),
        })
    );
    const derivedFields = computeProductDerivedFields({
        product: {
            title: productSeed.title,
        },
        variants,
    });
    const product = createProductFn({
        _id: productId,
        productGroupCode: productSeed.productGroupCode,
        title: productSeed.title,
        brandId: brand._id,
        categoryId: category._id,
        productType: DEFAULT_PRODUCT_TYPE,
        shortDescription: productSeed.shortDescription,
        longDescription: productSeed.longDescription,
        tagIds,
        badges: productSeed.badges ?? [],
        specs: productSeed.specs,
        status: DEFAULT_PRODUCT_STATUS,
        contactWhenOutOfStock: productSeed.contactWhenOutOfStock === true,
        ...derivedFields,
        createdAt: baseDate,
        updatedAt: baseDate,
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
    });

    return {
        product,
        variants,
        inventoryRecords,
    };
}

async function upsertProductDocument({ repository, product } = {}) {
    const { _id, createdAt, ...productSet } = product;

    await repository.upsertOneByField({
        collectionName: CATALOG_COLLECTIONS.products,
        fieldName: "productGroupCode",
        value: product.productGroupCode,
        set: productSet,
        setOnInsert: {
            _id,
            createdAt,
        },
    });
}

async function upsertVariantDocument({ repository, variant } = {}) {
    const { _id, createdAt, ...variantSet } = variant;

    await repository.upsertOneByField({
        collectionName: CATALOG_COLLECTIONS.variants,
        fieldName: "sku",
        value: variant.sku,
        set: variantSet,
        setOnInsert: {
            _id,
            createdAt,
        },
    });
}

async function upsertInventoryRecord({ repository, inventoryRecord } = {}) {
    const { _id, createdAt, ...inventorySet } = inventoryRecord;

    await repository.updateOneByFilterWithOperators({
        collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
        filter: {
            variantId: inventoryRecord.variantId,
        },
        update: {
            $set: inventorySet,
            $setOnInsert: {
                _id,
                createdAt,
            },
        },
        options: {
            upsert: true,
        },
    });
}

function createDeterministicObjectId(key) {
    return new ObjectId(createHash("sha256").update(key).digest("hex").slice(0, 24));
}

function buildSku(productGroupCode, variantSeed) {
    return [
        productGroupCode,
        toSkuToken(variantSeed.ram),
        toSkuToken(variantSeed.rom),
        toSkuToken(resolveSeedVariantIdentityColor(variantSeed)),
    ].join("-");
}

function resolveSeedVariantIdentityColor(variantSeed = {}) {
    return variantSeed.colorFullName ?? variantSeed.color;
}

function normalizeSeedVariantColor(colorName) {
    const normalizedColor = SEED_VARIANT_PRIMITIVE_COLOR_MAP[colorName] ?? colorName;

    return {
        color: normalizedColor,
        ...(normalizedColor !== colorName ? { colorFullName: colorName } : {}),
    };
}

function toSkuToken(value) {
    return String(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function toRamSort(value) {
    const match = String(value).match(/^(\d+)/);
    return match ? Number(match[1]) : 0;
}

function toRomSort(value) {
    const match = String(value).match(/^(\d+)(TB|GB)$/i);

    if (!match) {
        return 0;
    }

    const amount = Number(match[1]);

    return match[2].toUpperCase() === "TB" ? amount * 1024 : amount;
}

function shiftDate(baseDate, daysOffset) {
    return new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await seedStorefrontCatalog();
    }
}
