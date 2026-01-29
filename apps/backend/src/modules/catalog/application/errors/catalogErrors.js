import { AppError } from "./appError.js";

/**
 * Factory functions để tránh typo + thống nhất semantics
 */
export const CatalogErrors = {
    PRODUCT_ID_REQUIRED: () =>
        new AppError("PRODUCT_ID_REQUIRED",400,"Product id is required"),

    PRODUCT_SLUG_REQUIRED: () =>
        new AppError("PRODUCT_SLUG_REQUIRED", 400, "Product slug is required"),

    PRODUCT_NAME_REQUIRED: () =>
        new AppError("PRODUCT_NAME_REQUIRED", 400, "Product name is required"),

    PRODUCT_STATUS_REQUIRED: () =>
        new AppError("PRODUCT_STATUS_REQUIRED", 400, "Product status is required"),

    PRODUCT_STATUS_INVALID: () =>
        new AppError("PRODUCT_STATUS_INVALID", 400, "Product status is invalid"),

    PRODUCT_STATUS_TRANSITION_INVALID: ({ from, to, allowed }) =>
        new AppError(
            "PRODUCT_STATUS_TRANSITION_INVALID",
            409,
            `Invalid product status transition: ${from} → ${to}`,
            {
                from,
                to,
                allowed: Array.isArray(allowed) ? allowed : [],
            }
        ),

    BAD_REQUEST: (message = "Bad request", details = {}) =>
        new AppError("BAD_REQUEST", 400, message, details),

    PRODUCT_TYPE_INVALID: () =>
        new AppError("PRODUCT_TYPE_INVALID", 400, "Product type is invalid"),

    PRODUCT_NOT_FOUND: () =>
        new AppError("PRODUCT_NOT_FOUND", 404, "Product not found"),

    PRODUCT_OPTIONS_EMPTY: () =>
        new AppError("PRODUCT_OPTIONS_EMPTY", 400, "Product has no options"),

    VARIANT_SKU_REQUIRED: () =>
        new AppError("VARIANT_SKU_REQUIRED", 400, "Variant SKU is required"),

    VARIANT_PRICE_INVALID: () =>
        new AppError("VARIANT_PRICE_INVALID", 400, "Variant price is invalid"),

    VARIANT_STOCK_INVALID: () =>
        new AppError("VARIANT_STOCK_INVALID", 400, "Variant stock is invalid"),

    VARIANT_SELECTION_INVALID: () =>
        new AppError("VARIANT_SELECTION_INVALID", 400, "Variant selections are invalid"),

    VARIANT_SELECTION_INCOMPLETE: () =>
        new AppError(
            "VARIANT_SELECTION_INCOMPLETE",
            400,
            "Variant selections must include all product options"
        ),

    VARIANT_SELECTION_DUPLICATE_OPTION: () =>
        new AppError(
            "VARIANT_SELECTION_DUPLICATE_OPTION",
            400,
            "Duplicate option in variant selections"
        ),

    VARIANT_OPTION_NOT_FOUND: (optionCode) =>
        new AppError(
            "VARIANT_OPTION_NOT_FOUND",
            400,
            `Option '${optionCode}' does not belong to product`,
            { optionCode }
        ),

    VARIANT_OPTION_VALUE_NOT_FOUND: (optionCode, valueCode) =>
        new AppError(
            "VARIANT_OPTION_VALUE_NOT_FOUND",
            400,
            `Value '${valueCode}' does not belong to option '${optionCode}'`,
            { optionCode, valueCode }
        ),

    VARIANT_COMBINATION_EXISTS: () =>
        new AppError(
            "VARIANT_COMBINATION_EXISTS",
            409,
            "Variant combination already exists"
        ),

    VARIANT_SKU_EXISTS: () =>
        new AppError(
            "VARIANT_SKU_EXISTS",
            409,
            "Variant SKU already exists"
        ),

    SORT_DIRECTION_INVALID: (direction, allowed = ["asc", "desc"]) =>
        new AppError(
            "SORT_DIRECTION_INVALID",
            400,
            "Sort direction is invalid",
            {
                direction,
                allowed: Array.isArray(allowed) ? allowed : ["asc", "desc"],
            }
        ),

    SORT_FIELD_INVALID: (field, allowed = []) =>
        new AppError(
            "SORT_FIELD_INVALID",
            400,
            "Sort field is invalid",
            {
                field,
                allowed: Array.isArray(allowed) ? allowed : [],
            }
        ),

    INVALID_CURSOR: () =>
        new AppError("INVALID_CURSOR", 400, "Cursor is invalid"),

    CURSOR_MISMATCH: ({ expected, actual } = {}) =>
        new AppError(
            "CURSOR_MISMATCH",
            400,
            "Cursor does not match the current sort",
            {
                expected: expected ?? null,
                actual: actual ?? null,
            }
        ),
};
