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
