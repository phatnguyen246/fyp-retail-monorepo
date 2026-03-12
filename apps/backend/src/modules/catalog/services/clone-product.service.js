import { createProduct } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogConflictError,
    isDuplicateKeyError,
} from "./catalog-service.errors.js";
import {
    assertProductNotDeleted,
    loadProductOrThrow,
    normalizeActorId,
} from "./catalog-admin.service-helpers.js";

export function createCloneProductService({
    productRepository,
    validation = createCatalogValidation(),
} = {}) {
    return async function cloneProduct({
        productId,
        input,
        actorId,
    } = {}) {
        const parsedParams = validation.parseProductIdParams({ productId });
        const parsedInput = validation.parseCloneProductInput(input ?? {});
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

        const sourceProduct = await loadProductOrThrow({
            productRepository,
            productId: parsedParams.productId,
        });

        assertProductNotDeleted(sourceProduct);

        const normalizedActorId = normalizeActorId(actorId);
        const clonedProduct = createProduct({
            productGroupCode: parsedInput.productGroupCode,
            title: parsedInput.title ?? sourceProduct.title,
            brandId: sourceProduct.brandId,
            categoryId: sourceProduct.categoryId,
            productType: sourceProduct.productType,
            shortDescription: sourceProduct.shortDescription,
            longDescription: sourceProduct.longDescription,
            tagIds: sourceProduct.tagIds,
            badges: sourceProduct.badges,
            specs: sourceProduct.specs,
            status: "draft",
            contactWhenOutOfStock: sourceProduct.contactWhenOutOfStock,
            createdBy: normalizedActorId,
            updatedBy: normalizedActorId,
        });

        try {
            await productRepository.createProduct({
                document: clonedProduct,
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

        return clonedProduct;
    };
}
