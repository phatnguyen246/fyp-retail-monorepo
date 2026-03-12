import { describe, expect, it } from "vitest";
import {
    createCatalogValidation,
    parseCreateProductInput,
    parseCreateVariantInput,
    parseImportProductRow,
    parseListProductsQuery,
    parseSearchProductsQuery,
    parseUpdateProductInput,
    parseUpdateVariantInput,
} from "../validation/index.js";
import { createProductImportRowFixture } from "./fixtures/index.js";

describe("catalog validation", () => {
    it("parses create product input and rejects computed persistence fields", () => {
        const parsed = parseCreateProductInput({
            productGroupCode: "APPLE_IPHONE_16",
            title: "iPhone 16",
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            tagCodes: ["camera-phone", "battery-phone"],
            badges: ["new"],
            specs: {
                chipset: "A18",
            },
        });

        expect(parsed).toMatchObject({
            productGroupCode: "APPLE_IPHONE_16",
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            tagCodes: ["camera-phone", "battery-phone"],
            badges: ["new"],
            status: "draft",
        });

        expect(() =>
            parseCreateProductInput({
                productGroupCode: "APPLE_IPHONE_16",
                title: "iPhone 16",
                brandCode: "APPLE",
                categoryCode: "SMARTPHONE",
                specs: {},
                minSalePrice: 22990000,
            })
        ).toThrow();
    });

    it("keeps business keys immutable in update schemas", () => {
        expect(() =>
            parseUpdateProductInput({
                productGroupCode: "APPLE_IPHONE_16",
            })
        ).toThrow();

        expect(() =>
            parseUpdateVariantInput({
                sku: "IP16-BLK-128",
            })
        ).toThrow();
    });

    it("parses create variant input and rejects readonly or invalid status fields", () => {
        const parsed = parseCreateVariantInput({
            productGroupCode: "APPLE_IPHONE_16",
            sku: "IP16-BLK-128",
            variantAttributes: {
                ram: "8GB",
                rom: "128GB",
                color: "Black",
            },
            originalPrice: "24990000",
            salePrice: "22990000",
        });

        expect(parsed).toMatchObject({
            productGroupCode: "APPLE_IPHONE_16",
            sku: "IP16-BLK-128",
            status: "active",
            currency: "VND",
        });

        expect(() =>
            parseCreateVariantInput({
                productGroupCode: "APPLE_IPHONE_16",
                sku: "IP16-BLK-128",
                variantAttributes: {
                    ram: "8GB",
                    rom: "128GB",
                    color: "Black",
                },
                originalPrice: 24990000,
                salePrice: 22990000,
                isInStock: true,
            })
        ).toThrow();

        expect(() =>
            parseCreateVariantInput({
                productGroupCode: "APPLE_IPHONE_16",
                sku: "IP16-BLK-128",
                variantAttributes: {
                    ram: "8GB",
                    rom: "128GB",
                    color: "Black",
                },
                originalPrice: 24990000,
                salePrice: 22990000,
                status: "draft",
            })
        ).toThrow();
    });

    it("parses import rows, list queries, and search queries with normalization", () => {
        const importRow = parseImportProductRow(createProductImportRowFixture());
        const listQuery = parseListProductsQuery({
            page: "2",
            pageSize: "50",
            tagCodes: "camera-phone,battery-phone",
            includeDeleted: "true",
        });
        const searchQuery = parseSearchProductsQuery({
            q: " iPhone 16 ",
            tagCodes: ["camera-phone", "battery-phone"],
        });

        expect(importRow).toMatchObject({
            tagCodes: ["camera-phone", "battery-phone"],
            badges: ["new"],
            ramSort: 1,
            salePrice: 22990000,
            isPrimaryColor: true,
            variantStatus: "active",
        });
        expect(listQuery).toMatchObject({
            page: 2,
            pageSize: 50,
            tagCodes: ["camera-phone", "battery-phone"],
            includeDeleted: true,
        });
        expect(searchQuery).toMatchObject({
            q: "iPhone 16",
            tagCodes: ["camera-phone", "battery-phone"],
            includeDeleted: false,
        });
    });

    it("exposes grouped schemas and parse helpers through createCatalogValidation", () => {
        const validation = createCatalogValidation();

        expect(validation.validateHealthRequest()).toEqual({ ok: true });
        expect(validation.createProductSchema).toBeDefined();
        expect(validation.createVariantSchema).toBeDefined();
        expect(validation.importProductRowSchema).toBeDefined();
        expect(validation.parseCreateProductInput).toBe(parseCreateProductInput);
        expect(validation.parseUpdateProductInput).toBe(parseUpdateProductInput);
    });
});
