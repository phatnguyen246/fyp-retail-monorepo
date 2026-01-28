import { CatalogErrors } from "../errors/index.js";
import { productResult } from "../results/product.result.js";

export function makeGetProductByIdUseCase({ productRepository }) {
    return async function getProductById({ productId }) {
        const id = String(productId ?? "").trim();
        if (!id) throw CatalogErrors.PRODUCT_ID_REQUIRED();

        const product = await productRepository.findById(id);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        return productResult(product);
    };
}
