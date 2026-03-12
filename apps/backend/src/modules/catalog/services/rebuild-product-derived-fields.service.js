import { computeProductDerivedFields } from "../utils/compute-product-derived-fields.js";

export function createRebuildProductDerivedFieldsService({
    productRepository,
    variantRepository,
    computeDerivedFields = computeProductDerivedFields,
} = {}) {
    return async function rebuildProductDerivedFields({ productId } = {}) {
        const product = await productRepository.findProductById({ productId });

        if (!product) {
            throw new Error(
                `Catalog product not found for derived field rebuild: ${productId}`
            );
        }

        const variants = await variantRepository.findVariantsByProductId({
            productId,
        });
        const derivedFields = computeDerivedFields({
            product,
            variants,
        });

        await productRepository.updateProductDerivedFields({
            productId,
            derivedFields,
        });

        return derivedFields;
    };
}
