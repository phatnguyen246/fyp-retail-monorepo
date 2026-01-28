import { CatalogErrors } from "../../application/errors/index.js";

export function createSku(raw) {
    const sku = String(raw ?? "").trim();
    if (!sku) {
        throw CatalogErrors.VARIANT_SKU_REQUIRED();
    }
    return sku;
}
