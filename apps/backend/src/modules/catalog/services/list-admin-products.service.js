import { createCatalogValidation } from "../validation/index.js";
import { buildPaginationMeta } from "./catalog-storefront.service-helpers.js";

function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

function createEntityMap(entities = []) {
    const entityMap = new Map();

    for (const entity of entities) {
        const entityId = toIdString(entity?._id);

        if (!entityId) {
            continue;
        }

        entityMap.set(entityId, entity);
    }

    return entityMap;
}

function mapReferenceEntity(entity) {
    if (!entity) {
        return null;
    }

    return {
        _id: entity._id,
        code: entity.code,
        name: entity.name,
    };
}

async function hydrateAdminProductListReferences({
    referenceRepository,
    products = [],
} = {}) {
    const brandIds = new Set();
    const categoryIds = new Set();

    for (const product of products) {
        const brandId = toIdString(product?.brandId);
        const categoryId = toIdString(product?.categoryId);

        if (brandId) {
            brandIds.add(brandId);
        }

        if (categoryId) {
            categoryIds.add(categoryId);
        }
    }

    const [brands, categories] = await Promise.all([
        referenceRepository.findBrandsByIds({
            brandIds: [...brandIds],
        }),
        referenceRepository.findCategoriesByIds({
            categoryIds: [...categoryIds],
        }),
    ]);

    return {
        brandMap: createEntityMap(brands),
        categoryMap: createEntityMap(categories),
    };
}

function buildAdminProductListItem({
    product,
    references,
} = {}) {
    return {
        _id: product._id,
        productGroupCode: product.productGroupCode,
        title: product.title,
        productType: product.productType,
        status: product.status,
        isDeleted: product.isDeleted === true,
        deletedAt: product.deletedAt ?? null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        shortDescription: product.shortDescription ?? null,
        badges: Array.isArray(product.badges) ? product.badges : [],
        contactWhenOutOfStock: product.contactWhenOutOfStock === true,
        brand: mapReferenceEntity(
            references.brandMap.get(toIdString(product.brandId))
        ),
        category: mapReferenceEntity(
            references.categoryMap.get(toIdString(product.categoryId))
        ),
        defaultSelectedVariantId: product.defaultSelectedVariantId ?? null,
        listingVariantSnapshot: product.listingVariantSnapshot ?? null,
        minSalePrice: product.minSalePrice ?? null,
        minOriginalPrice: product.minOriginalPrice ?? null,
        hasActiveVariants: product.hasActiveVariants === true,
        hasInStockVariants: product.hasInStockVariants === true,
    };
}

function createAdminProductListFilter(query = {}) {
    const filter = {};

    if (query.deleted === "true") {
        filter.isDeleted = true;
    } else if (query.deleted === "false") {
        filter.isDeleted = {
            $ne: true,
        };
    }

    if (query.status) {
        filter.status = query.status;
    }

    if (query.q && typeof query.q === "string" && query.q.trim().length > 0) {
        const searchRegex = new RegExp(query.q.trim(), "i");
        filter.$or = [
            { title: searchRegex },
            { productGroupCode: searchRegex },
            { searchTitle: searchRegex },
            { "listingVariantSnapshot.sku": searchRegex },
        ];
    }

    return filter;
}

function createAdminProductListSort(query = {}) {
    const direction = query.sortOrder === "asc" ? 1 : -1;

    return {
        [query.sortBy]: direction,
        _id: direction,
    };
}

export function createListAdminProductsService({
    productRepository,
    referenceRepository,
    validation = createCatalogValidation(),
} = {}) {
    return async function listAdminProducts({ query } = {}) {
        const parsedQuery = validation.parseAdminListProductsQuery(query ?? {});
        const filter = createAdminProductListFilter(parsedQuery);
        const sort = createAdminProductListSort(parsedQuery);
        const skip = (parsedQuery.page - 1) * parsedQuery.limit;
        const projection = {
            productGroupCode: 1,
            title: 1,
            productType: 1,
            status: 1,
            isDeleted: 1,
            deletedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            shortDescription: 1,
            badges: 1,
            contactWhenOutOfStock: 1,
            brandId: 1,
            categoryId: 1,
            defaultSelectedVariantId: 1,
            listingVariantSnapshot: 1,
            minSalePrice: 1,
            minOriginalPrice: 1,
            hasActiveVariants: 1,
            hasInStockVariants: 1,
        };
        const [products, total] = await Promise.all([
            productRepository.findProductsByFilter({
                filter,
                projection,
                sort,
                skip,
                limit: parsedQuery.limit,
            }),
            productRepository.countProductsByFilter({
                filter,
            }),
        ]);
        const references = await hydrateAdminProductListReferences({
            referenceRepository,
            products,
        });

        return {
            data: products.map((product) =>
                buildAdminProductListItem({
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
