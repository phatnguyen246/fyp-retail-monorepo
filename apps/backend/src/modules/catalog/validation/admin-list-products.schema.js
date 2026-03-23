import { z } from "zod";
import { PRODUCT_STATUSES } from "../models/index.js";
import {
    coerceIntegerInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const ADMIN_PRODUCT_LIST_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "title",
    "status",
    "minSalePrice",
];
const ADMIN_PRODUCT_LIST_SORT_ORDERS = ["asc", "desc"];
const ADMIN_PRODUCT_LIST_DELETED_VALUES = ["false", "true", "all"];

const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);
const statusSchema = z.preprocess(trimTextInput, z.enum(PRODUCT_STATUSES));
const sortFieldSchema = z.enum(ADMIN_PRODUCT_LIST_SORT_FIELDS);
const sortOrderSchema = z.enum(ADMIN_PRODUCT_LIST_SORT_ORDERS);
const deletedSchema = z.preprocess(normalizeDeletedQueryInput, z.enum(ADMIN_PRODUCT_LIST_DELETED_VALUES));

function normalizeDeletedQueryInput(value) {
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    if (typeof value !== "string") {
        return value;
    }

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue.length === 0) {
        return undefined;
    }

    return normalizedValue;
}

export const ADMIN_LIST_PRODUCTS_QUERY_SCHEMA = z
    .object({
        status: statusSchema.optional(),
        deleted: deletedSchema.default("false"),
        page: positiveIntegerSchema.default(1),
        limit: positiveIntegerSchema.default(20),
        sortBy: sortFieldSchema.default("createdAt"),
        sortOrder: sortOrderSchema.default("desc"),
    })
    .strict();

export function parseAdminListProductsQuery(input) {
    return ADMIN_LIST_PRODUCTS_QUERY_SCHEMA.parse(input);
}
