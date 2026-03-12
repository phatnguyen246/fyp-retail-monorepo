import { z } from "zod";
import {
    PRODUCT_BADGE_CODES,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
    VARIANT_STATUSES,
} from "../models/index.js";
import {
    coerceBooleanInput,
    coerceIntegerInput,
    coerceNumberInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
    trimTextInput,
} from "./catalog.normalizers.js";

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
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
        productGroupCode: trimmedStringSchema,
        title: trimmedStringSchema,
        brandCode: trimmedStringSchema,
        categoryCode: trimmedStringSchema,
        productType: z.enum(PRODUCT_TYPES).default("smartphone"),
        productStatus: z.enum(PRODUCT_STATUSES).default("draft"),
        shortDescription: optionalTrimmedStringSchema,
        longDescription: optionalTrimmedStringSchema,
        tagCodes: z
            .preprocess(normalizeCsvStringArrayInput, z.array(trimmedStringSchema))
            .default([]),
        badges: z
            .preprocess(
                normalizeCsvStringArrayInput,
                z.array(z.enum(PRODUCT_BADGE_CODES))
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
        sku: trimmedStringSchema,
        ram: trimmedStringSchema,
        rom: trimmedStringSchema,
        color: trimmedStringSchema,
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
    .strict();

export function parseImportProductRow(input) {
    return IMPORT_PRODUCT_ROW_SCHEMA.parse(input);
}
