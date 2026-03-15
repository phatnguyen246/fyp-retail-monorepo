import { z } from "zod";
import { PRODUCT_STATUSES, PRODUCT_TYPES } from "../models/index.js";
import {
    collapseWhitespaceTextInput,
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeCsvStringArrayInput,
    normalizeKeyword,
    normalizeTagCode,
} from "./catalog.normalizers.js";

const PRODUCT_DISCOVERY_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "title",
    "minSalePrice",
];
const PRODUCT_DISCOVERY_SORT_MODES = [
    "newest",
    "price_asc",
    "price_desc",
];
const PRODUCT_DISCOVERY_SORT_ORDERS = ["asc", "desc"];
const PRODUCT_DISCOVERY_SORT_VALUES = PRODUCT_DISCOVERY_SORT_FIELDS.flatMap(
    (fieldName) =>
        PRODUCT_DISCOVERY_SORT_ORDERS.map((sortOrder) => `${fieldName}:${sortOrder}`)
);

const keywordSchema = z.preprocess(normalizeKeyword, z.string().min(1));
const compactStringSchema = z.preprocess(
    collapseWhitespaceTextInput,
    z.string().min(1)
);
const brandCodeSchema = z.preprocess(normalizeBrandCode, z.string().min(1));
const categoryCodeSchema = z.preprocess(
    normalizeCategoryCode,
    z.string().min(1)
);
const tagCodeSchema = z.preprocess(normalizeTagCode, z.string().min(1));
const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);
const nonNegativeNumberSchema = z.preprocess(
    coerceNumberInput,
    z.number().nonnegative()
);
const sortModeSchema = z.enum(PRODUCT_DISCOVERY_SORT_MODES);
const sortFieldSchema = z.enum(PRODUCT_DISCOVERY_SORT_FIELDS);
const sortOrderSchema = z.enum(PRODUCT_DISCOVERY_SORT_ORDERS);
const sortSchema = z.enum(PRODUCT_DISCOVERY_SORT_VALUES);

function mapSortModeToSortConfig(sortMode) {
    switch (sortMode) {
        case "newest":
            return {
                sort: "createdAt:desc",
                sortBy: "createdAt",
                sortOrder: "desc",
            };
        case "price_asc":
            return {
                sort: "minSalePrice:asc",
                sortBy: "minSalePrice",
                sortOrder: "asc",
            };
        case "price_desc":
            return {
                sort: "minSalePrice:desc",
                sortBy: "minSalePrice",
                sortOrder: "desc",
            };
        default:
            return null;
    }
}

function resolveSortMode({ sort, sortBy, sortOrder } = {}) {
    if (sort === "createdAt:desc" || (sortBy === "createdAt" && sortOrder === "desc")) {
        return "newest";
    }

    if (
        sort === "minSalePrice:asc" ||
        (sortBy === "minSalePrice" && sortOrder === "asc")
    ) {
        return "price_asc";
    }

    if (
        sort === "minSalePrice:desc" ||
        (sortBy === "minSalePrice" && sortOrder === "desc")
    ) {
        return "price_desc";
    }

    return null;
}

function createProductDiscoverySort({
    sortMode,
    sort,
    sortBy,
    sortOrder,
} = {}) {
    if (sortMode) {
        return {
            sortMode,
            ...mapSortModeToSortConfig(sortMode),
        };
    }

    if (sort) {
        const [resolvedSortBy, resolvedSortOrder] = sort.split(":");

        return {
            sortMode: resolveSortMode({
                sort,
                sortBy: resolvedSortBy,
                sortOrder: resolvedSortOrder,
            }),
            sort,
            sortBy: resolvedSortBy,
            sortOrder: resolvedSortOrder,
        };
    }

    const resolvedSortBy = sortBy ?? "createdAt";
    const resolvedSortOrder = sortOrder ?? "desc";

    return {
        sortMode: resolveSortMode({
            sortBy: resolvedSortBy,
            sortOrder: resolvedSortOrder,
        }),
        sort: `${resolvedSortBy}:${resolvedSortOrder}`,
        sortBy: resolvedSortBy,
        sortOrder: resolvedSortOrder,
    };
}

function combineUniqueValues(primaryValues = [], secondaryValues = []) {
    const normalizedValues = new Set();

    for (const value of [...primaryValues, ...secondaryValues]) {
        if (typeof value === "string" && value.length > 0) {
            normalizedValues.add(value);
        }
    }

    return [...normalizedValues];
}

function createCanonicalProductDiscoveryQuery(value) {
    const keyword = value.keyword ?? value.q;
    const brandCode = value.brandCode ?? value.brand;
    const categoryCode = value.categoryCode ?? value.category;
    const tagCodes = combineUniqueValues(value.tagCodes, value.tags);
    const limit = value.limit ?? value.pageSize ?? 20;
    const sortConfig = createProductDiscoverySort(value);

    return {
        keyword,
        q: keyword,
        status: value.status,
        productType: value.productType,
        brandCode,
        categoryCode,
        ram: value.ram,
        rom: value.rom,
        color: value.color,
        tagCodes,
        minPrice: value.minPrice,
        maxPrice: value.maxPrice,
        page: value.page ?? 1,
        limit,
        pageSize: limit,
        sortMode: sortConfig.sortMode,
        sort: sortConfig.sort,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
        includeDeleted: value.includeDeleted ?? false,
    };
}

export const PRODUCT_DISCOVERY_QUERY_SCHEMA = z
    .object({
        q: keywordSchema.optional(),
        keyword: keywordSchema.optional(),
        status: z.enum(PRODUCT_STATUSES).optional(),
        productType: z.enum(PRODUCT_TYPES).optional(),
        brandCode: brandCodeSchema.optional(),
        brand: brandCodeSchema.optional(),
        categoryCode: categoryCodeSchema.optional(),
        category: categoryCodeSchema.optional(),
        ram: z
            .preprocess(normalizeCsvStringArrayInput, z.array(compactStringSchema))
            .default([]),
        rom: z
            .preprocess(normalizeCsvStringArrayInput, z.array(compactStringSchema))
            .default([]),
        color: z
            .preprocess(normalizeCsvStringArrayInput, z.array(compactStringSchema))
            .default([]),
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(tagCodeSchema))
            .default([]),
        tags: z
            .preprocess(normalizeCsvStringArrayInput, z.array(tagCodeSchema))
            .default([]),
        minPrice: nonNegativeNumberSchema.optional(),
        maxPrice: nonNegativeNumberSchema.optional(),
        page: positiveIntegerSchema.default(1),
        limit: positiveIntegerSchema.optional(),
        pageSize: positiveIntegerSchema.optional(),
        includeDeleted: z
            .preprocess(coerceBooleanInput, z.boolean())
            .default(false),
        sortMode: sortModeSchema.optional(),
        sort: sortSchema.optional(),
        sortBy: sortFieldSchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (value.keyword && value.q && value.keyword !== value.q) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["keyword"],
                message: "Catalog keyword must match q when both are provided",
            });
        }

        if (value.brand && value.brandCode && value.brand !== value.brandCode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["brand"],
                message: "Catalog brand must match brandCode when both are provided",
            });
        }

        if (
            value.category &&
            value.categoryCode &&
            value.category !== value.categoryCode
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["category"],
                message:
                    "Catalog category must match categoryCode when both are provided",
            });
        }

        if (
            value.sort &&
            (value.sortBy || value.sortOrder) &&
            value.sort !== createProductDiscoverySort(value).sort
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sort"],
                message:
                    "Catalog sort must match sortBy and sortOrder when both styles are provided",
            });
        }

        if (
            typeof value.minPrice === "number" &&
            typeof value.maxPrice === "number" &&
            value.maxPrice < value.minPrice
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["maxPrice"],
                message:
                    "Catalog maxPrice must be greater than or equal to minPrice",
            });
        }
    })
    .transform(createCanonicalProductDiscoveryQuery);

export function parseProductDiscoveryQuery(input) {
    return PRODUCT_DISCOVERY_QUERY_SCHEMA.parse(input);
}
