import { CatalogErrors } from "../errors/index.js";
import { productResult } from "../results/product.result.js";

export function makeAddVariantUseCase({ productRepository }) {
    return async function addVariant(input = {}) {
        const productId = String(input.productId ?? "").trim();
        if (!productId) throw CatalogErrors.PRODUCT_ID_REQUIRED();

        const product = await productRepository.findById(productId);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        product.addVariant({
            sku: input.sku,
            price_amount: input.price_amount,
            currency: input.currency,
            stock_on_hand: input.stock_on_hand,
            is_default: input.is_default,
            variant_name: input.variant_name,
            selections: input.selections,
        });

        const saved = await productRepository.save(product);
        return productResult(saved);
    };
}
