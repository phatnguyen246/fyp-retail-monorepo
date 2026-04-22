import { z } from "zod";
import {
    PRODUCT_BADGE_CODES,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
} from "../models/index.js";
import {
    normalizeBadgeCode,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeTagCode,
    normalizeTitle,
    coerceBooleanInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
} from "./catalog.normalizers.js";
import { SMARTPHONE_SPECS_INPUT_SCHEMA } from "./create-product.schema.js";

const titleSchema = z.preprocess(normalizeTitle, z.string().min(1));
const brandCodeSchema = z.preprocess(normalizeBrandCode, z.string().min(1));
const categoryCodeSchema = z.preprocess(
    normalizeCategoryCode,
    z.string().min(1)
);
const tagCodeSchema = z.preprocess(normalizeTagCode, z.string().min(1));
const badgeCodeSchema = z.preprocess(
    normalizeBadgeCode,
    z.enum(PRODUCT_BADGE_CODES)
);
const optionalTrimmedStringSchema = z.preprocess(
    trimNullableTextInput,
    z.string().min(1).optional().nullable()
);

export const UPDATE_PRODUCT_INPUT_SCHEMA = z
    .object({
        title: titleSchema.optional(),
        brandCode: brandCodeSchema.optional(),
        categoryCode: categoryCodeSchema.optional(),
        productType: z.enum(PRODUCT_TYPES).optional(),
        shortDescription: optionalTrimmedStringSchema,
        longDescription: optionalTrimmedStringSchema,
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(tagCodeSchema))
            .optional(),
        badges: z
            .preprocess(
                normalizeCsvStringArrayInput,
                z.array(badgeCodeSchema)
            )
            .optional(),
        specs: SMARTPHONE_SPECS_INPUT_SCHEMA.optional(),
        status: z.enum(PRODUCT_STATUSES).optional(),
        contactWhenOutOfStock: z
            .preprocess(coerceBooleanInput, z.boolean())
            .optional(),
        youtubeVideoUrl: optionalTrimmedStringSchema,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Catalog update product input requires at least one mutable field",
    });

export function parseUpdateProductInput(input) {
    return UPDATE_PRODUCT_INPUT_SCHEMA.parse(input);
}
