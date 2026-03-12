import { createProductMediaMetadata } from "../models/index.js";
import {
    CATALOG_VARIANT_IMAGE_MAX_COUNT,
} from "../constants/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogConflictError,
    createCatalogInternalError,
    isDuplicateKeyError,
} from "./catalog-service.errors.js";
import {
    assertProductAllowsVariantMutation,
    assertVariantNotDeleted,
    assertVariantParentProductExists,
    loadVariantOrThrow,
} from "./catalog-admin.service-helpers.js";
import {
    assertVariantImageFile,
    assertVariantImageStorageAvailable,
    createStoredVariantImageFileName,
    getVariantImageSortOrder,
} from "./variant-image.service-helpers.js";

export function createUploadVariantImageService({
    productRepository,
    variantRepository,
    mediaRepository,
    storage,
    validation = createCatalogValidation(),
} = {}) {
    return async function uploadVariantImage({ variantId, file } = {}) {
        assertVariantImageStorageAvailable(storage);

        const parsedParams = validation.parseVariantIdParams({ variantId });
        assertVariantImageFile(file);

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

        const existingMedia = await mediaRepository.listMediaByVariantId({
            variantId: parsedParams.variantId,
        });

        if (existingMedia.length >= CATALOG_VARIANT_IMAGE_MAX_COUNT) {
            throw createCatalogConflictError(
                `Catalog variant already has the maximum of ${CATALOG_VARIANT_IMAGE_MAX_COUNT} images`,
                {
                    variantId: parsedParams.variantId,
                    maxImages: CATALOG_VARIANT_IMAGE_MAX_COUNT,
                }
            );
        }

        const storedFileName = createStoredVariantImageFileName(file);
        const uploadFile = {
            ...file,
            originalname: storedFileName,
        };
        let uploadedMedia;

        try {
            uploadedMedia = await storage.uploadVariantImage(uploadFile, {
                productId: product._id.toHexString(),
                variantId: variant._id.toHexString(),
            });
        } catch (error) {
            throw createCatalogInternalError(
                `Catalog variant image upload failed for variant: ${variant._id}`,
                {
                    variantId: parsedParams.variantId,
                    productId: product._id.toHexString(),
                    reason: error?.message ?? "Unknown storage upload error",
                }
            );
        }

        const media = createProductMediaMetadata({
            productId: product._id,
            variantId: variant._id,
            url: uploadedMedia.url,
            storagePath: uploadedMedia.storagePath,
            fileName: uploadedMedia.fileName,
            mimeType: uploadedMedia.mimeType,
            size: uploadedMedia.size,
            sortOrder: getVariantImageSortOrder(existingMedia),
        });

        let createdMedia = false;

        try {
            await mediaRepository.createMedia({
                document: media,
            });
            createdMedia = true;

            await variantRepository.addMediaId({
                variantId: variant._id,
                mediaId: media._id,
            });
        } catch (error) {
            if (createdMedia) {
                try {
                    await mediaRepository.deleteMediaById({
                        mediaId: media._id,
                    });
                } catch (_rollbackError) {
                    // Preserve the original failure and still attempt storage cleanup.
                }
            }

            try {
                await storage.deleteVariantImage(uploadedMedia.storagePath);
            } catch (_storageCleanupError) {
                // Preserve the original failure.
            }

            if (isDuplicateKeyError(error)) {
                throw createCatalogConflictError(
                    `Catalog media already exists for storagePath: ${media.storagePath}`,
                    {
                        storagePath: media.storagePath,
                    }
                );
            }

            throw createCatalogInternalError(
                `Catalog variant image persistence failed for variant: ${variant._id}`,
                {
                    variantId: parsedParams.variantId,
                    productId: product._id.toHexString(),
                    mediaId: media._id.toHexString(),
                    storagePath: media.storagePath,
                    reason: error?.message ?? "Unknown media persistence error",
                }
            );
        }

        return mediaRepository.findMediaById({
            mediaId: media._id,
        });
    };
}
