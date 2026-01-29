import { DomainError } from "./domainError.js";

/**
 * Factory functions to avoid typos and keep domain error semantics consistent.
 */
export const CatalogDomainErrors = {
    PRODUCT_NAME_REQUIRED: () =>
        new DomainError("PRODUCT_NAME_REQUIRED", "Product name is required"),

    PRODUCT_SLUG_REQUIRED: () =>
        new DomainError("PRODUCT_SLUG_REQUIRED", "Product slug is required"),

    PRODUCT_STATUS_REQUIRED: () =>
        new DomainError("PRODUCT_STATUS_REQUIRED", "Product status is required"),

    PRODUCT_STATUS_INVALID: () =>
        new DomainError("PRODUCT_STATUS_INVALID", "Product status is invalid"),

    PRODUCT_STATUS_TRANSITION_INVALID: ({ from, to, allowed }) =>
        new DomainError(
            "PRODUCT_STATUS_TRANSITION_INVALID",
            `Invalid product status transition: ${from} -> ${to}`,
            {
                from,
                to,
                allowed: Array.isArray(allowed) ? allowed : [],
            }
        ),

    PRODUCT_OPTIONS_EMPTY: () =>
        new DomainError("PRODUCT_OPTIONS_EMPTY", "Product has no options"),

    VARIANT_SKU_REQUIRED: () =>
        new DomainError("VARIANT_SKU_REQUIRED", "Variant SKU is required"),

    VARIANT_PRICE_INVALID: () =>
        new DomainError("VARIANT_PRICE_INVALID", "Variant price is invalid"),

    VARIANT_STOCK_INVALID: () =>
        new DomainError("VARIANT_STOCK_INVALID", "Variant stock is invalid"),

    VARIANT_SELECTION_INVALID: () =>
        new DomainError(
            "VARIANT_SELECTION_INVALID",
            "Variant selections are invalid"
        ),

    VARIANT_SELECTION_INCOMPLETE: () =>
        new DomainError(
            "VARIANT_SELECTION_INCOMPLETE",
            "Variant selections must include all product options"
        ),

    VARIANT_SELECTION_DUPLICATE_OPTION: () =>
        new DomainError(
            "VARIANT_SELECTION_DUPLICATE_OPTION",
            "Duplicate option in variant selections"
        ),

    VARIANT_OPTION_NOT_FOUND: (optionCode) =>
        new DomainError(
            "VARIANT_OPTION_NOT_FOUND",
            `Option '${optionCode}' does not belong to product`,
            { optionCode }
        ),

    VARIANT_OPTION_VALUE_NOT_FOUND: (optionCode, valueCode) =>
        new DomainError(
            "VARIANT_OPTION_VALUE_NOT_FOUND",
            `Value '${valueCode}' does not belong to option '${optionCode}'`,
            { optionCode, valueCode }
        ),

    VARIANT_COMBINATION_EXISTS: () =>
        new DomainError(
            "VARIANT_COMBINATION_EXISTS",
            "Variant combination already exists"
        ),

    VARIANT_SKU_EXISTS: () =>
        new DomainError("VARIANT_SKU_EXISTS", "Variant SKU already exists"),
};
