import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogInternalError,
    createCatalogNotFoundError,
} from "./catalog-service.errors.js";
import {
    assertProductAllowsVariantMutation,
    assertVariantNotDeleted,
    assertVariantParentProductExists,
    loadVariantOrThrow,
} from "./catalog-admin.service-helpers.js";
import { assertVariantImageStorageAvailable } from "./variant-image.service-helpers.js";

export function createDeleteVariantImageService({
    productRepository,
    variantRepository,
    mediaRepository,
    storage,
    validation = createCatalogValidation(),
} = {}) {
    return async function deleteVariantImage({ variantId, mediaId } = {}) {
        assertVariantImageStorageAvailable(storage);

        const parsedParams = validation.parseVariantMediaParams({
            variantId,
            mediaId,
        });
        const variant = await loadVariantOrThrow({
            variantRepository,
            variantId: parsedParams.variantId,
        });

        assertVariantNotDeleted(variant);

        const product = await productRepository.findProductById({
            productId: variant.productId,
        });

        assertVariantParentProductExists(product, variant);
        assertProductAllowsVariantMutation(product);

        const media = await mediaRepository.findMediaById({
            mediaId: parsedParams.mediaId,
        });

        if (
            !media ||
            media.variantId.toHexString() !== variant._id.toHexString() ||
            media.productId.toHexString() !== product._id.toHexString()
        ) {
            throw createCatalogNotFoundError(
                `Catalog variant image not found: ${parsedParams.mediaId}`,
                {
                    variantId: parsedParams.variantId,
                    mediaId: parsedParams.mediaId,
                }
            );
        }

        try {
            await storage.deleteVariantImage(media.storagePath);
        } catch (error) {
            throw createCatalogInternalError(
                `Catalog variant image storage deletion failed for variant: ${variant._id}`,
                {
                    variantId: parsedParams.variantId,
                    mediaId: parsedParams.mediaId,
                    productId: product._id.toHexString(),
                    storagePath: media.storagePath,
                    reason: error?.message ?? "Unknown storage deletion error",
                }
            );
        }

        try {
            await variantRepository.removeMediaId({
                variantId: variant._id,
                mediaId: media._id,
            });
            const deleteResult = await mediaRepository.deleteMediaByIdForVariant({
                mediaId: media._id,
                variantId: variant._id,
            });

            if (deleteResult?.deletedCount !== 1) {
                throw new Error("Variant image metadata was not deleted");
            }
        } catch (error) {
            throw createCatalogInternalError(
                `Catalog variant image persistence cleanup failed for variant: ${variant._id}`,
                {
                    variantId: parsedParams.variantId,
                    mediaId: parsedParams.mediaId,
                    productId: product._id.toHexString(),
                    storagePath: media.storagePath,
                    reason:
                        error?.message ??
                        "Unknown variant image persistence cleanup error",
                }
            );
        }

        return media;
    };
}
