import { z } from "zod";
import { PRODUCT_STATUSES, PRODUCT_TYPES } from "../models/index.js";
import {
    coerceBooleanInput,
    normalizeCsvStringArrayInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));

export const SEARCH_PRODUCTS_QUERY_SCHEMA = z
    .object({
        q: trimmedStringSchema,
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
    })
    .strict();

export function parseSearchProductsQuery(input) {
    return SEARCH_PRODUCTS_QUERY_SCHEMA.parse(input);
}
