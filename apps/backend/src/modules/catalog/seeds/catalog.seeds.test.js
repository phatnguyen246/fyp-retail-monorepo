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
        expect(repository.ensureIndex).toHaveBeenCalledTimes(1);
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
            collectionName: "productMediaMetadata",
            key: { variantId: 1, sortOrder: 1, createdAt: 1 },
            indexName: "product_media_variant_sort_created_at",
        });
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
