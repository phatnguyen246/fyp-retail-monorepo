import { z } from "zod";
import { objectIdStringSchema } from "./shared.schema.js";

export const ORDER_ID_PARAMS_SCHEMA = z
    .object({
        orderId: objectIdStringSchema("orderId"),
    })
    .strict();

export function parseOrderIdParams(input) {
    return ORDER_ID_PARAMS_SCHEMA.parse(input);
}
