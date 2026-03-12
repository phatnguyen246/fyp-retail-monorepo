import { z } from "zod";
import { isValidObjectId } from "../utils/object-id.js";
import { generateProductSlug } from "../utils/generate-product-slug.js";

export const STOREFRONT_PRODUCT_DETAIL_PARAMS_SCHEMA = z
    .object({
        productId: z
            .string()
            .min(1)
            .refine((value) => isValidObjectId(value), {
                message: "Catalog requires productId to be a valid ObjectId",
            }),
        slug: z.string().min(1).optional(),
    })
    .strict()
    .transform((value) => ({
        productId: value.productId,
        slug:
            typeof value.slug === "string"
                ? generateProductSlug(value.slug)
                : undefined,
    }));

export function parseStorefrontProductDetailParams(input) {
    return STOREFRONT_PRODUCT_DETAIL_PARAMS_SCHEMA.parse(input);
}
