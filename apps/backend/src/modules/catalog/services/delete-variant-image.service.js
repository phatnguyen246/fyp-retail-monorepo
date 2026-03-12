import { createCatalogValidation } from "../validation/index.js";
import {
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

        if (!media || media.variantId.toHexString() !== variant._id.toHexString()) {
            throw createCatalogNotFoundError(
                `Catalog variant image not found: ${parsedParams.mediaId}`,
                {
                    variantId: parsedParams.variantId,
                    mediaId: parsedParams.mediaId,
                }
            );
        }

        await variantRepository.removeMediaId({
            variantId: variant._id,
            mediaId: media._id,
        });

        try {
            await mediaRepository.deleteMediaById({
                mediaId: media._id,
            });
        } catch (error) {
            await variantRepository.addMediaId({
                variantId: variant._id,
                mediaId: media._id,
            });

            throw error;
        }

        try {
            await storage.deleteVariantImage(media.storagePath);
        } catch (error) {
            let recreatedMedia = false;

            try {
                await mediaRepository.createMedia({
                    document: media,
                });
                recreatedMedia = true;
                await variantRepository.addMediaId({
                    variantId: variant._id,
                    mediaId: media._id,
                });
            } catch (_restoreError) {
                if (recreatedMedia) {
                    try {
                        await mediaRepository.deleteMediaById({
                            mediaId: media._id,
                        });
                    } catch (_cleanupRestoreError) {
                        // Preserve the original storage deletion failure.
                    }
                }

                // Preserve the original storage deletion failure.
            }

            throw error;
        }

        return media;
    };
}
