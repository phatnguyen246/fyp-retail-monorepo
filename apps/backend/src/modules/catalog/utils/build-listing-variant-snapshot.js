export function buildListingVariantSnapshot(selectedVariant) {
    if (!selectedVariant) {
        return null;
    }

    return {
        variantId: selectedVariant._id,
        sku: selectedVariant.sku,
        color: selectedVariant.variantAttributes.color,
        ...(selectedVariant.variantAttributes.colorFullName
            ? {
                  colorFullName: selectedVariant.variantAttributes.colorFullName,
              }
            : {}),
        ram: selectedVariant.variantAttributes.ram,
        rom: selectedVariant.variantAttributes.rom,
        salePrice: selectedVariant.salePrice,
        originalPrice: selectedVariant.originalPrice,
        currency: selectedVariant.currency,
    };
}
