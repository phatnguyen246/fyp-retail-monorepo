// apps/backend/src/modules/catalog/application/usecases/createProduct.usecase.js
import { createProductCommand } from "../commands/createProduct.command.js";
import { productResult } from "../results/product.result.js";
import { Product } from "../../domain/product.aggregate.js";

export function makeCreateProductUseCase({ productRepository }) {
    return async function createProduct(rawInput) {
        const cmd = createProductCommand(rawInput);
        const product = Product.create(cmd);

        const saved = await productRepository.save(product);
        return productResult(saved);
    };
}
