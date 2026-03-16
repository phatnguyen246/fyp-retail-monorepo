import { z } from "zod";

export const UPDATE_ORDER_STATUS_INPUT_SCHEMA = z
    .object({
        orderStatus: z.enum(["confirmed", "completed"]),
    })
    .strict();

export function parseUpdateOrderStatusInput(input) {
    return UPDATE_ORDER_STATUS_INPUT_SCHEMA.parse(input);
}
