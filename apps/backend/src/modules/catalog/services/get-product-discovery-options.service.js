import { createCatalogValidation } from "../validation/index.js";
import { createStorefrontProductVisibilityFilter } from "./catalog-storefront.service-helpers.js";

const DEFAULT_DISCOVERY_PRICE_STEP = 500000;
const DEFAULT_DISCOVERY_PRICE_MIN = 0;
const DEFAULT_DISCOVERY_PRICE_MAX = 60000000;
const STOREFRONT_SORT_MODES = Object.freeze([
    {
        label: "Mới nhất",
        value: "newest",
    },
    {
        label: "Giá tăng dần",
        value: "price_asc",
    },
    {
        label: "Giá giảm dần",
        value: "price_desc",
    },
]);

export function createGetProductDiscoveryOptionsService({
    productRepository,
    referenceRepository,
    validation = createCatalogValidation(),
    variantRepository,
} = {}) {
    return async function getProductDiscoveryOptions({ query } = {}) {
        const parsedQuery = validation.parseListProductsQuery({
            categoryCode: query?.categoryCode ?? query?.category,
            productType: query?.productType,
            page: 1,
            limit: 1,
        });
        const productFilter = createStorefrontProductVisibilityFilter();

        if (parsedQuery.productType) {
            productFilter.productType = parsedQuery.productType;
        }

        if (parsedQuery.categoryCode) {
            const category = await referenceRepository.findCategoryByCode({
                code: parsedQuery.categoryCode,
                projection: {
                    _id: 1,
                },
            });

            if (!category) {
                return {
                    data: createEmptyDiscoveryOptions(),
                };
            }

            productFilter.categoryId = category._id;
        }

        const products = await productRepository.findProductsByFilter({
            filter: productFilter,
            projection: {
                _id: 1,
                brandId: 1,
                tagIds: 1,
                minSalePrice: 1,
            },
        });

        if (products.length === 0) {
            return {
                data: createEmptyDiscoveryOptions(),
            };
        }

        const brandIds = collectUniqueIds(products.map((product) => product.brandId));
        const tagIds = collectUniqueIds(products.flatMap((product) => product.tagIds ?? []));
        const [brands, tags, variants] = await Promise.all([
            brandIds.length > 0
                ? referenceRepository.findBrandsByIds({
                      brandIds,
                  })
                : Promise.resolve([]),
            tagIds.length > 0
                ? referenceRepository.findTagsByIds({
                      tagIds,
                  })
                : Promise.resolve([]),
            variantRepository.findVariantsByProductIds({
                productIds: products.map((product) => product._id),
                projection: {
                    _id: 1,
                    status: 1,
                    isDeleted: 1,
                    variantAttributes: 1,
                },
            }),
        ]);
        const activeVariants = variants.filter(
            (variant) => variant?.status === "active" && variant?.isDeleted !== true
        );

        return {
            data: {
                brands: brands
                    .map((brand) => mapReferenceOption(brand))
                    .filter(Boolean)
                    .sort(compareOptionLabel),
                tags: tags
                    .map((tag) => mapReferenceOption(tag))
                    .filter(Boolean)
                    .sort(compareOptionLabel),
                ram: createMemoryOptions({
                    values: activeVariants.map(
                        (variant) => variant?.variantAttributes?.ram
                    ),
                }),
                rom: createMemoryOptions({
                    values: activeVariants.map(
                        (variant) => variant?.variantAttributes?.rom
                    ),
                }),
                colors: createStringOptions({
                    values: activeVariants.map(
                        (variant) => variant?.variantAttributes?.color
                    ),
                }),
                sortModes: STOREFRONT_SORT_MODES,
                priceBounds: createDiscoveryPriceBounds(products),
            },
        };
    };
}

function createEmptyDiscoveryOptions() {
    return {
        brands: [],
        tags: [],
        ram: [],
        rom: [],
        colors: [],
        sortModes: STOREFRONT_SORT_MODES,
        priceBounds: {
            min: DEFAULT_DISCOVERY_PRICE_MIN,
            max: DEFAULT_DISCOVERY_PRICE_MAX,
            step: DEFAULT_DISCOVERY_PRICE_STEP,
        },
    };
}

function collectUniqueIds(values = []) {
    const uniqueIds = new Map();

    for (const value of values) {
        const normalizedValue =
            value && typeof value.toHexString === "function"
                ? value.toHexString()
                : typeof value === "string"
                  ? value
                  : null;

        if (!normalizedValue || uniqueIds.has(normalizedValue)) {
            continue;
        }

        uniqueIds.set(normalizedValue, value);
    }

    return [...uniqueIds.values()];
}

function mapReferenceOption(entity) {
    if (!entity?.code || !entity?.name) {
        return null;
    }

    return {
        label: entity.name,
        value: entity.code,
    };
}

function createMemoryOptions({ values = [] } = {}) {
    return createStringOptions({
        values,
        labelFormatter: formatMemoryLabel,
        comparator: compareMemoryOption,
    });
}

function createStringOptions({
    values = [],
    labelFormatter = (value) => value,
    comparator = compareOptionLabel,
} = {}) {
    const uniqueValues = new Set();

    for (const value of values) {
        if (typeof value !== "string" || value.trim().length === 0) {
            continue;
        }

        uniqueValues.add(value.trim());
    }

    return [...uniqueValues]
        .map((value) => ({
            label: labelFormatter(value),
            value,
        }))
        .sort(comparator);
}

function formatMemoryLabel(value) {
    const match = value.match(/^(\d+)([A-Za-z]+)$/);

    if (!match) {
        return value;
    }

    return `${match[1]} ${match[2].toUpperCase()}`;
}

function compareOptionLabel(leftOption, rightOption) {
    return leftOption.label.localeCompare(rightOption.label, "vi");
}

function compareMemoryOption(leftOption, rightOption) {
    return (
        extractMemoryMagnitude(leftOption.value) -
            extractMemoryMagnitude(rightOption.value) ||
        compareOptionLabel(leftOption, rightOption)
    );
}

function extractMemoryMagnitude(value) {
    const match = typeof value === "string" ? value.match(/^(\d+)(TB|GB)$/i) : null;

    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }

    const amount = Number(match[1]);

    if (!Number.isFinite(amount)) {
        return Number.MAX_SAFE_INTEGER;
    }

    return match[2].toUpperCase() === "TB" ? amount * 1024 : amount;
}

function createDiscoveryPriceBounds(products = []) {
    const priceValues = products
        .map((product) => product?.minSalePrice)
        .filter((value) => typeof value === "number" && Number.isFinite(value));

    if (priceValues.length === 0) {
        return {
            min: DEFAULT_DISCOVERY_PRICE_MIN,
            max: DEFAULT_DISCOVERY_PRICE_MAX,
            step: DEFAULT_DISCOVERY_PRICE_STEP,
        };
    }

    return {
        min: DEFAULT_DISCOVERY_PRICE_MIN,
        max: Math.max(
            roundUpPrice(Math.max(...priceValues), DEFAULT_DISCOVERY_PRICE_STEP),
            DEFAULT_DISCOVERY_PRICE_STEP
        ),
        step: DEFAULT_DISCOVERY_PRICE_STEP,
    };
}

function roundUpPrice(value, step) {
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_DISCOVERY_PRICE_MAX;
    }

    return Math.ceil(value / step) * step;
}
