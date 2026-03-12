import {
    ADMIN_CREATE_VARIANT_INPUT_SCHEMA,
    parseAdminCreateVariantInput,
} from "./admin-create-variant.schema.js";
import {
    MEDIA_ID_PARAMS_SCHEMA,
    parseProductIdParams,
    parseMediaIdParams,
    parseVariantMediaParams,
    parseVariantIdParams,
    PRODUCT_ID_PARAMS_SCHEMA,
    VARIANT_MEDIA_PARAMS_SCHEMA,
    VARIANT_ID_PARAMS_SCHEMA,
} from "./admin-resource-params.schema.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    collapseWhitespaceTextInput,
    normalizeBadgeCode,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeCsvStringArrayInput,
    normalizeKeyword,
    normalizeProductGroupCode,
    normalizeSearchTitle,
    normalizeSku,
    normalizeTagCode,
    normalizeTitle,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";
import {
    assertVariantPricingInvariant,
    assertVariantPricingPatchInvariant,
} from "../utils/catalog-invariants.js";
import {
    CREATE_PRODUCT_INPUT_SCHEMA,
    parseCreateProductInput,
    SMARTPHONE_SPECS_INPUT_SCHEMA,
} from "./create-product.schema.js";
import {
    CREATE_VARIANT_INPUT_SCHEMA,
    parseCreateVariantInput,
    VARIANT_ATTRIBUTES_INPUT_SCHEMA,
    VARIANT_VIDEO_INPUT_SCHEMA,
} from "./create-variant.schema.js";
import {
    IMPORT_PRODUCT_ROW_SCHEMA,
    parseImportProductRow,
} from "./import-product-row.schema.js";
import {
    LIST_PRODUCTS_QUERY_SCHEMA,
    parseListProductsQuery,
} from "./list-products.schema.js";
import {
    parseProductDiscoveryQuery,
    PRODUCT_DISCOVERY_QUERY_SCHEMA,
} from "./product-discovery-query.schema.js";
import {
    SEARCH_PRODUCTS_QUERY_SCHEMA,
    parseSearchProductsQuery,
} from "./search-products.schema.js";
import {
    UPDATE_PRODUCT_INPUT_SCHEMA,
    parseUpdateProductInput,
} from "./update-product.schema.js";
import {
    UPDATE_VARIANT_INPUT_SCHEMA,
    parseUpdateVariantInput,
} from "./update-variant.schema.js";

export {
    ADMIN_CREATE_VARIANT_INPUT_SCHEMA,
    parseAdminCreateVariantInput,
} from "./admin-create-variant.schema.js";
export {
    MEDIA_ID_PARAMS_SCHEMA,
    parseProductIdParams,
    parseMediaIdParams,
    parseVariantMediaParams,
    parseVariantIdParams,
    PRODUCT_ID_PARAMS_SCHEMA,
    VARIANT_MEDIA_PARAMS_SCHEMA,
    VARIANT_ID_PARAMS_SCHEMA,
} from "./admin-resource-params.schema.js";
export {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    collapseWhitespaceTextInput,
    normalizeBadgeCode,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeCsvStringArrayInput,
    normalizeKeyword,
    normalizeProductGroupCode,
    normalizeSearchTitle,
    normalizeSku,
    normalizeTagCode,
    normalizeTitle,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";
export {
    assertVariantPricingInvariant,
    assertVariantPricingPatchInvariant,
} from "../utils/catalog-invariants.js";
export {
    CREATE_PRODUCT_INPUT_SCHEMA,
    parseCreateProductInput,
    SMARTPHONE_SPECS_INPUT_SCHEMA,
} from "./create-product.schema.js";
export {
    CREATE_VARIANT_INPUT_SCHEMA,
    parseCreateVariantInput,
    VARIANT_ATTRIBUTES_INPUT_SCHEMA,
    VARIANT_VIDEO_INPUT_SCHEMA,
} from "./create-variant.schema.js";
export {
    IMPORT_PRODUCT_ROW_SCHEMA,
    parseImportProductRow,
} from "./import-product-row.schema.js";
export {
    LIST_PRODUCTS_QUERY_SCHEMA,
    parseListProductsQuery,
} from "./list-products.schema.js";
export {
    PRODUCT_DISCOVERY_QUERY_SCHEMA,
    parseProductDiscoveryQuery,
} from "./product-discovery-query.schema.js";
export {
    SEARCH_PRODUCTS_QUERY_SCHEMA,
    parseSearchProductsQuery,
} from "./search-products.schema.js";
export {
    UPDATE_PRODUCT_INPUT_SCHEMA,
    parseUpdateProductInput,
} from "./update-product.schema.js";
export {
    UPDATE_VARIANT_INPUT_SCHEMA,
    parseUpdateVariantInput,
} from "./update-variant.schema.js";

export function createCatalogValidation() {
    return {
        validateHealthRequest() {
            return { ok: true };
        },
        adminCreateVariantSchema: ADMIN_CREATE_VARIANT_INPUT_SCHEMA,
        createProductSchema: CREATE_PRODUCT_INPUT_SCHEMA,
        updateProductSchema: UPDATE_PRODUCT_INPUT_SCHEMA,
        createVariantSchema: CREATE_VARIANT_INPUT_SCHEMA,
        updateVariantSchema: UPDATE_VARIANT_INPUT_SCHEMA,
        productIdParamsSchema: PRODUCT_ID_PARAMS_SCHEMA,
        variantIdParamsSchema: VARIANT_ID_PARAMS_SCHEMA,
        mediaIdParamsSchema: MEDIA_ID_PARAMS_SCHEMA,
        variantMediaParamsSchema: VARIANT_MEDIA_PARAMS_SCHEMA,
        importProductRowSchema: IMPORT_PRODUCT_ROW_SCHEMA,
        productDiscoverySchema: PRODUCT_DISCOVERY_QUERY_SCHEMA,
        listProductsSchema: LIST_PRODUCTS_QUERY_SCHEMA,
        searchProductsSchema: SEARCH_PRODUCTS_QUERY_SCHEMA,
        smartphoneSpecsSchema: SMARTPHONE_SPECS_INPUT_SCHEMA,
        variantAttributesSchema: VARIANT_ATTRIBUTES_INPUT_SCHEMA,
        variantVideoSchema: VARIANT_VIDEO_INPUT_SCHEMA,
        parseAdminCreateVariantInput,
        parseCreateProductInput,
        parseUpdateProductInput,
        parseCreateVariantInput,
        parseUpdateVariantInput,
        parseProductIdParams,
        parseMediaIdParams,
        parseVariantMediaParams,
        parseVariantIdParams,
        parseImportProductRow,
        parseProductDiscoveryQuery,
        parseListProductsQuery,
        parseSearchProductsQuery,
        assertVariantPricingInvariant,
        assertVariantPricingPatchInvariant,
        normalizers: {
            coerceBooleanInput,
            coerceIntegerInput,
            coerceNumberInput,
            collapseWhitespaceTextInput,
            normalizeBadgeCode,
            normalizeBrandCode,
            normalizeCategoryCode,
            normalizeCsvStringArrayInput,
            normalizeKeyword,
            normalizeProductGroupCode,
            normalizeSearchTitle,
            normalizeSku,
            normalizeTagCode,
            normalizeTitle,
            trimNullableTextInput,
            trimTextInput,
        },
    };
}
