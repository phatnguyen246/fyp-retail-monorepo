import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { buildListingVariantSnapshot } from "../utils/build-listing-variant-snapshot.js";
import { createVariantFixture } from "./fixtures/index.js";

describe("buildListingVariantSnapshot", () => {
    it("returns the exact listing snapshot shape for the selected variant", () => {
        const variant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000024"),
        });

        const snapshot = buildListingVariantSnapshot(variant);

        expect(snapshot).toEqual({
            variantId: variant._id,
            sku: "IP16-BLK-128",
            color: "Black",
            ram: "8GB",
            rom: "128GB",
            salePrice: 22990000,
            originalPrice: 24990000,
            currency: "VND",
        });
        expect(Object.keys(snapshot)).toEqual([
            "variantId",
            "sku",
            "color",
            "ram",
            "rom",
            "salePrice",
            "originalPrice",
            "currency",
        ]);
    });

    it("returns null when no variant is selected", () => {
        expect(buildListingVariantSnapshot(null)).toBeNull();
    });
});
