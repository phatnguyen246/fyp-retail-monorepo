// apps/backend/src/modules/catalog/application/results/listProducts.result.js
import { productResult } from "./product.result.js";

export function listProductsResult({ items = [], nextCursor = null } = {}) {
    return {
        items: Array.isArray(items) ? items.map(productResult) : [],
        nextCursor: nextCursor ?? null,
    };
}
