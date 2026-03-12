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

export function parseProductIdParams(input) {
    return PRODUCT_ID_PARAMS_SCHEMA.parse(input);
}

export function parseVariantIdParams(input) {
    return VARIANT_ID_PARAMS_SCHEMA.parse(input);
}
