import { z } from "zod";
import { objectIdStringSchema } from "./shared.schema.js";

export const READ_INVENTORY_BATCH_INPUT_SCHEMA = z
    .object({
        variantIds: z.array(objectIdStringSchema("variantIds")).min(1),
    })
    .strict()
    .transform((value) => ({
        variantIds: [...new Set(value.variantIds)],
    }));

export function parseReadInventoryBatchInput(input) {
    return READ_INVENTORY_BATCH_INPUT_SCHEMA.parse(input);
}
