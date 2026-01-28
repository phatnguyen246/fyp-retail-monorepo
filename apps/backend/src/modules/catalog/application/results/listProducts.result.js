// apps/backend/src/modules/catalog/application/results/listProducts.result.js
import { productResult } from "./product.result.js";

export function listProductsResult({ items = [], page, page_size, total } = {}) {
    return {
        page,
        page_size,
        total,
        items: items.map(productResult),
    };
}
