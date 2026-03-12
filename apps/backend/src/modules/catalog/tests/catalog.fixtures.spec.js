import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
    createBrandFixture,
    createCatalogProductGraphFixture,
    createCategoryFixture,
    createProductFixture,
    createProductImportRowFixture,
    createProductReadModelFixture,
    createTagFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("catalog fixtures", () => {
    it("creates reusable persistence fixtures with ObjectId references", () => {
        const brand = createBrandFixture();
        const category = createCategoryFixture();
        const tag = createTagFixture();

        expect(brand._id).toBeInstanceOf(ObjectId);
        expect(category._id).toBeInstanceOf(ObjectId);
        expect(tag._id).toBeInstanceOf(ObjectId);
        expect(brand).toMatchObject({
            code: "APPLE",
            name: "Apple",
            status: "active",
        });
        expect(category).toMatchObject({
            code: "SMARTPHONE",
            name: "Smartphone",
            status: "active",
        });
        expect(tag).toMatchObject({
            code: "camera-phone",
            name: "Camera Phone",
            status: "active",
        });
    });

    it("supports shallow overrides for persisted product and variant fixtures", () => {
        const product = createProductFixture({
            title: "iPhone 16 Pro",
            specs: {
                chipset: "A18 Pro",
                battery: "3582mAh",
                screen: {
                    technology: "OLED",
                },
            },
        });
        const variant = createVariantFixture({
            sku: "IP16P-WHT-256",
            variantAttributes: {
                ram: "8GB",
                rom: "256GB",
                color: "White",
            },
            status: "inactive",
        });

        expect(product.title).toBe("iPhone 16 Pro");
        expect(product.specs).toMatchObject({
            chipset: "A18 Pro",
            battery: "3582mAh",
            screen: {
                technology: "OLED",
            },
        });
        expect(variant).toMatchObject({
            sku: "IP16P-WHT-256",
            status: "inactive",
            variantAttributes: {
                ram: "8GB",
                rom: "256GB",
                color: "White",
            },
        });
    });

    it("keeps derived product fields in the persisted shape with stable defaults", () => {
        const product = createProductFixture();
        const readModelProduct = createProductReadModelFixture();

        expect(product).toMatchObject({
            defaultSelectedVariantId: null,
            listingVariantSnapshot: null,
            hasInStockVariants: false,
            hasActiveVariants: false,
            minSalePrice: null,
            minOriginalPrice: null,
        });
        expect(readModelProduct).toMatchObject({
            hasInStockVariants: true,
            hasActiveVariants: true,
            minSalePrice: 22990000,
            minOriginalPrice: 24990000,
        });
        expect(readModelProduct.defaultSelectedVariantId).toBeInstanceOf(ObjectId);
        expect(readModelProduct.listingVariantSnapshot.variantId).toBeInstanceOf(
            ObjectId
        );
    });

    it("creates a valid catalog product graph with linked ObjectId references", () => {
        const fixture = createCatalogProductGraphFixture({
            variantOverridesList: [
                {},
                {
                    _id: new ObjectId("65f000000000000000000008"),
                    sku: "IP16-PNK-256",
                    variantAttributes: {
                        ram: "8GB",
                        rom: "256GB",
                        color: "Pink",
                    },
                },
            ],
        });

        expect(fixture.product.brandId.toHexString()).toBe(
            fixture.brand._id.toHexString()
        );
        expect(fixture.product.categoryId.toHexString()).toBe(
            fixture.category._id.toHexString()
        );
        expect(fixture.product.tagIds.map((tagId) => tagId.toHexString())).toEqual(
            fixture.tags.map((tag) => tag._id.toHexString())
        );
        expect(fixture.variants).toHaveLength(2);
        expect(
            fixture.variants.every(
                (variant) =>
                    variant.productId.toHexString() === fixture.product._id.toHexString()
            )
        ).toBe(true);
    });

    it("separates persistence fixtures from import-row fixtures and keeps them independent", () => {
        const firstProduct = createProductFixture();
        const secondProduct = createProductFixture();
        const importRow = createProductImportRowFixture();

        firstProduct.tagIds.push(new ObjectId("65f000000000000000000099"));

        expect(secondProduct.tagIds).toHaveLength(2);
        expect(importRow).toMatchObject({
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            tagCodes: "camera-phone,battery-phone",
            sku: "IP16-BLK-128",
        });
        expect(importRow).not.toHaveProperty("brandId");
        expect(importRow).not.toHaveProperty("tagIds");
    });
});
