import { createCatalogValidation } from "../validation/index.js";
import {
    buildProductAdminDetail,
    loadProductOrThrow,
    normalizeActorId,
} from "./catalog-admin.service-helpers.js";

export function createSoftDeleteProductService({
    productRepository,
    variantRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function softDeleteCatalogProduct({
        productId,
        actorId,
    } = {}) {
        const parsedParams = validation.parseProductIdParams({ productId });
        const currentProduct = await loadProductOrThrow({
            productRepository,
            productId: parsedParams.productId,
        });
        const deletedAt =
            currentProduct.deletedAt instanceof Date
                ? currentProduct.deletedAt
                : new Date();

        if (currentProduct.isDeleted !== true) {
            await productRepository.softDeleteProductById({
                productId: parsedParams.productId,
                deletedAt,
                updatedAt: deletedAt,
                updatedBy: normalizeActorId(actorId),
            });
        }

        await variantRepository.softDeleteVariantsByProductId({
            productId: parsedParams.productId,
            deletedAt,
            updatedAt: deletedAt,
        });
        await rebuildProductDerivedFields({
            productId: parsedParams.productId,
        });

        return buildProductAdminDetail({
            productRepository,
            variantRepository,
            productId: parsedParams.productId,
        });
    };
}
