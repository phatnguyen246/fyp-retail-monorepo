import { ObjectId } from "mongodb";
import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { createInventoryBaseRepository } from "../../inventory/adapters/persistence/inventory-base.repository.js";
import { INVENTORY_COLLECTIONS } from "../../inventory/constants/index.js";
import { createInventoryRecord } from "../../inventory/models/index.js";
import { ensureInventoryIndexes } from "../../inventory/seeds/setup-inventory-indexes.js";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";
import { createProduct, createVariant } from "../models/index.js";
import {
    E2E_VNPAY_INVENTORY_ID,
    E2E_VNPAY_ORIGINAL_PRICE,
    E2E_VNPAY_PRODUCT_GROUP_CODE,
    E2E_VNPAY_PRODUCT_ID,
    E2E_VNPAY_SALE_PRICE,
    E2E_VNPAY_VARIANT_ID,
    E2E_VNPAY_VARIANT_SKU,
} from "./e2e-vnpay.constants.js";
import { seedCatalogBase } from "./seed-catalog-base.js";

const E2E_VNPAY_PRODUCT_OBJECT_ID = new ObjectId(E2E_VNPAY_PRODUCT_ID);
const E2E_VNPAY_VARIANT_OBJECT_ID = new ObjectId(E2E_VNPAY_VARIANT_ID);
const E2E_VNPAY_INVENTORY_OBJECT_ID = new ObjectId(E2E_VNPAY_INVENTORY_ID);

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

function buildListingVariantSnapshot(variant) {
    return {
        variantId: variant._id,
        sku: variant.sku,
        color: variant.variantAttributes.color,
        ram: variant.variantAttributes.ram,
        rom: variant.variantAttributes.rom,
        salePrice: variant.salePrice,
        originalPrice: variant.originalPrice,
        currency: variant.currency,
    };
}

export async function seedE2EVnpay({
    connectMongoFn = connectMongo,
    seedCatalogBaseFn = seedCatalogBase,
    ensureInventoryIndexesFn = ensureInventoryIndexes,
    createCatalogBaseRepositoryFn = createCatalogBaseRepository,
    createInventoryBaseRepositoryFn = createInventoryBaseRepository,
    createProductFn = createProduct,
    createVariantFn = createVariant,
    createInventoryRecordFn = createInventoryRecord,
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

        const [brand, category, flagshipTag] = await Promise.all([
            requireSeedReference({
                repository: catalogRepository,
                collectionName: CATALOG_COLLECTIONS.brands,
                value: "APPLE",
                label: "seeded brand",
            }),
            requireSeedReference({
                repository: catalogRepository,
                collectionName: CATALOG_COLLECTIONS.categories,
                value: "SMARTPHONE",
                label: "seeded category",
            }),
            requireSeedReference({
                repository: catalogRepository,
                collectionName: CATALOG_COLLECTIONS.tags,
                value: "flagship",
                label: "seeded tag",
            }),
        ]);

        const timestamp = new Date(now);
        const variant = createVariantFn({
            _id: E2E_VNPAY_VARIANT_OBJECT_ID,
            productId: E2E_VNPAY_PRODUCT_OBJECT_ID,
            sku: E2E_VNPAY_VARIANT_SKU,
            variantAttributes: {
                ram: "8GB",
                rom: "128GB",
                color: "Black",
            },
            originalPrice: E2E_VNPAY_ORIGINAL_PRICE,
            salePrice: E2E_VNPAY_SALE_PRICE,
            currency: "VND",
            status: "active",
            isInStock: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
        const product = createProductFn({
            _id: E2E_VNPAY_PRODUCT_OBJECT_ID,
            productGroupCode: E2E_VNPAY_PRODUCT_GROUP_CODE,
            title: "E2E VNPay Phone",
            brandId: brand._id,
            categoryId: category._id,
            productType: "smartphone",
            shortDescription: "Minimal product for checkout and VNPay E2E flows",
            longDescription:
                "Seeded product used to validate guest checkout and VNPay payment callbacks.",
            tagIds: [flagshipTag._id],
            badges: ["new"],
            specs: {
                chipset: "E2E Chipset",
                battery: "5000mAh",
            },
            status: "active",
            contactWhenOutOfStock: false,
            defaultSelectedVariantId: variant._id,
            listingVariantSnapshot: buildListingVariantSnapshot(variant),
            minSalePrice: variant.salePrice,
            minOriginalPrice: variant.originalPrice,
            hasActiveVariants: true,
            hasInStockVariants: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
        const inventoryRecord = createInventoryRecordFn({
            _id: E2E_VNPAY_INVENTORY_OBJECT_ID,
            variantId: variant._id,
            stockQuantity: 10,
            lowStockThreshold: 2,
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        const {
            _id: productId,
            createdAt: productCreatedAt,
            ...productSet
        } = product;
        await catalogRepository.upsertOneByField({
            collectionName: CATALOG_COLLECTIONS.products,
            fieldName: "productGroupCode",
            value: product.productGroupCode,
            set: productSet,
            setOnInsert: {
                _id: productId,
                createdAt: productCreatedAt,
            },
        });

        const {
            _id: variantId,
            createdAt: variantCreatedAt,
            ...variantSet
        } = variant;
        await catalogRepository.upsertOneByField({
            collectionName: CATALOG_COLLECTIONS.variants,
            fieldName: "sku",
            value: variant.sku,
            set: variantSet,
            setOnInsert: {
                _id: variantId,
                createdAt: variantCreatedAt,
            },
        });

        const {
            _id: inventoryId,
            createdAt: inventoryCreatedAt,
            ...inventorySet
        } = inventoryRecord;
        await inventoryRepository.updateOneByFilterWithOperators({
            collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
            filter: {
                variantId: inventoryRecord.variantId,
            },
            update: {
                $set: inventorySet,
                $setOnInsert: {
                    _id: inventoryId,
                    createdAt: inventoryCreatedAt,
                },
            },
            options: {
                upsert: true,
            },
        });

        logger.log(
            `E2E VNPay data ensured successfully for ${product.productGroupCode} / ${variant.sku}`
        );
    } finally {
        await client.close();
    }
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await seedE2EVnpay();
    }
}
