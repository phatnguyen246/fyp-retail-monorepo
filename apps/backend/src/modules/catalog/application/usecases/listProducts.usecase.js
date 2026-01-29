// apps/backend/src/modules/catalog/application/usecases/listProducts.usecase.js
import { listProductsQuery } from "./listProducts.query.js";
import { listProductsResult } from "../results/listProducts.result.js";
import { CatalogErrors } from "../errors/index.js";
import { Product } from "../../domain/product.aggregate.js";

export function makeListProductsUseCase({ productRepository }) {
    return async function listProducts(rawInput = {}) {
        const query = listProductsQuery(rawInput);

        if (query.filter.status && !Product.isValidStatus(query.filter.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        const result = await productRepository.findPage(query);
        return listProductsResult(result);
    };
}
