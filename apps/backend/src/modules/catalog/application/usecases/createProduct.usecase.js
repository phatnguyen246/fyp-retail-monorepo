import { createProductDTO } from "../dtos/createProduct.dto.js";
import { CatalogErrors } from "../errors/index.js";

export function makeCreateProductUseCase({ productRepository }) {
    return async function createProduct(rawInput) {
        const product = createProductDTO(rawInput);

        // Business validation (đúng chỗ)
        if (!product.name) throw CatalogErrors.PRODUCT_NAME_REQUIRED();
        if (!product.slug) throw CatalogErrors.PRODUCT_SLUG_REQUIRED();

        // Business rule
        if (!["draft", "active", "archived"].includes(product.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        return productRepository.create(product);
    };
}
