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

const trimmedStringSchema = z.preprocess(trimTextInput, z.string().min(1));
const optionalTrimmedStringSchema = z.preprocess(
    trimNullableTextInput,
    z.string().min(1).optional().nullable()
);

const badgeCodesSchema = z.preprocess(
    normalizeCsvStringArrayInput,
    z.array(z.enum(PRODUCT_BADGE_CODES)).default([])
);

const tagCodesSchema = z.preprocess(
    normalizeCsvStringArrayInput,
    z.array(trimmedStringSchema).default([])
);

export const SMARTPHONE_SPECS_INPUT_SCHEMA = z
    .object({
        screen: z
            .object({
                size: optionalTrimmedStringSchema,
                technology: optionalTrimmedStringSchema,
                resolution: optionalTrimmedStringSchema,
                refreshRate: optionalTrimmedStringSchema,
            })
            .strict()
            .default({}),
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
    })
    .strict()
    .default({});

export const CREATE_PRODUCT_INPUT_SCHEMA = z
    .object({
        productGroupCode: trimmedStringSchema,
        title: trimmedStringSchema,
        brandCode: trimmedStringSchema,
        categoryCode: trimmedStringSchema,
        productType: z.enum(PRODUCT_TYPES).default("smartphone"),
        shortDescription: optionalTrimmedStringSchema,
        longDescription: optionalTrimmedStringSchema,
        tagCodes: tagCodesSchema,
        badges: badgeCodesSchema,
        specs: SMARTPHONE_SPECS_INPUT_SCHEMA,
        status: z.enum(PRODUCT_STATUSES).default("draft"),
        contactWhenOutOfStock: z
            .preprocess(coerceBooleanInput, z.boolean())
            .default(false),
    })
    .strict();

export function parseCreateProductInput(input) {
    return CREATE_PRODUCT_INPUT_SCHEMA.parse(input);
}
