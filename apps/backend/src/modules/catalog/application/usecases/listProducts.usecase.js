// apps/backend/src/modules/catalog/application/usecases/listProducts.usecase.js
import { listProductsCommand } from "../commands/listProducts.command.js";
import { listProductsResult } from "../results/listProducts.result.js";
import { CatalogErrors } from "../errors/index.js";
import { Product } from "../../domain/product.aggregate.js";

export function makeListProductsUseCase({ productRepository }) {
    return async function listProducts(rawInput = {}) {
        const cmd = listProductsCommand(rawInput);

        if (cmd.filter.status && !Product.isValidStatus(cmd.filter.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        if (cmd.sort.direction == null) {
            throw CatalogErrors.SORT_DIRECTION_INVALID?.(cmd.sort.direction, ["asc", "desc"])
                ?? CatalogErrors.BAD_REQUEST?.("Sort direction is required");
        }

        const result = await productRepository.list(cmd);
        // giả sử repo trả shape: { items, total, page, page_size }
        return listProductsResult(result);
    };
}
