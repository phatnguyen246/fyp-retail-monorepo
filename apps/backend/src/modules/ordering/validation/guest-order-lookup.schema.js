import { z } from "zod";
import { requiredTextSchema } from "./shared.schema.js";

export const GUEST_ORDER_LOOKUP_INPUT_SCHEMA = z
    .object({
        orderCode: requiredTextSchema("orderCode"),
    })
    .strict();

export function parseGuestOrderLookupInput(input) {
    return GUEST_ORDER_LOOKUP_INPUT_SCHEMA.parse(input);
}
