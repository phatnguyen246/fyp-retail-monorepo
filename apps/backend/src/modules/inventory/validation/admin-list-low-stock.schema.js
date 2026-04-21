import { z } from "zod";
import {
    coerceIntegerInput,
    trimTextInput,
} from "../../catalog/validation/catalog.normalizers.js";

const ADMIN_INVENTORY_SORT_FIELDS = [
    "stockQuantity",
    "updatedAt",
    "lowStockThreshold",
];
const ADMIN_INVENTORY_SORT_ORDERS = ["asc", "desc"];

const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);

export const ADMIN_LIST_LOW_STOCK_QUERY_SCHEMA = z
    .object({
        q: z.string().optional(),
        stockState: z.enum(["all", "low", "out"]).default("all"),
        page: positiveIntegerSchema.default(1),
        limit: positiveIntegerSchema.default(20),
        sortBy: z.enum(ADMIN_INVENTORY_SORT_FIELDS).default("stockQuantity"),
        sortOrder: z.enum(ADMIN_INVENTORY_SORT_ORDERS).default("asc"),
    })
    .strict();

export function parseAdminListLowStockQuery(input) {
    return ADMIN_LIST_LOW_STOCK_QUERY_SCHEMA.parse(input);
}
