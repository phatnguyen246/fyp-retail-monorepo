import { z } from "zod";
import {
    PRODUCT_BADGE_CODES,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
} from "../models/index.js";
import {
    coerceBooleanInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";
import { SMARTPHONE_SPECS_INPUT_SCHEMA } from "./create-product.schema.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
const optionalTrimmedStringSchema = z.preprocess(
    trimNullableTextInput,
    z.string().min(1).optional().nullable()
);

export const UPDATE_PRODUCT_INPUT_SCHEMA = z
    .object({
        title: trimmedStringSchema.optional(),
        brandCode: trimmedStringSchema.optional(),
        categoryCode: trimmedStringSchema.optional(),
        productType: z.enum(PRODUCT_TYPES).optional(),
        shortDescription: optionalTrimmedStringSchema,
        longDescription: optionalTrimmedStringSchema,
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(trimmedStringSchema))
            .optional(),
        badges: z
            .preprocess(
                normalizeCsvStringArrayInput,
                z.array(z.enum(PRODUCT_BADGE_CODES))
            )
            .optional(),
        specs: SMARTPHONE_SPECS_INPUT_SCHEMA.optional(),
        status: z.enum(PRODUCT_STATUSES).optional(),
        contactWhenOutOfStock: z
            .preprocess(coerceBooleanInput, z.boolean())
            .optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Catalog update product input requires at least one mutable field",
    });

export function parseUpdateProductInput(input) {
    return UPDATE_PRODUCT_INPUT_SCHEMA.parse(input);
}
