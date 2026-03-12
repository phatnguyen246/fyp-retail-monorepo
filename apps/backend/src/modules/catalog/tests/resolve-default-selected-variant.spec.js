import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { resolveDefaultSelectedVariant } from "../utils/resolve-default-selected-variant.js";
import { createVariantFixture } from "./fixtures/index.js";

describe("resolveDefaultSelectedVariant", () => {
    it("prefers active in-stock variants before considering out-of-stock variants", () => {
        const defaultVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000010"),
            ramSort: 2,
            romSort: 1,
            isInStock: true,
        });
        const outOfStockVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000011"),
            ramSort: 0,
            romSort: 0,
            isInStock: false,
        });

        const selectedVariant = resolveDefaultSelectedVariant([
            outOfStockVariant,
            defaultVariant,
        ]);

        expect(selectedVariant?._id.toHexString()).toBe(
            defaultVariant._id.toHexString()
        );
    });

    it("falls back to active out-of-stock variants and respects the full sort order", () => {
        const laterVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000012"),
            ramSort: 8,
            romSort: 256,
            isPrimaryColor: false,
            colorPriority: 2,
            variantSortOrder: 2,
            isInStock: false,
        });
        const expectedVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000013"),
            ramSort: 8,
            romSort: 256,
            isPrimaryColor: true,
            colorPriority: 1,
            variantSortOrder: 1,
            isInStock: false,
        });

        const selectedVariant = resolveDefaultSelectedVariant([
            laterVariant,
            expectedVariant,
        ]);

        expect(selectedVariant?._id.toHexString()).toBe(
            expectedVariant._id.toHexString()
        );
    });

    it("ignores soft-deleted active variants and returns null when no active variant remains", () => {
        const deletedActiveVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000014"),
            status: "active",
            isDeleted: true,
            isInStock: true,
        });
        const inactiveVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000015"),
            status: "inactive",
            isInStock: true,
        });

        expect(
            resolveDefaultSelectedVariant([deletedActiveVariant, inactiveVariant])
        ).toBeNull();
    });

    it("uses _id as a stable tie-breaker when all other sort keys match", () => {
        const earlierVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000016"),
            ramSort: 8,
            romSort: 128,
            isPrimaryColor: true,
            colorPriority: 1,
            variantSortOrder: 1,
            isInStock: true,
        });
        const laterVariant = createVariantFixture({
            _id: new ObjectId("65f000000000000000000017"),
            ramSort: 8,
            romSort: 128,
            isPrimaryColor: true,
            colorPriority: 1,
            variantSortOrder: 1,
            isInStock: true,
        });

        const selectedVariant = resolveDefaultSelectedVariant([
            laterVariant,
            earlierVariant,
        ]);

        expect(selectedVariant?._id.toHexString()).toBe(
            earlierVariant._id.toHexString()
        );
    });
});
