import { z } from "zod";
import { nonNegativeIntegerSchema } from "./shared.schema.js";

export const UPDATE_INVENTORY_RECORD_INPUT_SCHEMA = z
    .object({
        stockQuantity: nonNegativeIntegerSchema.optional(),
        lowStockThreshold: nonNegativeIntegerSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message:
            "Inventory update input requires at least one mutable field",
    });

export function parseUpdateInventoryRecordInput(input) {
    return UPDATE_INVENTORY_RECORD_INPUT_SCHEMA.parse(input);
}
