import { createProduct } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogConflictError,
    isDuplicateKeyError,
} from "./catalog-service.errors.js";
import {
    normalizeActorId,
    resolveProductReferences,
} from "./catalog-admin.service-helpers.js";
import { resolveProductYoutubeVideoPatch } from "./product-youtube-video.helpers.js";

export function createCreateProductService({
    productRepository,
    referenceRepository,
    validation = createCatalogValidation(),
    youtubeService,
} = {}) {
    return async function createCatalogProduct({ input, actorId } = {}) {
        const parsedInput = validation.parseCreateProductInput(input ?? {});
        const existingProduct =
            await productRepository.findProductByProductGroupCode({
                productGroupCode: parsedInput.productGroupCode,
            });

        if (existingProduct) {
            throw createCatalogConflictError(
                `Catalog productGroupCode already exists: ${parsedInput.productGroupCode}`,
                {
                    field: "productGroupCode",
                    value: parsedInput.productGroupCode,
                }
            );
        }

        const resolvedReferences = await resolveProductReferences({
            referenceRepository,
            brandCode: parsedInput.brandCode,
            categoryCode: parsedInput.categoryCode,
            tagCodes: parsedInput.tagCodes,
        });
        const youtubeVideoPatch = await resolveProductYoutubeVideoPatch({
            parsedInput,
            youtubeService,
        });
        const normalizedActorId = normalizeActorId(actorId);
        const product = createProduct({
            productGroupCode: parsedInput.productGroupCode,
            title: parsedInput.title,
            brandId: resolvedReferences.brandId,
            categoryId: resolvedReferences.categoryId,
            productType: parsedInput.productType,
            shortDescription: parsedInput.shortDescription,
            longDescription: parsedInput.longDescription,
            tagIds: resolvedReferences.tagIds,
            badges: parsedInput.badges,
            specs: parsedInput.specs,
            status: parsedInput.status,
            contactWhenOutOfStock: parsedInput.contactWhenOutOfStock,
            ...youtubeVideoPatch,
            createdBy: normalizedActorId,
            updatedBy: normalizedActorId,
        });

        try {
            await productRepository.createProduct({
                document: product,
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw createCatalogConflictError(
                    `Catalog productGroupCode already exists: ${parsedInput.productGroupCode}`,
                    {
                        field: "productGroupCode",
                        value: parsedInput.productGroupCode,
                    }
                );
            }

            throw error;
        }

        return product;
    };
}
