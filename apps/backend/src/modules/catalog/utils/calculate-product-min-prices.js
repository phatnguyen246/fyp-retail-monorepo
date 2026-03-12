import { filterActiveCatalogVariants } from "./filter-active-catalog-variants.js";

export function calculateProductMinPrices(variants = []) {
    const activeVariants = filterActiveCatalogVariants(variants);

    if (activeVariants.length === 0) {
        return {
            minSalePrice: null,
            minOriginalPrice: null,
        };
    }

    return {
        minSalePrice: Math.min(
            ...activeVariants.map((variant) => variant.salePrice)
        ),
        minOriginalPrice: Math.min(
            ...activeVariants.map((variant) => variant.originalPrice)
        ),
    };
}
