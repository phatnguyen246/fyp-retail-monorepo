import { createCatalogValidation } from "../validation/index.js";
import { resolveStorefrontDiscoveryFilter } from "./list-products.service.js";
import {
    buildPaginationMeta,
    buildStorefrontListItem,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";
import { hydrateCatalogProductsWithLiveInventory } from "./catalog-live-inventory.helpers.js";

export function createSearchProductsService({
    inventoryAdapter,
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    return async function searchProducts({ query } = {}) {
        const parsedQuery = validation.parseSearchProductsQuery(query ?? {});
        const resolvedFilter = await resolveStorefrontDiscoveryFilter({
            query: parsedQuery,
            productRepository,
            referenceRepository,
            variantRepository,
            includeKeyword: true,
        });

        if (resolvedFilter.noMatches) {
            return {
                data: [],
                meta: buildPaginationMeta({
                    page: parsedQuery.page,
                    limit: parsedQuery.limit,
                    total: 0,
                }),
            };
        }

        const skip = (parsedQuery.page - 1) * parsedQuery.limit;
        const sort = {
            [parsedQuery.sortBy]: parsedQuery.sortOrder === "asc" ? 1 : -1,
            _id: 1,
        };
        const [products, total] = await Promise.all([
            productRepository.findProductsByFilter({
                filter: resolvedFilter.filter,
                sort,
                skip,
                limit: parsedQuery.limit,
            }),
            productRepository.countProductsByFilter({
                filter: resolvedFilter.filter,
            }),
        ]);
        const [references, variants] = await Promise.all([
            hydrateStorefrontReferences({
                referenceRepository,
                products,
            }),
            variantRepository.findVariantsByProductIds({
                productIds: products.map((product) => product._id),
            }),
        ]);
        const { productAvailabilityById } = await hydrateCatalogProductsWithLiveInventory(
            {
                inventoryAdapter,
                products,
                variants,
                logger,
            }
        );

        return {
            data: products.map((product) =>
                buildStorefrontListItem({
                    product,
                    references,
                    hasInStockVariants:
                        productAvailabilityById.get(product._id.toHexString())
                            ?.hasInStockVariants ?? false,
                })
            ),
            meta: buildPaginationMeta({
                page: parsedQuery.page,
                limit: parsedQuery.limit,
                total,
            }),
        };
    };
}
