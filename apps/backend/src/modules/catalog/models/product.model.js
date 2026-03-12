import {
    normalizeProductGroupCode,
    normalizeSearchTitle as normalizeSearchTitleValue,
    normalizeTitle,
} from "../utils/catalog-field-normalizers.js";
import { generateProductSlug } from "../utils/generate-product-slug.js";
import {
    createDocumentId,
    createSoftDeleteState,
    createTimestampPair,
    normalizeAuditActor,
    normalizeBoolean,
    normalizeNonNegativeNumber,
    normalizeObjectIdList,
    normalizeOptionalObjectId,
    normalizeOptionalString,
    normalizeRequiredObjectId,
    normalizeRequiredString,
    normalizeStringArray,
} from "./model-helpers.js";

export const PRODUCT_STATUSES = Object.freeze([
    "draft",
    "active",
    "inactive",
    "discontinued",
]);

export const PRODUCT_TYPES = Object.freeze(["smartphone"]);

export const PRODUCT_BADGE_CODES = Object.freeze([
    "new",
    "hot",
    "best_seller",
    "installment",
]);

export const SMARTPHONE_SPECS_SHAPE = Object.freeze({
    screen: Object.freeze({
        size: {
            type: "string",
            required: false,
            default: null,
            description: "Display size, for example 6.1 inches.",
        },
        technology: {
            type: "string",
            required: false,
            default: null,
            description: "Display technology, for example OLED or AMOLED.",
        },
        resolution: {
            type: "string",
            required: false,
            default: null,
            description: "Display resolution string.",
        },
        refreshRate: {
            type: "string",
            required: false,
            default: null,
            description: "Display refresh rate, for example 120Hz.",
        },
    }),
    chipset: {
        type: "string",
        required: false,
        default: null,
        description: "Product-level chipset shared by every variant.",
    },
    rearCamera: {
        type: "string",
        required: false,
        default: null,
        description: "Rear camera summary.",
    },
    frontCamera: {
        type: "string",
        required: false,
        default: null,
        description: "Front camera summary.",
    },
    battery: {
        type: "string",
        required: false,
        default: null,
        description: "Battery capacity or battery summary.",
    },
    operatingSystem: {
        type: "string",
        required: false,
        default: null,
        description: "Operating system or platform version.",
    },
    sim: {
        type: "string",
        required: false,
        default: null,
        description: "SIM support summary.",
    },
    network: {
        type: "string",
        required: false,
        default: null,
        description: "Network connectivity summary.",
    },
    charging: {
        type: "string",
        required: false,
        default: null,
        description: "Charging technology summary.",
    },
    dimensions: {
        type: "string",
        required: false,
        default: null,
        description: "Physical dimensions summary.",
    },
    weight: {
        type: "string",
        required: false,
        default: null,
        description: "Device weight summary.",
    },
    material: {
        type: "string",
        required: false,
        default: null,
        description: "Body material summary.",
    },
    waterResistance: {
        type: "string",
        required: false,
        default: null,
        description: "Water resistance rating or summary.",
    },
});

export const PRODUCT_LISTING_VARIANT_SNAPSHOT_SHAPE = Object.freeze({
    variantId: {
        type: "ObjectId",
        required: true,
        description: "Derived default variant identifier for listing views.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    sku: {
        type: "string",
        required: true,
        description: "Derived variant business key copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    color: {
        type: "string",
        required: true,
        description: "Derived color copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    ram: {
        type: "string",
        required: true,
        description: "Derived RAM copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    rom: {
        type: "string",
        required: true,
        description: "Derived storage copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    salePrice: {
        type: "number",
        required: true,
        description: "Derived sale price copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    originalPrice: {
        type: "number",
        required: true,
        description: "Derived original price copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    currency: {
        type: "string",
        required: true,
        description: "Derived currency copied from the selected variant.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
});

export const PRODUCT_DOCUMENT_SHAPE = Object.freeze({
    _id: {
        type: "ObjectId",
        required: false,
        default: "generated by createProduct()",
        description: "MongoDB technical identifier for the product document.",
    },
    productGroupCode: {
        type: "string",
        required: true,
        description:
            "Unique business key used for product import, upsert, sync, and catalog lookup.",
    },
    title: {
        type: "string",
        required: true,
        description: "Primary product title displayed across catalog experiences.",
    },
    slug: {
        type: "string",
        required: true,
        default: "computed from title by createProduct()",
        description: "Computed product slug used for canonical storefront URLs.",
        computed: true,
        readonly: true,
    },
    searchTitle: {
        type: "string",
        required: true,
        default: "computed from title by createProduct()",
        description:
            "Computed normalized title used for search-friendly matching and indexing.",
        computed: true,
        readonly: true,
    },
    brandId: {
        type: "ObjectId",
        required: true,
        description: "Resolved brand reference stored as a MongoDB ObjectId.",
    },
    categoryId: {
        type: "ObjectId",
        required: true,
        description: "Resolved category reference stored as a MongoDB ObjectId.",
    },
    productType: {
        type: "string",
        required: true,
        default: "smartphone",
        enum: PRODUCT_TYPES,
        description: "Catalog product type used to select the product-level specs shape.",
    },
    shortDescription: {
        type: "string",
        required: false,
        default: null,
        description: "Optional short description shown on listings or compact cards.",
    },
    longDescription: {
        type: "string",
        required: false,
        default: null,
        description: "Optional rich description shown on detail pages.",
    },
    tagIds: {
        type: "ObjectId[]",
        required: false,
        default: [],
        description: "Resolved tag references stored as MongoDB ObjectId values.",
    },
    badges: {
        type: "string[]",
        required: false,
        default: [],
        enum: PRODUCT_BADGE_CODES,
        description: "Internal badge codes stored directly on the product document.",
    },
    specs: {
        type: "object",
        required: true,
        default: "normalized by createSmartphoneSpecs()",
        description:
            "Product-level smartphone specs shared by every variant. RAM, ROM, and color do not belong here.",
    },
    status: {
        type: "string",
        required: true,
        default: "draft",
        enum: PRODUCT_STATUSES,
        description: "Business lifecycle status. Soft delete is tracked separately.",
    },
    contactWhenOutOfStock: {
        type: "boolean",
        required: true,
        default: false,
        description: "Allows the product page to surface contact CTA when variants are unavailable.",
    },
    defaultSelectedVariantId: {
        type: "ObjectId",
        required: false,
        default: null,
        description: "Derived default variant used for listing and detail page defaults.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    listingVariantSnapshot: {
        type: "object",
        required: false,
        default: null,
        description: "Derived variant summary copied into the product document for read optimization.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    minSalePrice: {
        type: "number",
        required: false,
        default: null,
        description: "Derived minimum sale price across active variants.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    minOriginalPrice: {
        type: "number",
        required: false,
        default: null,
        description: "Derived minimum original price across active variants.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    hasActiveVariants: {
        type: "boolean",
        required: true,
        default: false,
        description: "Derived flag that indicates whether any non-deleted active variant exists.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    hasInStockVariants: {
        type: "boolean",
        required: true,
        default: false,
        description: "Derived flag that indicates whether any active variant is in stock.",
        computed: true,
        denormalized: true,
        readonly: true,
    },
    createdAt: {
        type: "date",
        required: true,
        default: "generated by createProduct()",
        description: "Product creation timestamp.",
    },
    updatedAt: {
        type: "date",
        required: true,
        default: "mirrors createdAt unless overridden",
        description: "Product update timestamp.",
    },
    createdBy: {
        type: "string",
        required: false,
        default: null,
        description: "Optional actor identifier that created the product.",
    },
    updatedBy: {
        type: "string",
        required: false,
        default: null,
        description: "Optional actor identifier that last updated the product.",
    },
    isDeleted: {
        type: "boolean",
        required: true,
        default: false,
        description: "Soft delete source-of-truth flag. Business status never stores deleted.",
    },
    deletedAt: {
        type: "date",
        required: false,
        default: null,
        description: "Soft delete timestamp. Null when isDeleted is false.",
    },
});

export function createSmartphoneSpecs(input = {}) {
    const screenInput = normalizeOptionalPlainObject(input.screen, "specs.screen");

    return {
        screen: {
            size: normalizeOptionalString(screenInput?.size, "specs.screen.size"),
            technology: normalizeOptionalString(
                screenInput?.technology,
                "specs.screen.technology"
            ),
            resolution: normalizeOptionalString(
                screenInput?.resolution,
                "specs.screen.resolution"
            ),
            refreshRate: normalizeOptionalString(
                screenInput?.refreshRate,
                "specs.screen.refreshRate"
            ),
        },
        chipset: normalizeOptionalString(input.chipset, "specs.chipset"),
        rearCamera: normalizeOptionalString(input.rearCamera, "specs.rearCamera"),
        frontCamera: normalizeOptionalString(input.frontCamera, "specs.frontCamera"),
        battery: normalizeOptionalString(input.battery, "specs.battery"),
        operatingSystem: normalizeOptionalString(
            input.operatingSystem,
            "specs.operatingSystem"
        ),
        sim: normalizeOptionalString(input.sim, "specs.sim"),
        network: normalizeOptionalString(input.network, "specs.network"),
        charging: normalizeOptionalString(input.charging, "specs.charging"),
        dimensions: normalizeOptionalString(input.dimensions, "specs.dimensions"),
        weight: normalizeOptionalString(input.weight, "specs.weight"),
        material: normalizeOptionalString(input.material, "specs.material"),
        waterResistance: normalizeOptionalString(
            input.waterResistance,
            "specs.waterResistance"
        ),
    };
}

export function createProduct(input = {}) {
    const productType = normalizeProductType(input.productType);
    const title = normalizeRequiredString(normalizeTitle(input.title), "title");
    const { createdAt, updatedAt } = createTimestampPair(input);
    const softDeleteState = createSoftDeleteState({
        isDeleted: input.isDeleted,
        deletedAt: input.deletedAt,
        fallbackDeletedAt: updatedAt,
    });

    return {
        _id: createDocumentId(input._id, "_id"),
        productGroupCode: normalizeRequiredString(
            normalizeProductGroupCode(input.productGroupCode),
            "productGroupCode"
        ),
        title,
        slug: normalizeProductSlug(input.slug, title),
        searchTitle: normalizeSearchTitle(input.searchTitle, title),
        brandId: normalizeRequiredObjectId(input.brandId, "brandId"),
        categoryId: normalizeRequiredObjectId(input.categoryId, "categoryId"),
        productType,
        shortDescription: normalizeOptionalString(
            input.shortDescription,
            "shortDescription"
        ),
        longDescription: normalizeOptionalString(
            input.longDescription,
            "longDescription"
        ),
        tagIds: normalizeObjectIdList(input.tagIds, "tagIds"),
        badges: normalizeBadges(input.badges),
        specs:
            productType === "smartphone"
                ? createSmartphoneSpecs(input.specs)
                : createSmartphoneSpecs(),
        status: normalizeProductStatus(input.status),
        contactWhenOutOfStock: normalizeBoolean(
            input.contactWhenOutOfStock,
            "contactWhenOutOfStock",
            false
        ),
        defaultSelectedVariantId: normalizeOptionalObjectId(
            input.defaultSelectedVariantId,
            "defaultSelectedVariantId"
        ),
        listingVariantSnapshot: normalizeListingVariantSnapshot(
            input.listingVariantSnapshot
        ),
        minSalePrice: normalizeOptionalPrice(input.minSalePrice, "minSalePrice"),
        minOriginalPrice: normalizeOptionalPrice(
            input.minOriginalPrice,
            "minOriginalPrice"
        ),
        hasActiveVariants: normalizeBoolean(
            input.hasActiveVariants,
            "hasActiveVariants",
            false
        ),
        hasInStockVariants: normalizeBoolean(
            input.hasInStockVariants,
            "hasInStockVariants",
            false
        ),
        createdAt,
        updatedAt,
        createdBy: normalizeAuditActor(input.createdBy, "createdBy"),
        updatedBy: normalizeAuditActor(input.updatedBy, "updatedBy"),
        isDeleted: softDeleteState.isDeleted,
        deletedAt: softDeleteState.deletedAt,
    };
}

function normalizeProductType(value) {
    const normalizedType = value === undefined ? "smartphone" : value;

    if (!PRODUCT_TYPES.includes(normalizedType)) {
        throw new Error(
            `Catalog productType must be one of: ${PRODUCT_TYPES.join(", ")}`
        );
    }

    return normalizedType;
}

function normalizeProductStatus(value) {
    const normalizedStatus = value === undefined ? "draft" : value;

    if (!PRODUCT_STATUSES.includes(normalizedStatus)) {
        throw new Error(
            `Catalog product status must be one of: ${PRODUCT_STATUSES.join(", ")}`
        );
    }

    return normalizedStatus;
}

function normalizeProductSlug(value, title) {
    if (value !== undefined && value !== null) {
        return normalizeRequiredString(value, "slug");
    }

    return generateProductSlug(title);
}

function normalizeSearchTitle(value, title) {
    const candidateValue = value !== undefined && value !== null ? value : title;

    return normalizeRequiredString(
        normalizeSearchTitleValue(candidateValue),
        "searchTitle"
    );
}

function normalizeBadges(values) {
    const normalizedBadges = normalizeStringArray(values, "badges", {
        defaultValue: [],
    });

    for (const badge of normalizedBadges) {
        if (!PRODUCT_BADGE_CODES.includes(badge)) {
            throw new Error(
                `Catalog badges must be one of: ${PRODUCT_BADGE_CODES.join(", ")}`
            );
        }
    }

    return normalizedBadges;
}

function normalizeOptionalPrice(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeNonNegativeNumber(value, fieldName);
}

function normalizeListingVariantSnapshot(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const snapshot = normalizeOptionalPlainObject(
        value,
        "listingVariantSnapshot"
    );

    return {
        variantId: normalizeRequiredObjectId(snapshot.variantId, "listingVariantSnapshot.variantId"),
        sku: normalizeRequiredString(snapshot.sku, "listingVariantSnapshot.sku"),
        color: normalizeRequiredString(
            snapshot.color,
            "listingVariantSnapshot.color"
        ),
        ram: normalizeRequiredString(snapshot.ram, "listingVariantSnapshot.ram"),
        rom: normalizeRequiredString(snapshot.rom, "listingVariantSnapshot.rom"),
        salePrice: normalizeNonNegativeNumber(
            snapshot.salePrice,
            "listingVariantSnapshot.salePrice"
        ),
        originalPrice: normalizeNonNegativeNumber(
            snapshot.originalPrice,
            "listingVariantSnapshot.originalPrice"
        ),
        currency: normalizeRequiredString(
            snapshot.currency,
            "listingVariantSnapshot.currency"
        ),
    };
}

function normalizeOptionalPlainObject(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Catalog requires ${fieldName} to be a plain object`);
    }

    return value;
}
