import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
    createProduct,
    PRODUCT_DOCUMENT_SHAPE,
    PRODUCT_STATUSES,
    SMARTPHONE_SPECS_SHAPE,
} from "../models/index.js";

describe("product model", () => {
    it("creates a normalized product document with computed defaults", () => {
        const product = createProduct({
            _id: new ObjectId("65f000000000000000000006"),
            productGroupCode: "APPLE_IPHONE_16",
            title: "iPhone 16",
            brandId: new ObjectId("65f000000000000000000001"),
            categoryId: new ObjectId("65f000000000000000000002"),
            tagIds: [
                new ObjectId("65f000000000000000000003"),
                new ObjectId("65f000000000000000000005"),
            ],
            badges: ["new"],
            specs: {
                chipset: "A18",
                battery: "3561mAh",
                screen: {
                    technology: "OLED",
                },
            },
            createdAt: new Date("2026-03-12T00:00:00.000Z"),
        });

        expect(product).toMatchObject({
            productGroupCode: "APPLE_IPHONE_16",
            title: "iPhone 16",
            slug: "iphone-16",
            searchTitle: "iphone 16",
            productType: "smartphone",
            status: "draft",
            contactWhenOutOfStock: false,
            defaultSelectedVariantId: null,
            listingVariantSnapshot: null,
            minSalePrice: null,
            minOriginalPrice: null,
            hasActiveVariants: false,
            hasInStockVariants: false,
            isDeleted: false,
            deletedAt: null,
        });
        expect(product.specs).toMatchObject({
            chipset: "A18",
            battery: "3561mAh",
            screen: {
                technology: "OLED",
                size: null,
                resolution: null,
                refreshRate: null,
            },
        });
        expect(product).not.toHaveProperty("visibility");
    });

    it("enforces product status enum and soft delete invariant", () => {
        expect(PRODUCT_STATUSES).toEqual([
            "draft",
            "active",
            "inactive",
            "discontinued",
        ]);

        const deletedProduct = createProduct({
            _id: new ObjectId("65f000000000000000000006"),
            productGroupCode: "APPLE_IPHONE_16",
            title: "iPhone 16",
            brandId: new ObjectId("65f000000000000000000001"),
            categoryId: new ObjectId("65f000000000000000000002"),
            tagIds: [],
            badges: [],
            specs: {},
            isDeleted: true,
            updatedAt: new Date("2026-03-12T03:00:00.000Z"),
        });

        expect(deletedProduct.isDeleted).toBe(true);
        expect(deletedProduct.deletedAt).toBeInstanceOf(Date);

        expect(() =>
            createProduct({
                _id: new ObjectId("65f000000000000000000006"),
                productGroupCode: "APPLE_IPHONE_16",
                title: "iPhone 16",
                brandId: new ObjectId("65f000000000000000000001"),
                categoryId: new ObjectId("65f000000000000000000002"),
                specs: {},
                status: "deleted",
            })
        ).toThrow(/product status/);
    });

    it("documents smartphone specs and derived fields explicitly", () => {
        expect(PRODUCT_DOCUMENT_SHAPE.slug).toMatchObject({
            computed: true,
            readonly: true,
        });
        expect(PRODUCT_DOCUMENT_SHAPE.listingVariantSnapshot).toMatchObject({
            computed: true,
            denormalized: true,
            readonly: true,
        });
        expect(PRODUCT_DOCUMENT_SHAPE.minSalePrice).toMatchObject({
            computed: true,
            denormalized: true,
            readonly: true,
        });
        expect(SMARTPHONE_SPECS_SHAPE).not.toHaveProperty("ram");
        expect(SMARTPHONE_SPECS_SHAPE).not.toHaveProperty("rom");
        expect(SMARTPHONE_SPECS_SHAPE).not.toHaveProperty("color");
    });
});
