import { describe, expect, it } from "vitest";
import {
    createBrandFixture,
    createCatalogProductGraphFixture,
    createCategoryFixture,
    createProductFixture,
    createProductReadModelFixture,
    createTagFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("catalog fixtures", () => {
    it("creates reusable reference fixtures", () => {
        const brand = createBrandFixture();
        const category = createCategoryFixture();
        const tag = createTagFixture();

        expect(brand).toEqual({
            _id: "brand_apple",
            code: "APPLE",
            name: "Apple",
        });
        expect(category).toEqual({
            _id: "category_smartphone",
            code: "SMARTPHONE",
            name: "Smartphone",
        });
        expect(tag).toEqual({
            _id: "tag_camera_phone",
            code: "camera-phone",
            name: "Camera Phone",
        });
    });

    it("supports shallow overrides for product and variant fixtures", () => {
        const product = createProductFixture({
            title: "iPhone 16 Pro",
            specs: { chipset: "A18 Pro", battery: "3582mAh" },
        });
        const variant = createVariantFixture({
            sku: "IP16P-WHT-256",
            variantAttributes: {
                ram: "8GB",
                rom: "256GB",
                color: "White",
            },
            status: "draft",
        });

        expect(product.title).toBe("iPhone 16 Pro");
        expect(product.specs).toEqual({
            chipset: "A18 Pro",
            battery: "3582mAh",
        });
        expect(variant).toMatchObject({
            sku: "IP16P-WHT-256",
            status: "draft",
            variantAttributes: {
                ram: "8GB",
                rom: "256GB",
                color: "White",
            },
        });
    });

    it("keeps read-model fields out of the core product fixture by default", () => {
        const product = createProductFixture();
        const readModelProduct = createProductReadModelFixture({
            defaultSelectedVariantId: "variant_custom",
        });

        expect(product).not.toHaveProperty("listingVariantSnapshot");
        expect(product).not.toHaveProperty("minSalePrice");
        expect(readModelProduct).toMatchObject({
            defaultSelectedVariantId: "variant_custom",
            hasInStockVariants: true,
            hasActiveVariants: true,
            minSalePrice: 22990000,
            minOriginalPrice: 24990000,
        });
    });

    it("creates a valid catalog product graph with linked ids and tag codes", () => {
        const fixture = createCatalogProductGraphFixture({
            variantOverridesList: [
                {},
                {
                    _id: "variant_iphone_16_pink_256",
                    sku: "IP16-PNK-256",
                    variantAttributes: {
                        ram: "8GB",
                        rom: "256GB",
                        color: "Pink",
                    },
                },
            ],
        });

        expect(fixture.product.brandId).toBe(fixture.brand._id);
        expect(fixture.product.categoryId).toBe(fixture.category._id);
        expect(fixture.product.tags).toEqual(
            fixture.tags.map((tag) => tag.code)
        );
        expect(fixture.variants).toHaveLength(2);
        expect(
            fixture.variants.every(
                (variant) => variant.productId === fixture.product._id
            )
        ).toBe(true);
    });

    it("returns independent objects across calls so fixtures can be reused safely", () => {
        const firstProduct = createProductFixture();
        const secondProduct = createProductFixture();
        const firstVariant = createVariantFixture();
        const secondVariant = createVariantFixture();

        firstProduct.tags.push("gaming");
        firstVariant.variantAttributes.color = "Blue";

        expect(secondProduct.tags).toEqual(["camera-phone", "battery-phone"]);
        expect(secondVariant.variantAttributes).toEqual({
            ram: "8GB",
            rom: "128GB",
            color: "Black",
        });
    });
});
