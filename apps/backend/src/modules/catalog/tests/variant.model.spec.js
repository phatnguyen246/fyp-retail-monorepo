import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
    createVariant,
    VARIANT_DOCUMENT_SHAPE,
    VARIANT_STATUSES,
} from "../models/index.js";

describe("variant model", () => {
    it("creates a normalized variant document with stable defaults", () => {
        const variant = createVariant({
            _id: new ObjectId("65f000000000000000000007"),
            productId: new ObjectId("65f000000000000000000006"),
            sku: "IP16-BLK-128",
            variantAttributes: {
                ram: "8GB",
                rom: "128GB",
                color: "Black",
            },
            originalPrice: 24990000,
            salePrice: 22990000,
            video: "https://cdn.example.com/iphone-16/video.mp4",
            createdAt: new Date("2026-03-12T00:00:00.000Z"),
        });

        expect(variant).toMatchObject({
            sku: "IP16-BLK-128",
            currency: "VND",
            status: "active",
            ramSort: 0,
            romSort: 0,
            colorPriority: 0,
            variantSortOrder: 0,
            isPrimaryColor: false,
            isInStock: false,
            isDeleted: false,
            deletedAt: null,
            video: {
                url: "https://cdn.example.com/iphone-16/video.mp4",
                thumbnailUrl: null,
            },
        });
    });

    it("enforces the MVP variant status policy and readonly derived fields contract", () => {
        expect(VARIANT_STATUSES).toEqual(["active", "inactive"]);
        expect(VARIANT_DOCUMENT_SHAPE.isInStock).toMatchObject({
            computed: true,
            denormalized: true,
            readonly: true,
        });

        expect(() =>
            createVariant({
                _id: new ObjectId("65f000000000000000000007"),
                productId: new ObjectId("65f000000000000000000006"),
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
        ).toThrow(/variant status/);
    });

    it("enforces the shared pricing invariant in the model layer", () => {
        expect(() =>
            createVariant({
                _id: new ObjectId("65f000000000000000000007"),
                productId: new ObjectId("65f000000000000000000006"),
                sku: "ip16-blk-128",
                variantAttributes: {
                    ram: "8GB",
                    rom: "128GB",
                    color: "Black",
                },
                originalPrice: 22990000,
                salePrice: 24990000,
            })
        ).toThrow(/originalPrice/);
    });
});
