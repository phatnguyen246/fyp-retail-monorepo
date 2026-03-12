import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    createCatalogBaseRepository,
    createCatalogPersistence,
    createCatalogProductRepository,
    createCatalogReferenceRepository,
    createCatalogVariantRepository,
} from "../adapters/persistence/index.js";
import { createProductFixture, createVariantFixture } from "./fixtures/index.js";

function createCollectionMock() {
    return {
        createIndex: vi.fn().mockResolvedValue("ok"),
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
        }),
        insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        updateMany: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
}

function createDbMock(collectionMock) {
    return {
        collection: vi.fn().mockReturnValue(collectionMock),
    };
}

describe("catalog persistence", () => {
    it("creates generic unique indexes and lookup helpers from the base repository", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createCatalogBaseRepository({ db });

        await repository.ensureUniqueIndex({
            collectionName: "products",
            key: { productGroupCode: 1 },
            indexName: "products_product_group_code_unique",
        });
        await repository.findManyByFieldValues({
            collectionName: "tags",
            fieldName: "code",
            values: ["camera-phone", "battery-phone"],
        });

        expect(db.collection).toHaveBeenCalledWith("products");
        expect(collectionMock.createIndex).toHaveBeenCalledWith(
            { productGroupCode: 1 },
            {
                unique: true,
                name: "products_product_group_code_unique",
            }
        );
        expect(collectionMock.find).toHaveBeenCalledWith(
            { code: { $in: ["camera-phone", "battery-phone"] } },
            undefined
        );
    });

    it("upserts products by business key and normalizes ObjectId update filters", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createCatalogProductRepository({ db });
        const product = createProductFixture();

        await repository.upsertProductByProductGroupCode({
            productGroupCode: product.productGroupCode,
            document: product,
        });
        await repository.updateProductDerivedFields({
            productId: product._id.toHexString(),
            derivedFields: {
                hasActiveVariants: true,
            },
        });

        expect(collectionMock.updateOne).toHaveBeenNthCalledWith(
            1,
            { productGroupCode: "APPLE_IPHONE_16" },
            expect.objectContaining({
                $set: expect.objectContaining({
                    productGroupCode: "APPLE_IPHONE_16",
                    title: "iPhone 16",
                }),
                $setOnInsert: expect.objectContaining({
                    _id: expect.any(ObjectId),
                    createdAt: product.createdAt,
                }),
            }),
            { upsert: true }
        );
        expect(collectionMock.updateOne).toHaveBeenNthCalledWith(
            2,
            { _id: new ObjectId(product._id.toHexString()) },
            {
                $set: expect.objectContaining({
                    hasActiveVariants: true,
                }),
            },
            undefined
        );
    });

    it("looks up reference entities by code and variants by sku", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const referenceRepository = createCatalogReferenceRepository({ db });
        const variantRepository = createCatalogVariantRepository({ db });
        const variant = createVariantFixture();

        await referenceRepository.findBrandByCode({ code: "APPLE" });
        await referenceRepository.findTagsByCodes({
            codes: ["camera-phone", "battery-phone"],
        });
        await variantRepository.findVariantBySku({ sku: variant.sku });
        await variantRepository.findVariantById({
            variantId: variant._id.toHexString(),
        });
        await variantRepository.updateVariantCoreFields({
            variantId: variant._id.toHexString(),
            coreFields: {
                salePrice: 21990000,
            },
        });

        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            1,
            { code: "APPLE" },
            undefined
        );
        expect(collectionMock.find).toHaveBeenNthCalledWith(
            1,
            { code: { $in: ["camera-phone", "battery-phone"] } },
            undefined
        );
        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            2,
            { sku: "IP16-BLK-128" },
            undefined
        );
        expect(collectionMock.findOne).toHaveBeenNthCalledWith(
            3,
            { _id: new ObjectId(variant._id.toHexString()) },
            undefined
        );
        expect(collectionMock.updateOne).toHaveBeenCalledWith(
            { _id: new ObjectId(variant._id.toHexString()) },
            {
                $set: expect.objectContaining({
                    salePrice: 21990000,
                }),
            },
            undefined
        );
    });

    it("looks up products by _id and variants by productId using ObjectId filters", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const productRepository = createCatalogProductRepository({ db });
        const variantRepository = createCatalogVariantRepository({ db });
        const product = createProductFixture();

        await productRepository.findProductById({
            productId: product._id.toHexString(),
        });
        await variantRepository.findVariantsByProductId({
            productId: product._id.toHexString(),
        });

        expect(collectionMock.findOne).toHaveBeenCalledWith(
            { _id: new ObjectId(product._id.toHexString()) },
            undefined
        );
        expect(collectionMock.find).toHaveBeenCalledWith(
            { productId: new ObjectId(product._id.toHexString()) },
            undefined
        );
    });

    it("inserts new documents and soft deletes product and variant records", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const productRepository = createCatalogProductRepository({ db });
        const variantRepository = createCatalogVariantRepository({ db });
        const product = createProductFixture();
        const variant = createVariantFixture();

        await productRepository.createProduct({
            document: product,
        });
        await variantRepository.createVariant({
            document: variant,
        });
        await productRepository.softDeleteProductById({
            productId: product._id.toHexString(),
            deletedAt: product.updatedAt,
            updatedAt: product.updatedAt,
            updatedBy: "admin-1",
        });
        await variantRepository.softDeleteVariantById({
            variantId: variant._id.toHexString(),
            deletedAt: variant.updatedAt,
            updatedAt: variant.updatedAt,
        });
        await variantRepository.softDeleteVariantsByProductId({
            productId: product._id.toHexString(),
            deletedAt: product.updatedAt,
            updatedAt: product.updatedAt,
        });

        expect(collectionMock.insertOne).toHaveBeenNthCalledWith(
            1,
            product,
            undefined
        );
        expect(collectionMock.insertOne).toHaveBeenNthCalledWith(
            2,
            variant,
            undefined
        );
        expect(collectionMock.updateOne).toHaveBeenCalledWith(
            { _id: new ObjectId(product._id.toHexString()) },
            {
                $set: expect.objectContaining({
                    isDeleted: true,
                    updatedBy: "admin-1",
                }),
            },
            undefined
        );
        expect(collectionMock.updateMany).toHaveBeenCalledWith(
            { productId: new ObjectId(product._id.toHexString()) },
            {
                $set: expect.objectContaining({
                    isDeleted: true,
                }),
            },
            undefined
        );
    });

    it("wires specialized repositories through createCatalogPersistence", () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const persistence = createCatalogPersistence({ db });

        expect(persistence.baseRepository).toBeDefined();
        expect(persistence.productRepository).toBeDefined();
        expect(persistence.referenceRepository).toBeDefined();
        expect(persistence.variantRepository).toBeDefined();
    });
});
