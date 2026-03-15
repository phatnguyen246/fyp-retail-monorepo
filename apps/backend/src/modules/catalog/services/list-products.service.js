import { createCatalogValidation } from "../validation/index.js";
import { normalizeSearchTitle } from "../utils/catalog-field-normalizers.js";
import {
    buildPaginationMeta,
    buildStorefrontListItem,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";
import { hydrateCatalogProductsWithLiveInventory } from "./catalog-live-inventory.helpers.js";

export function createListProductsService({
    inventoryAdapter,
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    return async function listProducts({ query } = {}) {
        const parsedQuery = validation.parseListProductsQuery(query ?? {});
        const resolvedFilter = await resolveStorefrontDiscoveryFilter({
            query: parsedQuery,
            productRepository,
            referenceRepository,
            variantRepository,
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
        const sort = createProductSort(parsedQuery);
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

export async function resolveStorefrontDiscoveryFilter({
    query,
    productRepository,
    referenceRepository,
    variantRepository,
    includeKeyword = false,
} = {}) {
    const baseFilter = {
        status: "active",
        isDeleted: {
            $ne: true,
        },
        hasActiveVariants: true,
    };

    if (query.productType) {
        baseFilter.productType = query.productType;
    }

    if (includeKeyword) {
        const normalizedKeyword =
            query.keyword && typeof query.keyword === "string"
                ? query.keyword
                : null;

        if (normalizedKeyword) {
            baseFilter.searchTitle = {
                $regex: escapeRegex(normalizeSearchTitle(normalizedKeyword)),
                $options: "i",
            };
        }
    }

    if (query.brandCode) {
        const brand = await referenceRepository.findBrandByCode({
            code: query.brandCode,
        });

        if (!brand) {
            return {
                noMatches: true,
            };
        }

        baseFilter.brandId = brand._id;
    }

    if (query.categoryCode) {
        const category = await referenceRepository.findCategoryByCode({
            code: query.categoryCode,
        });

        if (!category) {
            return {
                noMatches: true,
            };
        }

        baseFilter.categoryId = category._id;
    }

    if (Array.isArray(query.tagCodes) && query.tagCodes.length > 0) {
        const tags = await referenceRepository.findTagsByCodes({
            codes: query.tagCodes,
        });

        if (tags.length === 0) {
            return {
                noMatches: true,
            };
        }

        baseFilter.tagIds = {
            $in: tags.map((tag) => tag._id),
        };
    }

    if (
        query.ram.length > 0 ||
        query.rom.length > 0 ||
        typeof query.minPrice === "number" ||
        typeof query.maxPrice === "number"
    ) {
        const candidateProducts = await productRepository.findProductsByFilter({
            filter: baseFilter,
            projection: {
                _id: 1,
            },
        });
        const candidateProductIds = candidateProducts.map((product) => product._id);

        if (candidateProductIds.length === 0) {
            return {
                noMatches: true,
            };
        }

        const productIds = await variantRepository.findProductIdsByDiscovery({
            productIds: candidateProductIds,
            ram: query.ram,
            rom: query.rom,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
        });

        if (productIds.length === 0) {
            return {
                noMatches: true,
            };
        }

        baseFilter._id = {
            $in: productIds,
        };
    }

    return {
        filter: baseFilter,
        noMatches: false,
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createProductSort(query) {
    const direction = query.sortOrder === "asc" ? 1 : -1;

    return {
        [query.sortBy]: direction,
        _id: 1,
    };
}
