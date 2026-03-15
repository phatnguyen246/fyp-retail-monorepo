import { createCatalogValidation } from "../validation/index.js";
import { createStorefrontProductDiscoveryExecutor } from "./list-products.service.js";

export function createSearchProductsService({
    inventoryAdapter,
    mediaRepository,
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    const executeStorefrontProductDiscovery = createStorefrontProductDiscoveryExecutor(
        {
            inventoryAdapter,
            mediaRepository,
            productRepository,
            referenceRepository,
            variantRepository,
            logger,
        }
    );

    return async function searchProducts({ query } = {}) {
        const parsedQuery = validation.parseSearchProductsQuery(query ?? {});

        return executeStorefrontProductDiscovery({
            parsedQuery,
        });
    };
}
