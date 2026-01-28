import { CatalogErrors } from "../errors/index.js";
import { productResult } from "../results/product.result.js";

export function makeUpdateProductStatusUseCase({ productRepository }) {
    return async function updateProductStatus(input = {}) {
        const productId = String(input.productId ?? "").trim();
        const nextStatus = String(input.status ?? "").trim();

        if (!productId) throw CatalogErrors.PRODUCT_ID_REQUIRED();
        if (!nextStatus) throw CatalogErrors.PRODUCT_STATUS_REQUIRED();

        const product = await productRepository.findById(productId);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        product.updateStatus(nextStatus);

        const saved = await productRepository.save(product);
        return productResult(saved);
    };
}
