import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { calculateProductMinPrices } from "../utils/calculate-product-min-prices.js";
import { createVariantFixture } from "./fixtures/index.js";

describe("calculateProductMinPrices", () => {
    it("calculates min prices from active non-deleted variants only", () => {
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000018"),
                salePrice: 24990000,
                originalPrice: 26990000,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000019"),
                salePrice: 22990000,
                originalPrice: 25990000,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000020"),
                status: "inactive",
                salePrice: 19990000,
                originalPrice: 20990000,
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000021"),
                isDeleted: true,
                salePrice: 18990000,
                originalPrice: 19990000,
            }),
        ];

        expect(calculateProductMinPrices(variants)).toEqual({
            minSalePrice: 22990000,
            minOriginalPrice: 25990000,
        });
    });

    it("returns null prices when no active non-deleted variant exists", () => {
        const variants = [
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000022"),
                status: "inactive",
            }),
            createVariantFixture({
                _id: new ObjectId("65f000000000000000000023"),
                isDeleted: true,
            }),
        ];

        expect(calculateProductMinPrices(variants)).toEqual({
            minSalePrice: null,
            minOriginalPrice: null,
        });
    });
});
