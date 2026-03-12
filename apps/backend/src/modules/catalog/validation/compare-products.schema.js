import { z } from "zod";
import { isValidObjectId } from "../utils/object-id.js";

const productIdSchema = z
    .string()
    .min(1)
    .refine((value) => isValidObjectId(value), {
        message: "Catalog compare requires productIds to contain valid ObjectIds",
    });

export const COMPARE_PRODUCTS_INPUT_SCHEMA = z
    .object({
        productIds: z
            .array(productIdSchema)
            .min(1, "Catalog compare requires at least one productId")
            .max(3, "Catalog compare supports at most 3 productIds"),
    })
    .strict()
    .superRefine((value, ctx) => {
        const uniqueIds = new Set(value.productIds);

        if (uniqueIds.size !== value.productIds.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["productIds"],
                message: "Catalog compare requires unique productIds",
            });
        }
    });

export function parseCompareProductsInput(input) {
    return COMPARE_PRODUCTS_INPUT_SCHEMA.parse(input);
}
