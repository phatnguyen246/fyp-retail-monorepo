import { ObjectId } from "mongodb";
import { createVariant } from "../../models/index.js";

export const VARIANT_IPHONE_16_BLACK_128_ID = "65f000000000000000000007";
export const VARIANT_FIXTURE_TIMESTAMP = new Date("2026-03-12T00:00:00.000Z");

export function createVariantFixture(overrides = {}) {
    return createVariant({
        _id: new ObjectId(VARIANT_IPHONE_16_BLACK_128_ID),
        productId: new ObjectId("65f000000000000000000006"),
        sku: "IP16-BLK-128",
        variantAttributes: {
            ram: "8GB",
            rom: "128GB",
            color: "Black",
        },
        originalPrice: 24990000,
        salePrice: 22990000,
        currency: "VND",
        status: "active",
        isInStock: true,
        createdAt: VARIANT_FIXTURE_TIMESTAMP,
        updatedAt: VARIANT_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}
