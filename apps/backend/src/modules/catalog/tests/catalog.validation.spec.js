import { describe, expect, it } from "vitest";
import {
    assertVariantPricingInvariant,
    createCatalogValidation,
    parseMediaIdParams,
    parseAdminCreateVariantInput,
    parseVariantMediaParams,
    parseProductIdParams,
    parseProductDiscoveryQuery,
    parseCreateProductInput,
    parseCreateVariantInput,
    parseImportProductRow,
    parseListProductsQuery,
    parseSearchProductsQuery,
    parseUpdateProductInput,
    parseUpdateVariantInput,
    parseVariantIdParams,
} from "../validation/index.js";
import { createProductImportRowFixture } from "./fixtures/index.js";

describe("catalog validation", () => {
    it("parses create product input and rejects computed persistence fields", () => {
        const parsed = parseCreateProductInput({
            productGroupCode: " apple_iphone_16 ",
            title: "  Điện   thoại   Samsung  ",
            brandCode: " apple ",
            categoryCode: " smartphone ",
            tagCodes: ["Camera-Phone", "battery-phone"],
            badges: ["NEW"],
            specs: {
                chipset: "A18",
            },
        });

        expect(parsed).toMatchObject({
            productGroupCode: "APPLE_IPHONE_16",
            title: "Điện thoại Samsung",
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            tagCodes: ["camera-phone", "battery-phone"],
            badges: ["new"],
            status: "draft",
        });

        expect(() =>
            parseCreateProductInput({
                productGroupCode: "APPLE_IPHONE_16",
                title: "   ",
                brandCode: "APPLE",
                categoryCode: "SMARTPHONE",
                specs: {},
            })
        ).toThrow();

        expect(() =>
            parseCreateProductInput({
                productGroupCode: "APPLE_IPHONE_16",
                title: "iPhone 16",
                brandCode: "APPLE",
                categoryCode: "SMARTPHONE",
                specs: {},
                status: "archived",
            })
        ).toThrow();

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
            productGroupCode: "apple_iphone_16",
            sku: "ip16-blk-128",
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
                originalPrice: 22990000,
                salePrice: 24990000,
            })
        ).toThrow(/originalPrice/);

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
                ramSort: "1.9",
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

    it("parses admin create variant input without product identity fields and validates ObjectId route params", () => {
        const parsed = parseAdminCreateVariantInput({
            sku: "ip16-blk-128",
            variantAttributes: {
                ram: "8GB",
                rom: "128GB",
                color: "Black",
            },
            originalPrice: "24990000",
            salePrice: "22990000",
        });

        expect(parsed).toMatchObject({
            sku: "IP16-BLK-128",
            status: "active",
            currency: "VND",
        });
        expect(
            parseProductIdParams({
                productId: "65f000000000000000000006",
            })
        ).toEqual({
            productId: "65f000000000000000000006",
        });
        expect(
            parseVariantIdParams({
                variantId: "65f000000000000000000007",
            })
        ).toEqual({
            variantId: "65f000000000000000000007",
        });
        expect(
            parseMediaIdParams({
                mediaId: "65f000000000000000000090",
            })
        ).toEqual({
            mediaId: "65f000000000000000000090",
        });
        expect(
            parseVariantMediaParams({
                variantId: "65f000000000000000000007",
                mediaId: "65f000000000000000000090",
            })
        ).toEqual({
            variantId: "65f000000000000000000007",
            mediaId: "65f000000000000000000090",
        });

        expect(() =>
            parseAdminCreateVariantInput({
                productId: "65f000000000000000000006",
                sku: "IP16-BLK-128",
                variantAttributes: {
                    ram: "8GB",
                    rom: "128GB",
                    color: "Black",
                },
                originalPrice: 24990000,
                salePrice: 22990000,
            })
        ).toThrow();

        expect(() =>
            parseProductIdParams({
                productId: "invalid-object-id",
            })
        ).toThrow(/productId/);
    });

    it("parses import rows, discovery queries, and search/list compatibility parsers", () => {
        const importRow = parseImportProductRow(
            createProductImportRowFixture({
                brandCode: "apple",
                categoryCode: "smartphone",
                tagCodes: "Camera-Phone,battery-phone",
                badges: "NEW",
                sku: "ip16-blk-128",
            })
        );
        const listQuery = parseListProductsQuery({
            page: "2",
            pageSize: "50",
            tagCodes: "camera-phone,battery-phone",
            includeDeleted: "true",
            sortBy: "createdAt",
            sortOrder: "asc",
        });
        const searchQuery = parseSearchProductsQuery({
            q: "  Điện   thoại   Samsung  ",
            brand: "apple",
            category: "smartphone",
            tags: ["camera-phone", "battery-phone"],
            page: "2",
            limit: "10",
            minPrice: "1000",
            maxPrice: "2000",
            sort: "minSalePrice:asc",
        });
        const discoveryQuery = parseProductDiscoveryQuery({
            keyword: "  Điện   thoại   Samsung  ",
            brand: "apple",
            category: "smartphone",
            tags: "camera-phone,battery-phone",
            ram: "8GB,12GB",
            rom: ["128GB", "256GB"],
            page: "2",
            limit: "10",
            minPrice: "1000",
            maxPrice: "2000",
            sort: "minSalePrice:asc",
        });

        expect(importRow).toMatchObject({
            tagCodes: ["camera-phone", "battery-phone"],
            badges: ["new"],
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            sku: "IP16-BLK-128",
            ramSort: 1,
            salePrice: 22990000,
            isPrimaryColor: true,
            variantStatus: "active",
        });
        expect(listQuery).toMatchObject({
            page: 2,
            limit: 50,
            pageSize: 50,
            tagCodes: ["camera-phone", "battery-phone"],
            includeDeleted: true,
            sort: "createdAt:asc",
            sortBy: "createdAt",
            sortOrder: "asc",
        });
        expect(searchQuery).toMatchObject({
            q: "Điện thoại Samsung",
            keyword: "Điện thoại Samsung",
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            tagCodes: ["camera-phone", "battery-phone"],
            minPrice: 1000,
            maxPrice: 2000,
            page: 2,
            limit: 10,
            pageSize: 10,
            sort: "minSalePrice:asc",
            includeDeleted: false,
        });
        expect(discoveryQuery).toMatchObject({
            q: "Điện thoại Samsung",
            keyword: "Điện thoại Samsung",
            brandCode: "APPLE",
            categoryCode: "SMARTPHONE",
            ram: ["8GB", "12GB"],
            rom: ["128GB", "256GB"],
            tagCodes: ["camera-phone", "battery-phone"],
        });

        expect(() =>
            parseProductDiscoveryQuery({
                sort: "unsupported:asc",
            })
        ).toThrow();

        expect(() =>
            parseProductDiscoveryQuery({
                page: "1.9",
            })
        ).toThrow();
    });

    it("exposes grouped schemas, helpers, and invariants through createCatalogValidation", () => {
        const validation = createCatalogValidation();

        expect(validation.validateHealthRequest()).toEqual({ ok: true });
        expect(validation.createProductSchema).toBeDefined();
        expect(validation.createVariantSchema).toBeDefined();
        expect(validation.importProductRowSchema).toBeDefined();
        expect(validation.productDiscoverySchema).toBeDefined();
        expect(validation.parseCreateProductInput).toBe(parseCreateProductInput);
        expect(validation.parseUpdateProductInput).toBe(parseUpdateProductInput);
        expect(validation.parseProductDiscoveryQuery).toBe(parseProductDiscoveryQuery);
        expect(validation.assertVariantPricingInvariant).toBe(
            assertVariantPricingInvariant
        );
    });
});
