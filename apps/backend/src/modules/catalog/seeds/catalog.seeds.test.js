import { describe, expect, it, vi } from "vitest";
import { seedBrands } from "./brands.seed.js";
import { seedCategories } from "./categories.seed.js";
import { seedTags } from "./tags.seed.js";
import { seedBadges } from "./badges.seed.js";
import {
    ensureCatalogIndexes,
    runCatalogIndexSetup,
} from "./setup-catalog-indexes.js";
import { seedCatalogBase } from "./seed-catalog-base.js";

function expectNoIndexForKey(indexCalls, forbiddenKey) {
    expect(indexCalls).not.toContainEqual(
        expect.objectContaining({
            key: forbiddenKey,
        })
    );
}

function makeRepositoryMock() {
    return {
        ensureIndex: vi.fn().mockResolvedValue(undefined),
        ensureUniqueIndex: vi.fn().mockResolvedValue(undefined),
        upsertSeedDocument: vi.fn().mockResolvedValue(undefined),
    };
}

function makeConnectMongoResult() {
    return {
        client: { close: vi.fn().mockResolvedValue(undefined) },
        db: { collection: vi.fn() },
    };
}

describe("catalog seeds", () => {
    it("seeds brands with idempotent upsert commands", async () => {
        const repository = makeRepositoryMock();
        const now = new Date("2026-03-12T00:00:00.000Z");

        await seedBrands({ repository, now });

        expect(repository.upsertSeedDocument).toHaveBeenCalledTimes(5);
        expect(repository.upsertSeedDocument).toHaveBeenNthCalledWith(1, {
            collectionName: "brands",
            code: "APPLE",
            document: {
                code: "APPLE",
                name: "Apple",
                status: "active",
                createdAt: now,
                updatedAt: now,
            },
        });
    });

    it("seeds the smartphone category", async () => {
        const repository = makeRepositoryMock();
        const now = new Date("2026-03-12T00:00:00.000Z");

        await seedCategories({ repository, now });

        expect(repository.upsertSeedDocument).toHaveBeenCalledTimes(1);
        expect(repository.upsertSeedDocument).toHaveBeenCalledWith({
            collectionName: "categories",
            code: "SMARTPHONE",
            document: {
                code: "SMARTPHONE",
                name: "Smartphone",
                status: "active",
                createdAt: now,
                updatedAt: now,
            },
        });
    });

    it("seeds catalog tags", async () => {
        const repository = makeRepositoryMock();
        const now = new Date("2026-03-12T00:00:00.000Z");

        await seedTags({ repository, now });

        expect(repository.upsertSeedDocument).toHaveBeenCalledTimes(5);
        expect(repository.upsertSeedDocument).toHaveBeenNthCalledWith(2, {
            collectionName: "tags",
            code: "camera-phone",
            document: {
                code: "camera-phone",
                name: "Camera Phone",
                status: "active",
                createdAt: now,
                updatedAt: now,
            },
        });
    });

    it("seeds catalog badges", async () => {
        const repository = makeRepositoryMock();
        const now = new Date("2026-03-12T00:00:00.000Z");

        await seedBadges({ repository, now });

        expect(repository.upsertSeedDocument).toHaveBeenCalledTimes(4);
        expect(repository.upsertSeedDocument).toHaveBeenNthCalledWith(3, {
            collectionName: "badges",
            code: "best_seller",
            document: {
                code: "best_seller",
                label: "Best Seller",
                createdAt: now,
                updatedAt: now,
            },
        });
    });

    it("ensures catalog indexes for base collections and media metadata", async () => {
        const repository = makeRepositoryMock();

        await ensureCatalogIndexes({ repository });

        expect(repository.ensureUniqueIndex).toHaveBeenCalledTimes(7);
        expect(repository.ensureIndex).toHaveBeenCalledTimes(12);
        expect(repository.ensureUniqueIndex).toHaveBeenNthCalledWith(1, {
            collectionName: "brands",
            key: { code: 1 },
            indexName: "brands_code_unique",
        });
        expect(repository.ensureUniqueIndex).toHaveBeenNthCalledWith(5, {
            collectionName: "products",
            key: { productGroupCode: 1 },
            indexName: "products_product_group_code_unique",
        });
        expect(repository.ensureUniqueIndex).toHaveBeenNthCalledWith(6, {
            collectionName: "variants",
            key: { sku: 1 },
            indexName: "variants_sku_unique",
        });
        expect(repository.ensureUniqueIndex).toHaveBeenNthCalledWith(7, {
            collectionName: "productMediaMetadata",
            key: { storagePath: 1 },
            indexName: "product_media_storage_path_unique",
        });
        expect(repository.ensureUniqueIndex).toHaveBeenNthCalledWith(4, {
            collectionName: "badges",
            key: { code: 1 },
            indexName: "badges_code_unique",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: { isDeleted: 1, status: 1, categoryId: 1, brandId: 1 },
            indexName: "products_deleted_status_category_brand",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: { createdAt: -1 },
            indexName: "products_created_at_desc",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: {
                isDeleted: 1,
                status: 1,
                hasActiveVariants: 1,
                createdAt: -1,
                _id: -1,
            },
            indexName: "products_storefront_visibility_created_at",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: { slug: 1 },
            indexName: "products_slug",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: { searchTitle: 1 },
            indexName: "products_search_title",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: { tagIds: 1 },
            indexName: "products_tag_ids",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "products",
            key: {
                isDeleted: 1,
                status: 1,
                hasActiveVariants: 1,
                minSalePrice: 1,
                _id: 1,
            },
            indexName: "products_storefront_visibility_min_sale_price",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "variants",
            key: { productId: 1, status: 1 },
            indexName: "variants_product_status",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "variants",
            key: {
                "variantAttributes.ram": 1,
                "variantAttributes.rom": 1,
            },
            indexName: "variants_ram_rom",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "variants",
            key: { "variantAttributes.color": 1 },
            indexName: "variants_color",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "variants",
            key: { salePrice: 1 },
            indexName: "variants_sale_price",
        });
        expect(repository.ensureIndex).toHaveBeenCalledWith({
            collectionName: "productMediaMetadata",
            key: { variantId: 1, sortOrder: 1, createdAt: 1 },
            indexName: "product_media_variant_sort_created_at",
        });

        const ensureIndexCalls = repository.ensureIndex.mock.calls.map(
            ([definition]) => definition
        );

        expectNoIndexForKey(ensureIndexCalls, { defaultSelectedVariantId: 1 });
        expectNoIndexForKey(ensureIndexCalls, { tags: 1 });
        expectNoIndexForKey(ensureIndexCalls, { stock: 1 });
        expectNoIndexForKey(ensureIndexCalls, { isInStock: 1 });
    });

    it("runs index setup and closes the connection", async () => {
        const connectMongoResult = makeConnectMongoResult();
        const connectMongoFn = vi.fn().mockResolvedValue(connectMongoResult);
        const ensureCatalogIndexesFn = vi.fn().mockResolvedValue(undefined);
        const logger = { log: vi.fn() };

        await runCatalogIndexSetup({
            connectMongoFn,
            ensureCatalogIndexesFn,
            logger,
        });

        expect(connectMongoFn).toHaveBeenCalledTimes(1);
        expect(ensureCatalogIndexesFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
        });
        expect(connectMongoResult.client.close).toHaveBeenCalledTimes(1);
        expect(logger.log).toHaveBeenCalledWith(
            "Catalog indexes ensured successfully"
        );
    });

    it("runs index setup before seeding and closes the connection", async () => {
        const connectMongoResult = makeConnectMongoResult();
        const connectMongoFn = vi.fn().mockResolvedValue(connectMongoResult);
        const ensureCatalogIndexesFn = vi.fn().mockResolvedValue(undefined);
        const seedBrandsFn = vi.fn().mockResolvedValue(undefined);
        const seedCategoriesFn = vi.fn().mockResolvedValue(undefined);
        const seedTagsFn = vi.fn().mockResolvedValue(undefined);
        const seedBadgesFn = vi.fn().mockResolvedValue(undefined);
        const logger = { log: vi.fn() };
        const now = new Date("2026-03-12T00:00:00.000Z");

        await seedCatalogBase({
            connectMongoFn,
            ensureCatalogIndexesFn,
            seedBrandsFn,
            seedCategoriesFn,
            seedTagsFn,
            seedBadgesFn,
            logger,
            now,
        });

        expect(ensureCatalogIndexesFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
        });
        expect(seedBrandsFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
            now,
        });
        expect(seedCategoriesFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
            now,
        });
        expect(seedTagsFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
            now,
        });
        expect(seedBadgesFn).toHaveBeenCalledWith({
            db: connectMongoResult.db,
            now,
        });
        expect(connectMongoResult.client.close).toHaveBeenCalledTimes(1);
        expect(logger.log).toHaveBeenCalledWith(
            "Catalog base data seeded successfully"
        );
    });

    it("closes the connection when seeding fails", async () => {
        const connectMongoResult = makeConnectMongoResult();
        const connectMongoFn = vi.fn().mockResolvedValue(connectMongoResult);
        const ensureCatalogIndexesFn = vi.fn().mockResolvedValue(undefined);
        const seedBrandsFn = vi.fn().mockRejectedValue(new Error("boom"));

        await expect(
            seedCatalogBase({
                connectMongoFn,
                ensureCatalogIndexesFn,
                seedBrandsFn,
                seedCategoriesFn: vi.fn(),
                seedTagsFn: vi.fn(),
                seedBadgesFn: vi.fn(),
            })
        ).rejects.toThrow("boom");

        expect(connectMongoResult.client.close).toHaveBeenCalledTimes(1);
    });
});
