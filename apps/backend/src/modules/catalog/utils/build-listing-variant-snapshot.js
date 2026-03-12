export function buildListingVariantSnapshot(selectedVariant) {
    if (!selectedVariant) {
        return null;
    }

    return {
        variantId: selectedVariant._id,
        sku: selectedVariant.sku,
        color: selectedVariant.variantAttributes.color,
        ram: selectedVariant.variantAttributes.ram,
        rom: selectedVariant.variantAttributes.rom,
        salePrice: selectedVariant.salePrice,
        originalPrice: selectedVariant.originalPrice,
        currency: selectedVariant.currency,
    };
}
