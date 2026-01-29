import { CatalogDomainErrors } from "../errors/index.js";

export function createSku(raw) {
    const sku = String(raw ?? "").trim();
    if (!sku) {
        throw CatalogDomainErrors.VARIANT_SKU_REQUIRED();
    }
    return sku;
}
