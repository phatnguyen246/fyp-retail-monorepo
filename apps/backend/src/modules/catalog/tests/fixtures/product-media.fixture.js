import { ObjectId } from "mongodb";
import { createProductMediaMetadata } from "../../models/index.js";

export const PRODUCT_MEDIA_FIXTURE_TIMESTAMP = new Date(
    "2026-03-12T00:00:00.000Z"
);

export function createProductMediaFixture(overrides = {}) {
    return createProductMediaMetadata({
        _id: new ObjectId("65f000000000000000000090"),
        productId: new ObjectId("65f000000000000000000006"),
        variantId: new ObjectId("65f000000000000000000007"),
        url: "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/front.webp",
        storagePath: "catalog/products/p123/variants/v456/front.webp",
        fileName: "front.webp",
        mimeType: "image/webp",
        size: 245678,
        sortOrder: 0,
        createdAt: PRODUCT_MEDIA_FIXTURE_TIMESTAMP,
        updatedAt: PRODUCT_MEDIA_FIXTURE_TIMESTAMP,
        ...overrides,
    });
}
