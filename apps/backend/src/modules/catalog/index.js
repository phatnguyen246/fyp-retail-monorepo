import { makeProductRepositoryMongo } from "./infrastructure/persistence/product.repository.mongo.js";
import { makeCreateProductUseCase } from "./application/usecases/createProduct.usecase.js";
import { makeAddVariantUseCase } from "./application/usecases/addVariant.usecase.js";

export function buildCatalogModule() {
    const productRepository = makeProductRepositoryMongo();

    return {
        usecases: {
            createProduct: makeCreateProductUseCase({ productRepository }),
            addVariant: makeAddVariantUseCase({ productRepository }),
        },
        repositories: {
            productRepository,
        },
    };
}
