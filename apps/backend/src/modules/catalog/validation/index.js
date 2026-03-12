import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";
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
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";
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
        createProductSchema: CREATE_PRODUCT_INPUT_SCHEMA,
        updateProductSchema: UPDATE_PRODUCT_INPUT_SCHEMA,
        createVariantSchema: CREATE_VARIANT_INPUT_SCHEMA,
        updateVariantSchema: UPDATE_VARIANT_INPUT_SCHEMA,
        importProductRowSchema: IMPORT_PRODUCT_ROW_SCHEMA,
        listProductsSchema: LIST_PRODUCTS_QUERY_SCHEMA,
        searchProductsSchema: SEARCH_PRODUCTS_QUERY_SCHEMA,
        smartphoneSpecsSchema: SMARTPHONE_SPECS_INPUT_SCHEMA,
        variantAttributesSchema: VARIANT_ATTRIBUTES_INPUT_SCHEMA,
        variantVideoSchema: VARIANT_VIDEO_INPUT_SCHEMA,
        parseCreateProductInput,
        parseUpdateProductInput,
        parseCreateVariantInput,
        parseUpdateVariantInput,
        parseImportProductRow,
        parseListProductsQuery,
        parseSearchProductsQuery,
        normalizers: {
            coerceBooleanInput,
            coerceIntegerInput,
            coerceNumberInput,
            normalizeCsvStringArrayInput,
            trimNullableTextInput,
            trimTextInput,
        },
    };
}
