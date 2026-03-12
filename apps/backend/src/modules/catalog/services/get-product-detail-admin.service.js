import { createCatalogValidation } from "../validation/index.js";
import { buildProductAdminDetail } from "./catalog-admin.service-helpers.js";

export function createGetProductDetailAdminService({
    productRepository,
    variantRepository,
    validation = createCatalogValidation(),
} = {}) {
    return async function getProductDetailAdmin({ productId } = {}) {
        const parsedParams = validation.parseProductIdParams({ productId });

        return buildProductAdminDetail({
            productRepository,
            variantRepository,
            productId: parsedParams.productId,
        });
    };
}
