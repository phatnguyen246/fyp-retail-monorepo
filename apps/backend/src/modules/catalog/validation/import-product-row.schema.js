import { z } from "zod";
import {
    PRODUCT_BADGE_CODES,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
    VARIANT_STATUSES,
} from "../models/index.js";
import { assertVariantPricingInvariant } from "../utils/catalog-invariants.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeBadgeCode,
    normalizeBrandCode,
    normalizeCategoryCode,
    normalizeCsvStringArrayInput,
    normalizeProductGroupCode,
    normalizeSku,
    normalizeTagCode,
    normalizeTitle,
    trimNullableTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(normalizeTitle, z.string().min(1));
const productGroupCodeSchema = z.preprocess(
    normalizeProductGroupCode,
    z.string().min(1)
);
const brandCodeSchema = z.preprocess(normalizeBrandCode, z.string().min(1));
const categoryCodeSchema = z.preprocess(
    normalizeCategoryCode,
    z.string().min(1)
);
const skuSchema = z.preprocess(normalizeSku, z.string().min(1));
const tagCodeSchema = z.preprocess(normalizeTagCode, z.string().min(1));
const badgeCodeSchema = z.preprocess(
    normalizeBadgeCode,
    z.enum(PRODUCT_BADGE_CODES)
);
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

export const IMPORT_PRODUCT_ROW_SCHEMA = z
    .object({
        productGroupCode: productGroupCodeSchema,
        title: trimmedStringSchema,
        brandCode: brandCodeSchema,
        categoryCode: categoryCodeSchema,
        productType: z.enum(PRODUCT_TYPES).default("smartphone"),
        productStatus: z.enum(PRODUCT_STATUSES).default("draft"),
        shortDescription: optionalTrimmedStringSchema,
        longDescription: optionalTrimmedStringSchema,
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(tagCodeSchema))
            .default([]),
        badges: z
            .preprocess(
                normalizeCsvStringArrayInput,
                z.array(badgeCodeSchema)
            )
            .default([]),
        contactWhenOutOfStock: z
            .preprocess(coerceBooleanInput, z.boolean())
            .default(false),
        screenSize: optionalTrimmedStringSchema,
        screenTechnology: optionalTrimmedStringSchema,
        screenResolution: optionalTrimmedStringSchema,
        screenRefreshRate: optionalTrimmedStringSchema,
        chipset: optionalTrimmedStringSchema,
        rearCamera: optionalTrimmedStringSchema,
        frontCamera: optionalTrimmedStringSchema,
        battery: optionalTrimmedStringSchema,
        operatingSystem: optionalTrimmedStringSchema,
        sim: optionalTrimmedStringSchema,
        network: optionalTrimmedStringSchema,
        charging: optionalTrimmedStringSchema,
        dimensions: optionalTrimmedStringSchema,
        weight: optionalTrimmedStringSchema,
        material: optionalTrimmedStringSchema,
        waterResistance: optionalTrimmedStringSchema,
        sku: skuSchema,
        ram: trimmedStringSchema,
        rom: trimmedStringSchema,
        color: trimmedStringSchema,
        colorFullName: optionalTrimmedStringSchema,
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
        videoUrl: optionalTrimmedStringSchema,
        videoThumbnailUrl: optionalTrimmedStringSchema,
        variantStatus: z.enum(VARIANT_STATUSES).default("active"),
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

export function parseImportProductRow(input) {
    return IMPORT_PRODUCT_ROW_SCHEMA.parse(input);
}
