import { createProductDTO } from "../dtos/createProduct.dto.js";

export function makeCreateProductUseCase({ productRepository }) {
    return async function createProduct(rawInput) {
        const product = createProductDTO(rawInput);

        // Business validation (đúng chỗ)
        if (!product.name) throw new Error("PRODUCT_NAME_REQUIRED");
        if (!product.slug) throw new Error("PRODUCT_SLUG_REQUIRED");

        // Business rule
        if (!["draft", "active", "archived"].includes(product.status)) {
            throw new Error("PRODUCT_STATUS_INVALID");
        }

        return productRepository.create(product);
    };
}
