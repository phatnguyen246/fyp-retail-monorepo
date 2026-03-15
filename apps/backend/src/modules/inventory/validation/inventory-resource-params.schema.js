import { z } from "zod";
import { objectIdStringSchema } from "./shared.schema.js";

export const INVENTORY_VARIANT_ID_PARAMS_SCHEMA = z
    .object({
        variantId: objectIdStringSchema("variantId"),
    })
    .strict();

export function parseInventoryVariantIdParams(input) {
    return INVENTORY_VARIANT_ID_PARAMS_SCHEMA.parse(input);
}
