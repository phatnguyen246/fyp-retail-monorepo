import { z } from "zod";
import {
    coerceIntegerInput,
    trimTextInput,
} from "../../catalog/validation/catalog.normalizers.js";

const ADMIN_ORDER_LIST_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "grandTotal",
    "itemCount",
];
const ADMIN_ORDER_LIST_SORT_ORDERS = ["asc", "desc"];

const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);

export const ADMIN_LIST_ORDERS_QUERY_SCHEMA = z
    .object({
        q: z.string().optional(),
        status: z.preprocess(trimTextInput, z.string()).optional(),
        paymentMethod: z.preprocess(trimTextInput, z.string()).optional(),
        paymentStatus: z.preprocess(trimTextInput, z.string()).optional(),
        page: positiveIntegerSchema.default(1),
        limit: positiveIntegerSchema.default(20),
        sortBy: z.enum(ADMIN_ORDER_LIST_SORT_FIELDS).default("createdAt"),
        sortOrder: z.enum(ADMIN_ORDER_LIST_SORT_ORDERS).default("desc"),
    })
    .strict();

export function parseAdminListOrdersQuery(input) {
    return ADMIN_LIST_ORDERS_QUERY_SCHEMA.parse(input);
}
