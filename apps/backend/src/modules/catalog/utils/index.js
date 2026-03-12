import { CATALOG_MODULE_NAME } from "../constants/index.js";
export {
    isValidObjectId,
    toObjectId,
    toObjectIdArray,
    toOptionalObjectId,
} from "./object-id.js";
export {
    normalizeBadgeCode,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeKeyword,
    normalizeProductGroupCode,
    normalizeSearchTitle,
    normalizeSku,
    normalizeTagCode,
    normalizeTitle,
} from "./catalog-field-normalizers.js";
export { buildListingVariantSnapshot } from "./build-listing-variant-snapshot.js";
export { calculateProductMinPrices } from "./calculate-product-min-prices.js";
export { computeProductDerivedFields } from "./compute-product-derived-fields.js";
export { filterActiveCatalogVariants } from "./filter-active-catalog-variants.js";
export { generateProductSlug } from "./generate-product-slug.js";
export { resolveDefaultSelectedVariant } from "./resolve-default-selected-variant.js";
export {
    assertVariantPricingInvariant,
    assertVariantPricingPatchInvariant,
} from "./catalog-invariants.js";

export function createCatalogHealthPayload() {
    return {
        ok: true,
        module: CATALOG_MODULE_NAME,
    };
}
