import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    hydrateCatalogProductsWithLiveInventory,
    readLiveInventorySnapshot,
} from "../services/catalog-live-inventory.helpers.js";
import {
    createProductReadModelFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("catalog live inventory helpers", () => {
    it("hydrates live inventory into variants and derives product availability", async () => {
        const product = createProductReadModelFixture();
        const secondVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000081"),
            productId: product._id,
            sku: "IP16-BLU-256",
            variantAttributes: {
                ram: "8GB",
                rom: "256GB",
                color: "Blue",
            },
            isInStock: true,
        });
        const inventoryAdapter = {
            readInventoryByVariantIds: vi.fn().mockResolvedValue([
                {
                    variantId: product.defaultSelectedVariantId.toHexString(),
                    stockQuantity: 0,
                    isInStock: false,
                },
                {
                    variantId: secondVariant._id.toHexString(),
                    stockQuantity: 3,
                    isInStock: true,
                },
            ]),
        };

        const result = await hydrateCatalogProductsWithLiveInventory({
            inventoryAdapter,
            products: [product],
            variants: [
                createVariantFixture({
                    _id: product.defaultSelectedVariantId,
                    productId: product._id,
                    isInStock: true,
                }),
                secondVariant,
            ],
        });

        const liveVariants = result.variantsByProductId.get(product._id.toHexString());

        expect(liveVariants.map((variant) => variant.isInStock)).toEqual([false, true]);
        expect(
            result.productAvailabilityById.get(product._id.toHexString())
        ).toEqual({
            hasInStockVariants: true,
        });
    });

    it("treats missing inventory records as out-of-stock", async () => {
        const product = createProductReadModelFixture();
        const variant = createVariantFixture({
            _id: product.defaultSelectedVariantId,
            productId: product._id,
            isInStock: true,
        });
        const inventoryAdapter = {
            readInventoryByVariantIds: vi.fn().mockResolvedValue([]),
        };

        const result = await hydrateCatalogProductsWithLiveInventory({
            inventoryAdapter,
            products: [product],
            variants: [variant],
        });

        expect(
            result.variantsByProductId.get(product._id.toHexString())[0].isInStock
        ).toBe(false);
        expect(
            result.productAvailabilityById.get(product._id.toHexString())
        ).toEqual({
            hasInStockVariants: false,
        });
    });

    it("uses safe fallback when inventory read throws", async () => {
        const logger = {
            warn: vi.fn(),
        };
        const inventoryAdapter = {
            readInventoryByVariantIds: vi.fn().mockRejectedValue(new Error("inventory down")),
        };

        const snapshot = await readLiveInventorySnapshot({
            inventoryAdapter,
            variantIds: [
                "65f000000000000000000091",
                "65f000000000000000000092",
            ],
            logger,
        });

        expect(snapshot.usedSafeFallback).toBe(true);
        expect(snapshot.inventoryReads).toEqual([
            {
                variantId: "65f000000000000000000091",
                stockQuantity: 0,
                isInStock: false,
            },
            {
                variantId: "65f000000000000000000092",
                stockQuantity: 0,
                isInStock: false,
            },
        ]);
        expect(logger.warn).toHaveBeenCalledWith(
            "Catalog inventory read failed; using safe fallback",
            expect.objectContaining({
                variantIds: [
                    "65f000000000000000000091",
                    "65f000000000000000000092",
                ],
            })
        );
    });
});
