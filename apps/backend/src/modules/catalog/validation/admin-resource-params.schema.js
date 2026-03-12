import { z } from "zod";
import { isValidObjectId } from "../utils/object-id.js";

function createObjectIdParamSchema(fieldName) {
    return z
        .object({
            [fieldName]: z
                .string()
                .min(1)
                .refine((value) => isValidObjectId(value), {
                    message: `Catalog requires ${fieldName} to be a valid ObjectId`,
                }),
        })
        .strict();
}

export const PRODUCT_ID_PARAMS_SCHEMA = createObjectIdParamSchema("productId");
export const VARIANT_ID_PARAMS_SCHEMA = createObjectIdParamSchema("variantId");
export const MEDIA_ID_PARAMS_SCHEMA = createObjectIdParamSchema("mediaId");
export const VARIANT_MEDIA_PARAMS_SCHEMA = z
    .object({
        variantId: z
            .string()
            .min(1)
            .refine((value) => isValidObjectId(value), {
                message: "Catalog requires variantId to be a valid ObjectId",
            }),
        mediaId: z
            .string()
            .min(1)
            .refine((value) => isValidObjectId(value), {
                message: "Catalog requires mediaId to be a valid ObjectId",
            }),
    })
    .strict();

export function parseProductIdParams(input) {
    return PRODUCT_ID_PARAMS_SCHEMA.parse(input);
}

export function parseVariantIdParams(input) {
    return VARIANT_ID_PARAMS_SCHEMA.parse(input);
}

export function parseMediaIdParams(input) {
    return MEDIA_ID_PARAMS_SCHEMA.parse(input);
}

export function parseVariantMediaParams(input) {
    return VARIANT_MEDIA_PARAMS_SCHEMA.parse(input);
}
