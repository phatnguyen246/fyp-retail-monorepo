import { z } from "zod";
import { VARIANT_STATUSES } from "../models/index.js";
import { assertVariantPricingInvariant } from "../utils/catalog-invariants.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
const nonNegativeIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().nonnegative()
);
const nonNegativeNumberSchema = z.preprocess(
    coerceNumberInput,
    z.number().nonnegative()
);

export const UPDATE_VARIANT_INPUT_SCHEMA = z
    .object({
        variantAttributes: z
            .object({
                ram: trimmedStringSchema.optional(),
                rom: trimmedStringSchema.optional(),
                color: trimmedStringSchema.optional(),
            })
            .strict()
            .optional(),
        ramSort: nonNegativeIntegerSchema.optional(),
        romSort: nonNegativeIntegerSchema.optional(),
        colorPriority: nonNegativeIntegerSchema.optional(),
        variantSortOrder: nonNegativeIntegerSchema.optional(),
        isPrimaryColor: z
            .preprocess(coerceBooleanInput, z.boolean())
            .optional(),
        originalPrice: nonNegativeNumberSchema.optional(),
        salePrice: nonNegativeNumberSchema.optional(),
        currency: trimmedStringSchema.optional(),
        video: z
            .union([
                trimmedStringSchema,
                z
                    .object({
                        url: trimmedStringSchema,
                        thumbnailUrl: trimmedStringSchema.optional().nullable(),
                    })
                    .strict(),
                z.null(),
            ])
            .optional(),
        status: z.enum(VARIANT_STATUSES).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        try {
            assertVariantPricingInvariant(value, { allowPartial: true });
        } catch (error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["salePrice"],
                message: error.message,
            });
        }
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "Catalog update variant input requires at least one mutable field",
    });

export function parseUpdateVariantInput(input) {
    return UPDATE_VARIANT_INPUT_SCHEMA.parse(input);
}
