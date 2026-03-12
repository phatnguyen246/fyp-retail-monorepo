import { z } from "zod";
import { PRODUCT_STATUSES, PRODUCT_TYPES } from "../models/index.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    normalizeCsvStringArrayInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);

export const LIST_PRODUCTS_QUERY_SCHEMA = z
    .object({
        page: positiveIntegerSchema.default(1),
        pageSize: positiveIntegerSchema.default(20),
        status: z.enum(PRODUCT_STATUSES).optional(),
        productType: z.enum(PRODUCT_TYPES).optional(),
        brandCode: trimmedStringSchema.optional(),
        categoryCode: trimmedStringSchema.optional(),
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(trimmedStringSchema))
            .default([]),
        includeDeleted: z
            .preprocess(coerceBooleanInput, z.boolean())
            .default(false),
        sortBy: z
            .enum(["createdAt", "updatedAt", "title", "minSalePrice"])
            .default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict();

export function parseListProductsQuery(input) {
    return LIST_PRODUCTS_QUERY_SCHEMA.parse(input);
}
