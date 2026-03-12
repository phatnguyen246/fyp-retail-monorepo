import { z } from "zod";
import { CATALOG_PRODUCT_IMPORT_FORM_FIELD } from "../constants/index.js";

export const IMPORT_PRODUCTS_FILE_SCHEMA = z
    .object({
        fieldname: z
            .string()
            .refine(
                (value) => value === CATALOG_PRODUCT_IMPORT_FORM_FIELD,
                `Catalog import file field must be ${CATALOG_PRODUCT_IMPORT_FORM_FIELD}`
            ),
        originalname: z
            .string()
            .min(1)
            .refine(
                (value) => value.toLowerCase().endsWith(".csv"),
                "Catalog import requires a .csv file"
            ),
        mimetype: z.string().min(1).optional(),
        size: z.number().int().positive(),
        buffer: z.instanceof(Buffer),
    })
    .passthrough();

export function parseImportProductsFile(input) {
    return IMPORT_PRODUCTS_FILE_SCHEMA.parse(input);
}
