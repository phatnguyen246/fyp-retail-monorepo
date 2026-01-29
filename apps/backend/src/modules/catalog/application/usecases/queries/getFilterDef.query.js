// apps/backend/src/modules/catalog/application/usecases/getFilterDef.query.js
import { CatalogErrors } from "../../errors/index.js";
import { getFilterDef } from "../../../domain/specs/index.js";

export function getFilterDefQuery(input = {}) {
    const product_type = normalizeOptionalString(input.product_type);
    if (!product_type) throw CatalogErrors.PRODUCT_TYPE_REQUIRED();

    const def = getFilterDef(product_type);
    if (!def) throw CatalogErrors.PRODUCT_TYPE_INVALID();

    return def;
}

function normalizeOptionalString(x) {
    const s = String(x ?? "").trim();
    return s ? s : undefined;
}
