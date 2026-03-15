import { z } from "zod";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/index.js";
import {
    nonNegativeIntegerSchema,
    objectIdStringSchema,
} from "./shared.schema.js";

export const CREATE_INVENTORY_RECORD_INPUT_SCHEMA = z
    .object({
        variantId: objectIdStringSchema("variantId"),
        stockQuantity: nonNegativeIntegerSchema,
        lowStockThreshold: nonNegativeIntegerSchema.default(
            DEFAULT_LOW_STOCK_THRESHOLD
        ),
    })
    .strict();

export function parseCreateInventoryRecordInput(input) {
    return CREATE_INVENTORY_RECORD_INPUT_SCHEMA.parse(input);
}
