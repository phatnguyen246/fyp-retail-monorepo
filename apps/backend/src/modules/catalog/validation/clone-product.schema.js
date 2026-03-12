import { z } from "zod";
import {
    normalizeProductGroupCode,
    normalizeTitle,
} from "./catalog.normalizers.js";

export const CLONE_PRODUCT_INPUT_SCHEMA = z
    .object({
        productGroupCode: z.preprocess(
            normalizeProductGroupCode,
            z.string().min(1)
        ),
        title: z.preprocess(normalizeTitle, z.string().min(1)).optional(),
    })
    .strict();

export function parseCloneProductInput(input) {
    return CLONE_PRODUCT_INPUT_SCHEMA.parse(input);
}
