export function assertVariantPricingInvariant(
    { originalPrice, salePrice } = {},
    { allowPartial = false } = {}
) {
    const hasOriginalPrice = originalPrice !== undefined;
    const hasSalePrice = salePrice !== undefined;

    if (!hasOriginalPrice || !hasSalePrice) {
        if (allowPartial) {
            return;
        }

        throw new Error(
            "Catalog pricing invariant requires both originalPrice and salePrice"
        );
    }

    if (salePrice > originalPrice) {
        throw new Error(
            "Catalog requires originalPrice to be greater than or equal to salePrice"
        );
    }
}

export function assertVariantPricingPatchInvariant({
    currentValues = {},
    patchValues = {},
} = {}) {
    const originalPrice =
        patchValues.originalPrice ?? currentValues.originalPrice;
    const salePrice = patchValues.salePrice ?? currentValues.salePrice;

    assertVariantPricingInvariant(
        { originalPrice, salePrice },
        { allowPartial: true }
    );
}
