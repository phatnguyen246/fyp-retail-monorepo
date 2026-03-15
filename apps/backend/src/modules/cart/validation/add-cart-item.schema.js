import { z } from "zod";
import { objectIdStringSchema, positiveIntegerSchema } from "./shared.schema.js";

export const ADD_CART_ITEM_INPUT_SCHEMA = z
    .object({
        variantId: objectIdStringSchema("variantId"),
        quantity: positiveIntegerSchema.optional().default(1),
    })
    .strict();

export function parseAddCartItemInput(input) {
    return ADD_CART_ITEM_INPUT_SCHEMA.parse(input);
}
