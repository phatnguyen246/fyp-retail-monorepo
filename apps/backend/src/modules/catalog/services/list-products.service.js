import { createCatalogValidation } from "../validation/index.js";
import { normalizeSearchTitle } from "../utils/catalog-field-normalizers.js";
import {
    buildPaginationMeta,
    buildStorefrontListItem,
    groupMediaByVariantId,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";
import { hydrateCatalogProductsWithLiveInventory } from "./catalog-live-inventory.helpers.js";

export function createStorefrontProductDiscoveryExecutor({
    inventoryAdapter,
    mediaRepository,
    productRepository,
    referenceRepository,
    variantRepository,
    logger = console,
} = {}) {
    return async function executeStorefrontProductDiscovery({ parsedQuery } = {}) {
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
        const {
            liveVariants,
            variantsByProductId,
            productAvailabilityById,
        } = await hydrateCatalogProductsWithLiveInventory({
            inventoryAdapter,
            products,
            variants,
            logger,
        });
        const mediaList =
            typeof mediaRepository?.listMediaByVariantIds === "function" &&
            liveVariants.length > 0
                ? await mediaRepository.listMediaByVariantIds({
                      variantIds: liveVariants.map((variant) => variant._id),
                  })
                : [];
        const mediaByVariantId = groupMediaByVariantId(mediaList);

        return {
            data: products.map((product) =>
                buildStorefrontListItem({
                    product,
                    references,
                    variants:
                        variantsByProductId.get(product._id.toHexString()) ?? [],
                    mediaByVariantId,
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

export function createListProductsService({
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

    return async function listProducts({ query } = {}) {
        const parsedQuery = validation.parseListProductsQuery(query ?? {});

        return executeStorefrontProductDiscovery({
            parsedQuery,
        });
    };
}

export async function resolveStorefrontDiscoveryFilter({
    query,
    productRepository,
    referenceRepository,
    variantRepository,
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

    if (query.keyword && typeof query.keyword === "string") {
        baseFilter.searchTitle = {
            $regex: escapeRegex(normalizeSearchTitle(query.keyword)),
            $options: "i",
        };
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

        if (tags.length !== query.tagCodes.length) {
            return {
                noMatches: true,
            };
        }

        baseFilter.tagIds = {
            $all: tags.map((tag) => tag._id),
        };
    }

    if (
        typeof query.minPrice === "number" ||
        typeof query.maxPrice === "number"
    ) {
        baseFilter.minSalePrice = {
            ...(typeof query.minPrice === "number"
                ? { $gte: query.minPrice }
                : {}),
            ...(typeof query.maxPrice === "number"
                ? { $lte: query.maxPrice }
                : {}),
        };
    }

    if (
        query.ram.length > 0 ||
        query.rom.length > 0 ||
        query.color.length > 0
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
            color: query.color,
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
        _id: direction,
    };
}
