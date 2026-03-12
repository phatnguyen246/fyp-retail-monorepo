import { filterActiveCatalogVariants } from "../utils/filter-active-catalog-variants.js";
import { createCatalogNotFoundError } from "./catalog-service.errors.js";

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

function sortVariantsForStorefront(leftVariant, rightVariant) {
    return (
        compareAscending(leftVariant?.ramSort, rightVariant?.ramSort) ||
        compareAscending(leftVariant?.romSort, rightVariant?.romSort) ||
        compareDescendingBoolean(
            leftVariant?.isPrimaryColor,
            rightVariant?.isPrimaryColor
        ) ||
        compareAscending(
            leftVariant?.colorPriority,
            rightVariant?.colorPriority
        ) ||
        compareAscending(
            leftVariant?.variantSortOrder,
            rightVariant?.variantSortOrder
        ) ||
        compareAscendingString(toIdString(leftVariant?._id), toIdString(rightVariant?._id))
    );
}

function compareAscending(leftValue, rightValue) {
    const normalizedLeftValue =
        typeof leftValue === "number" && Number.isFinite(leftValue) ? leftValue : 0;
    const normalizedRightValue =
        typeof rightValue === "number" && Number.isFinite(rightValue) ? rightValue : 0;

    if (normalizedLeftValue < normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue > normalizedRightValue) {
        return 1;
    }

    return 0;
}

function compareDescendingBoolean(leftValue, rightValue) {
    const normalizedLeftValue = leftValue === true ? 1 : 0;
    const normalizedRightValue = rightValue === true ? 1 : 0;

    if (normalizedLeftValue > normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue < normalizedRightValue) {
        return 1;
    }

    return 0;
}

function compareAscendingString(leftValue, rightValue) {
    const normalizedLeftValue = typeof leftValue === "string" ? leftValue : "";
    const normalizedRightValue = typeof rightValue === "string" ? rightValue : "";

    if (normalizedLeftValue < normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue > normalizedRightValue) {
        return 1;
    }

    return 0;
}

function mapReferenceEntity(entity) {
    if (!entity) {
        return null;
    }

    return {
        id: toIdString(entity._id),
        code: entity.code,
        name: entity.name,
    };
}

function mapTagEntities(tagIds = [], tagMap = new Map()) {
    return tagIds
        .map((tagId) => tagMap.get(toIdString(tagId)))
        .filter(Boolean)
        .map(mapReferenceEntity);
}

function mapListingVariantSnapshot(snapshot) {
    if (!snapshot) {
        return null;
    }

    return {
        variantId: toIdString(snapshot.variantId),
        sku: snapshot.sku,
        color: snapshot.color,
        ram: snapshot.ram,
        rom: snapshot.rom,
        salePrice: snapshot.salePrice,
        originalPrice: snapshot.originalPrice,
        currency: snapshot.currency,
    };
}

function mapMediaItem(media) {
    return {
        id: toIdString(media._id),
        url: media.url,
        fileName: media.fileName,
        mimeType: media.mimeType,
        size: media.size,
        sortOrder: media.sortOrder ?? 0,
    };
}

function mapVariant(variant, mediaByVariantId = new Map()) {
    const variantId = toIdString(variant?._id);

    return {
        id: variantId,
        sku: variant.sku,
        variantAttributes: variant.variantAttributes,
        originalPrice: variant.originalPrice,
        salePrice: variant.salePrice,
        currency: variant.currency,
        video: variant.video,
        isInStock: variant.isInStock === true,
        media:
            mediaByVariantId.get(variantId)?.map(mapMediaItem) ?? [],
    };
}

function findDefaultVariant(product, variants = []) {
    const defaultVariantId = toIdString(product?.defaultSelectedVariantId);

    if (!defaultVariantId) {
        return variants[0] ?? null;
    }

    return variants.find((variant) => toIdString(variant?._id) === defaultVariantId) ?? null;
}

export function assertStorefrontProductVisible(product, { productId } = {}) {
    if (
        !product ||
        product.status !== "active" ||
        product.isDeleted === true ||
        product.hasActiveVariants !== true
    ) {
        throw createCatalogNotFoundError(
            `Catalog storefront product not found: ${productId ?? product?._id}`,
            {
                productId: productId ?? toIdString(product?._id),
            }
        );
    }
}

export async function hydrateStorefrontReferences({
    referenceRepository,
    products = [],
} = {}) {
    const brandIds = new Set();
    const categoryIds = new Set();
    const tagIds = new Set();

    for (const product of products) {
        const brandId = toIdString(product?.brandId);
        const categoryId = toIdString(product?.categoryId);

        if (brandId) {
            brandIds.add(brandId);
        }

        if (categoryId) {
            categoryIds.add(categoryId);
        }

        for (const tagId of product?.tagIds ?? []) {
            const normalizedTagId = toIdString(tagId);

            if (normalizedTagId) {
                tagIds.add(normalizedTagId);
            }
        }
    }

    const [brands, categories, tags] = await Promise.all([
        referenceRepository.findBrandsByIds({
            brandIds: [...brandIds],
        }),
        referenceRepository.findCategoriesByIds({
            categoryIds: [...categoryIds],
        }),
        referenceRepository.findTagsByIds({
            tagIds: [...tagIds],
        }),
    ]);

    return {
        brandMap: createEntityMap(brands),
        categoryMap: createEntityMap(categories),
        tagMap: createEntityMap(tags),
    };
}

export function groupMediaByVariantId(mediaList = []) {
    const mediaByVariantId = new Map();

    for (const media of mediaList) {
        const variantId = toIdString(media?.variantId);

        if (!variantId) {
            continue;
        }

        if (!mediaByVariantId.has(variantId)) {
            mediaByVariantId.set(variantId, []);
        }

        mediaByVariantId.get(variantId).push(media);
    }

    return mediaByVariantId;
}

export function buildStorefrontListItem({
    product,
    references,
} = {}) {
    return {
        id: toIdString(product._id),
        title: product.title,
        slug: product.slug,
        productType: product.productType,
        shortDescription: product.shortDescription,
        badges: product.badges,
        brand: mapReferenceEntity(
            references.brandMap.get(toIdString(product.brandId))
        ),
        category: mapReferenceEntity(
            references.categoryMap.get(toIdString(product.categoryId))
        ),
        tags: mapTagEntities(product.tagIds, references.tagMap),
        listingVariantSnapshot: mapListingVariantSnapshot(
            product.listingVariantSnapshot
        ),
        minSalePrice: product.minSalePrice,
        minOriginalPrice: product.minOriginalPrice,
        hasInStockVariants: product.hasInStockVariants === true,
    };
}

export function buildStorefrontProductDetail({
    product,
    variants = [],
    references,
    mediaByVariantId,
} = {}) {
    const activeVariants = [...filterActiveCatalogVariants(variants)].sort(
        sortVariantsForStorefront
    );

    return {
        ...buildStorefrontListItem({
            product,
            references,
        }),
        longDescription: product.longDescription,
        specs: product.specs,
        defaultSelectedVariantId: toIdString(product.defaultSelectedVariantId),
        defaultVariant: (() => {
            const defaultVariant = findDefaultVariant(product, activeVariants);

            return defaultVariant
                ? mapVariant(defaultVariant, mediaByVariantId)
                : null;
        })(),
        variants: activeVariants.map((variant) =>
            mapVariant(variant, mediaByVariantId)
        ),
    };
}

export function buildStorefrontCompareItem({
    product,
    variants = [],
    references,
} = {}) {
    const activeVariants = [...filterActiveCatalogVariants(variants)].sort(
        sortVariantsForStorefront
    );
    const defaultVariant = findDefaultVariant(product, activeVariants);

    return {
        product: {
            ...buildStorefrontListItem({
                product,
                references,
            }),
            specs: product.specs,
            defaultSelectedVariantId: toIdString(product.defaultSelectedVariantId),
        },
        defaultVariant: defaultVariant
            ? mapVariant(defaultVariant, new Map())
            : null,
    };
}

export function buildPaginationMeta({ page, limit, total } = {}) {
    return {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
}
