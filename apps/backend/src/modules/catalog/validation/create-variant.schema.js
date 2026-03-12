import { z } from "zod";
import { VARIANT_STATUSES } from "../models/index.js";
import { assertVariantPricingInvariant } from "../utils/catalog-invariants.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeProductGroupCode,
    normalizeSku,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
const productGroupCodeSchema = z.preprocess(
    normalizeProductGroupCode,
    z.string().min(1)
);
const skuSchema = z.preprocess(normalizeSku, z.string().min(1));
const optionalTrimmedStringSchema = z.preprocess(
    trimNullableTextInput,
    z.string().min(1).optional().nullable()
);
const nonNegativeIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().nonnegative()
);
const nonNegativeNumberSchema = z.preprocess(
    coerceNumberInput,
    z.number().nonnegative()
);

export const VARIANT_ATTRIBUTES_INPUT_SCHEMA = z
    .object({
        ram: trimmedStringSchema,
        rom: trimmedStringSchema,
        color: trimmedStringSchema,
    })
    .strict();

export const VARIANT_VIDEO_INPUT_SCHEMA = z.union([
    trimmedStringSchema,
    z
        .object({
            url: trimmedStringSchema,
            thumbnailUrl: optionalTrimmedStringSchema,
        })
        .strict(),
]);

export const CREATE_VARIANT_INPUT_SCHEMA = z
    .object({
        productGroupCode: productGroupCodeSchema,
        sku: skuSchema,
        variantAttributes: VARIANT_ATTRIBUTES_INPUT_SCHEMA,
        ramSort: nonNegativeIntegerSchema.default(0),
        romSort: nonNegativeIntegerSchema.default(0),
        colorPriority: nonNegativeIntegerSchema.default(0),
        variantSortOrder: nonNegativeIntegerSchema.default(0),
        isPrimaryColor: z
            .preprocess(coerceBooleanInput, z.boolean())
            .default(false),
        originalPrice: nonNegativeNumberSchema,
        salePrice: nonNegativeNumberSchema,
        currency: trimmedStringSchema.default("VND"),
        video: VARIANT_VIDEO_INPUT_SCHEMA.optional(),
        status: z.enum(VARIANT_STATUSES).default("active"),
    })
    .strict()
    .superRefine((value, ctx) => {
        try {
            assertVariantPricingInvariant(value);
        } catch (error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["salePrice"],
                message: error.message,
            });
        }
    });

export function parseCreateVariantInput(input) {
    return CREATE_VARIANT_INPUT_SCHEMA.parse(input);
}
