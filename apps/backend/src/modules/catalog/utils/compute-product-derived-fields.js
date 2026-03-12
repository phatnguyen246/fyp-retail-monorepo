import { buildListingVariantSnapshot } from "./build-listing-variant-snapshot.js";
import { calculateProductMinPrices } from "./calculate-product-min-prices.js";
import { filterActiveCatalogVariants } from "./filter-active-catalog-variants.js";
import { generateProductSlug } from "./generate-product-slug.js";
import { resolveDefaultSelectedVariant } from "./resolve-default-selected-variant.js";

export function computeProductDerivedFields({ product, variants = [] } = {}) {
    const activeVariants = filterActiveCatalogVariants(variants);
    const selectedVariant = resolveDefaultSelectedVariant(activeVariants);
    const { minSalePrice, minOriginalPrice } = calculateProductMinPrices(
        activeVariants
    );

    return {
        slug: generateProductSlug(product?.title),
        defaultSelectedVariantId: selectedVariant?._id ?? null,
        listingVariantSnapshot: buildListingVariantSnapshot(selectedVariant),
        minSalePrice,
        minOriginalPrice,
        hasActiveVariants: activeVariants.length > 0,
        hasInStockVariants: activeVariants.some(
            (variant) => variant?.isInStock === true
        ),
    };
}
