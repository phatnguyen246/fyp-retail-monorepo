import { AppError } from "./AppError.js";

/**
 * Factory functions để tránh typo + thống nhất semantics
 */
export const CatalogErrors = {
    PRODUCT_ID_REQUIRED: () =>
        new AppError("PRODUCT_ID_REQUIRED",400,"Product id is required"),

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
};
