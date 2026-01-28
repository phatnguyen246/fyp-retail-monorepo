// apps/backend/src/modules/catalog/application/usecases/createProduct.usecase.js
import { createProductCommand } from "../commands/createProduct.command.js";
import { productResult } from "../results/product.result.js";
import { CatalogErrors } from "../errors/index.js";

const VALID_STATUS = ["draft", "active", "archived"];

export function makeCreateProductUseCase({ productRepository }) {
    return async function createProduct(rawInput) {
        const cmd = createProductCommand(rawInput);

        // Business validation
        if (!cmd.name) throw CatalogErrors.PRODUCT_NAME_REQUIRED();
        if (!cmd.slug) throw CatalogErrors.PRODUCT_SLUG_REQUIRED();

        if (!VALID_STATUS.includes(cmd.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        // TODO (nếu có): unique slug, policy...
        const created = await productRepository.create(cmd);
        return productResult(created);
    };
}
