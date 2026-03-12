import { createCatalogValidation } from "../validation/index.js";
import { loadVariantOrThrow } from "./catalog-admin.service-helpers.js";

export function createSoftDeleteVariantService({
    variantRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function softDeleteCatalogVariant({ variantId } = {}) {
        const parsedParams = validation.parseVariantIdParams({ variantId });
        const currentVariant = await loadVariantOrThrow({
            variantRepository,
            variantId: parsedParams.variantId,
        });

        if (currentVariant.isDeleted === true) {
            return currentVariant;
        }

        const deletedAt = new Date();

        await variantRepository.softDeleteVariantById({
            variantId: parsedParams.variantId,
            deletedAt,
            updatedAt: deletedAt,
        });
        await rebuildProductDerivedFields({
            productId: currentVariant.productId,
        });

        return variantRepository.findVariantById({
            variantId: parsedParams.variantId,
        });
    };
}
