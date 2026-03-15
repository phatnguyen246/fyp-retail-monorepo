import { z } from "zod";
import { objectIdStringSchema } from "./shared.schema.js";

export const CART_ITEM_PARAMS_SCHEMA = z
    .object({
        variantId: objectIdStringSchema("variantId"),
    })
    .strict();

export function parseCartItemParams(input) {
    return CART_ITEM_PARAMS_SCHEMA.parse(input);
}
