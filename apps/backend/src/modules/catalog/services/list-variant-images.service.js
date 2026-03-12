import { createCatalogValidation } from "../validation/index.js";
import { loadVariantOrThrow } from "./catalog-admin.service-helpers.js";

export function createListVariantImagesService({
    variantRepository,
    mediaRepository,
    validation = createCatalogValidation(),
} = {}) {
    return async function listVariantImages({ variantId } = {}) {
        const parsedParams = validation.parseVariantIdParams({ variantId });

        await loadVariantOrThrow({
            variantRepository,
            variantId: parsedParams.variantId,
        });

        return mediaRepository.listMediaByVariantId({
            variantId: parsedParams.variantId,
        });
    };
}
