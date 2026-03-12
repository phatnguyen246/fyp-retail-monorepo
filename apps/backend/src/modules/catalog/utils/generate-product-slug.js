import removeAccents from "remove-accents";
import slugify from "slugify";
import { normalizeTitle } from "./catalog-field-normalizers.js";

export function generateProductSlug(title) {
    const normalizedTitle = normalizeTitle(title);

    if (typeof normalizedTitle !== "string" || normalizedTitle.length === 0) {
        throw new Error("Catalog requires title to generate a product slug");
    }

    return slugify(removeAccents(normalizedTitle), {
        lower: true,
        strict: true,
        trim: true,
    });
}
