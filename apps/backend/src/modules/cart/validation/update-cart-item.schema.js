import { z } from "zod";
import { positiveIntegerSchema } from "./shared.schema.js";

export const UPDATE_CART_ITEM_INPUT_SCHEMA = z
    .object({
        quantity: positiveIntegerSchema,
    })
    .strict();

export function parseUpdateCartItemInput(input) {
    return UPDATE_CART_ITEM_INPUT_SCHEMA.parse(input);
}
