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
    normalizeProductGroupCode,
    normalizeTagCode,
    normalizeTitle,
    coerceBooleanInput,
    normalizeCsvStringArrayInput,
    trimNullableTextInput,
} from "./catalog.normalizers.js";

const titleSchema = z.preprocess(normalizeTitle, z.string().min(1));
const productGroupCodeSchema = z.preprocess(
    normalizeProductGroupCode,
    z.string().min(1)
);
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

const badgeCodesSchema = z.preprocess(
    normalizeCsvStringArrayInput,
    z.array(badgeCodeSchema).default([])
);

const tagCodesSchema = z.preprocess(
    normalizeCsvStringArrayInput,
    z.array(tagCodeSchema).default([])
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
        productGroupCode: productGroupCodeSchema,
        title: titleSchema,
        brandCode: brandCodeSchema,
        categoryCode: categoryCodeSchema,
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
        youtubeVideoUrl: optionalTrimmedStringSchema,
    })
    .strict();

export function parseCreateProductInput(input) {
    return CREATE_PRODUCT_INPUT_SCHEMA.parse(input);
}
