import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { computeProductDerivedFields } from "../utils/compute-product-derived-fields.js";
import {
    createProductFixture,
    createVariantFixture,
} from "./fixtures/index.js";

describe("computeProductDerivedFields", () => {
    it("computes all derived fields when active in-stock variants exist", () => {
        const product = createProductFixture({
            title: "  Điện   thoại   Samsung Galaxy  ",
        });
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000025"),
                ramSort: 8,
                romSort: 256,
                salePrice: 24990000,
                originalPrice: 26990000,
                isInStock: false,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000026"),
                ramSort: 8,
                romSort: 128,
                salePrice: 22990000,
                originalPrice: 24990000,
                isInStock: true,
            }),
        ];

        expect(computeProductDerivedFields({ product, variants })).toEqual({
            slug: "dien-thoai-samsung-galaxy",
            defaultSelectedVariantId: variants[1]._id,
            listingVariantSnapshot: {
                variantId: variants[1]._id,
                sku: variants[1].sku,
                color: variants[1].variantAttributes.color,
                ram: variants[1].variantAttributes.ram,
                rom: variants[1].variantAttributes.rom,
                salePrice: 22990000,
                originalPrice: 24990000,
                currency: "VND",
            },
            minSalePrice: 22990000,
            minOriginalPrice: 24990000,
            hasActiveVariants: true,
            hasInStockVariants: true,
        });
    });

    it("falls back to active out-of-stock variants when none are in stock", () => {
        const product = createProductFixture();
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000027"),
                ramSort: 8,
                romSort: 256,
                isPrimaryColor: false,
                colorPriority: 2,
                variantSortOrder: 2,
                isInStock: false,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000028"),
                ramSort: 8,
                romSort: 256,
                isPrimaryColor: true,
                colorPriority: 1,
                variantSortOrder: 1,
                isInStock: false,
            }),
        ];

        const derivedFields = computeProductDerivedFields({ product, variants });

        expect(derivedFields.defaultSelectedVariantId?.toHexString()).toBe(
            variants[1]._id.toHexString()
        );
        expect(derivedFields.hasActiveVariants).toBe(true);
        expect(derivedFields.hasInStockVariants).toBe(false);
        expect(derivedFields.listingVariantSnapshot).toMatchObject({
            variantId: variants[1]._id,
        });
    });

    it("returns stable null and false defaults when no active non-deleted variant exists", () => {
        const product = createProductFixture();
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000029"),
                status: "inactive",
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000030"),
                isDeleted: true,
            }),
        ];

        expect(computeProductDerivedFields({ product, variants })).toEqual({
            slug: "iphone-16",
            defaultSelectedVariantId: null,
            listingVariantSnapshot: null,
            minSalePrice: null,
            minOriginalPrice: null,
            hasActiveVariants: false,
            hasInStockVariants: false,
        });
    });

    it("returns the same output when rebuilt multiple times from the same input", () => {
        const product = createProductFixture();
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000031"),
                isInStock: true,
            }),
        ];

        const firstResult = computeProductDerivedFields({ product, variants });
        const secondResult = computeProductDerivedFields({ product, variants });

        expect(secondResult).toEqual(firstResult);
    });
});
