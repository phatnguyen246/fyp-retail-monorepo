import { z } from "zod";
import { objectIdStringSchema, requiredTextSchema } from "./shared.schema.js";

export const CREATE_ORDER_INPUT_SCHEMA = z
    .object({
        cartVariantIds: z.array(objectIdStringSchema("cartVariantIds")).min(1),
        phoneNumber: requiredTextSchema("phoneNumber"),
        shippingAddressLine: requiredTextSchema("shippingAddressLine"),
        paymentMethod: z.enum(["cod", "vnpay"]).optional().default("cod"),
    })
    .strict()
    .transform((value) => ({
        ...value,
        cartVariantIds: [...new Set(value.cartVariantIds)],
    }));

export function parseCreateOrderInput(input) {
    return CREATE_ORDER_INPUT_SCHEMA.parse(input);
}
