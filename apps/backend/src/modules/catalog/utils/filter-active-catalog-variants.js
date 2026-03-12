export function filterActiveCatalogVariants(variants = []) {
    if (!Array.isArray(variants)) {
        return [];
    }

    return variants.filter(
        (variant) => variant?.status === "active" && variant?.isDeleted !== true
    );
}
