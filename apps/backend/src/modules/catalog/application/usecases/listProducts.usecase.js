import { listProductsDTO } from "../dtos/listProducts.dto.js";
import { CatalogErrors } from "../errors/index.js";

export function makeListProductsUseCase({ productRepository }) {
    return async function listProducts(rawInput = {}) {
        const input = listProductsDTO(rawInput);

        // validate status if provided
        if (input.filter.status && !["draft", "active", "archived"].includes(input.filter.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        // validate product_type if provided (tối giản)
        if (input.filter.product_type && !String(input.filter.product_type).trim()) {
            throw CatalogErrors.PRODUCT_TYPE_INVALID();
        }

        return productRepository.list(input);
    };
}
