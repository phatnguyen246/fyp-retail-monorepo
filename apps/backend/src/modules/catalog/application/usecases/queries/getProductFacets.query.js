// apps/backend/src/modules/catalog/application/usecases/getProductFacets.query.js
import { CatalogErrors } from "../../errors/index.js";

export function getProductFacetsQuery(input = {}) {
    const rawProductType = normalizeOptionalString(input.product_type);
    const filter = {
        status: normalizeOptionalString(input.status),
        product_type: rawProductType ? rawProductType.toLowerCase() : undefined,
        q: normalizeOptionalString(input.q),
    };

    if (!filter.product_type) throw CatalogErrors.PRODUCT_TYPE_REQUIRED();

    return {
        filter,
        filters: Array.isArray(input.filters) ? input.filters : [],
    };
}

function normalizeOptionalString(x) {
    const s = String(x ?? "").trim();
    return s ? s : undefined;
}
