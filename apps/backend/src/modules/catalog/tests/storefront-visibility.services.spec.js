import { describe, expect, it } from "vitest";
import {
    assertStorefrontProductVisible,
    createStorefrontProductVisibilityFilter,
    SEARCH_STOREFRONT_VISIBLE_PRODUCT_STATUSES,
} from "../services/catalog-storefront.service-helpers.js";
import { resolveStorefrontDiscoveryFilter } from "../services/list-products.service.js";
import { createProductReadModelFixture } from "./fixtures/index.js";

describe("catalog storefront visibility", () => {
    it("builds active-only visibility by default and search visibility for discontinued products", async () => {
        const defaultFilter = await resolveStorefrontDiscoveryFilter({
            query: {
                ram: [],
                rom: [],
                color: [],
                tagCodes: [],
            },
            productRepository: {},
            referenceRepository: {},
            variantRepository: {},
        });
        const searchFilter = createStorefrontProductVisibilityFilter({
            allowedStatuses: SEARCH_STOREFRONT_VISIBLE_PRODUCT_STATUSES,
        });

        expect(defaultFilter).toEqual({
            filter: {
                status: "active",
                isDeleted: {
                    $ne: true,
                },
                hasActiveVariants: true,
            },
            noMatches: false,
        });
        expect(searchFilter).toEqual({
            status: {
                $in: ["active", "discontinued"],
            },
            isDeleted: {
                $ne: true,
            },
            hasActiveVariants: true,
        });
    });

    it("allows discontinued products only when storefront visibility explicitly includes them", () => {
        const discontinuedProduct = createProductReadModelFixture({
            status: "discontinued",
        });

        expect(() =>
            assertStorefrontProductVisible(discontinuedProduct, {
                productId: discontinuedProduct._id.toHexString(),
            })
        ).toThrow(/Catalog storefront product not found/);
        expect(() =>
            assertStorefrontProductVisible(discontinuedProduct, {
                productId: discontinuedProduct._id.toHexString(),
                allowedStatuses: SEARCH_STOREFRONT_VISIBLE_PRODUCT_STATUSES,
            })
        ).not.toThrow();
    });
});
