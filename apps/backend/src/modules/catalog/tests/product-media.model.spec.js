import { describe, expect, it } from "vitest";
import {
    createCatalogModels,
    createProductMediaMetadata,
    getAllowedProductMediaMimeTypes,
    PRODUCT_MEDIA_BINARY_FIELDS,
    PRODUCT_MEDIA_METADATA_SHAPE,
} from "../models/index.js";

describe("product media metadata model", () => {
    it("creates a MongoDB-ready metadata document without binary content", () => {
        const createdAt = new Date("2026-03-12T09:00:00.000Z");
        const updatedAt = new Date("2026-03-12T09:05:00.000Z");

        const media = createProductMediaMetadata({
            _id: "media_iphone_16_black_front",
            productId: "product_iphone_16",
            variantId: "variant_iphone_16_black_128",
            url: "https://storage.googleapis.com/catalog/iphone-16/front.webp",
            storagePath: "catalog/products/product_iphone_16/variants/variant_iphone_16_black_128/front.webp",
            fileName: "front.webp",
            mimeType: "image/webp",
            size: 245678,
            sortOrder: 1,
            createdAt,
            updatedAt,
        });

        expect(media).toEqual({
            _id: "media_iphone_16_black_front",
            productId: "product_iphone_16",
            variantId: "variant_iphone_16_black_128",
            url: "https://storage.googleapis.com/catalog/iphone-16/front.webp",
            storagePath:
                "catalog/products/product_iphone_16/variants/variant_iphone_16_black_128/front.webp",
            fileName: "front.webp",
            mimeType: "image/webp",
            size: 245678,
            sortOrder: 1,
            createdAt,
            updatedAt,
        });
        expect(media).not.toHaveProperty("buffer");
        expect(media).not.toHaveProperty("binary");
        expect(media).not.toHaveProperty("base64");
        expect(media).not.toHaveProperty("data");
    });

    it("exposes the reusable metadata shape and allowed mime types", () => {
        const models = createCatalogModels();

        expect(models.ProductMediaMetadata).toBe(PRODUCT_MEDIA_METADATA_SHAPE);
        expect(models.createProductMediaMetadata).toBe(createProductMediaMetadata);
        expect(models.getAllowedProductMediaMimeTypes()).toEqual([
            "image/jpeg",
            "image/png",
            "image/webp",
        ]);
        expect(getAllowedProductMediaMimeTypes()).toEqual([
            "image/jpeg",
            "image/png",
            "image/webp",
        ]);
        expect(PRODUCT_MEDIA_BINARY_FIELDS).toEqual([
            "binary",
            "buffer",
            "base64",
            "data",
        ]);
    });

    it("rejects invalid references and unsupported image mime types", () => {
        expect(() =>
            createProductMediaMetadata({
                productId: "",
                variantId: "variant_iphone_16_black_128",
                url: "https://example.com/front.png",
                storagePath: "catalog/front.png",
                fileName: "front.png",
                mimeType: "image/png",
                size: 1024,
            })
        ).toThrow(/productId/);

        expect(() =>
            createProductMediaMetadata({
                productId: "product_iphone_16",
                variantId: "variant_iphone_16_black_128",
                url: "https://example.com/front.gif",
                storagePath: "catalog/front.gif",
                fileName: "front.gif",
                mimeType: "image/gif",
                size: 1024,
            })
        ).toThrow(/mimeType/);
    });
});
