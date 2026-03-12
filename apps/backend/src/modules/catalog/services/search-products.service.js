import { createCatalogValidation } from "../validation/index.js";
import { resolveStorefrontDiscoveryFilter } from "./list-products.service.js";
import {
    buildPaginationMeta,
    buildStorefrontListItem,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";

export function createSearchProductsService({
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
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
        const references = await hydrateStorefrontReferences({
            referenceRepository,
            products,
        });

        return {
            data: products.map((product) =>
                buildStorefrontListItem({
                    product,
                    references,
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
