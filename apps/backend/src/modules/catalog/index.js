import { makeCreateProductUseCase } from "./application/usecases/createProduct.usecase.js";
import { makeAddVariantUseCase } from "./application/usecases/addVariant.usecase.js";

import { makeGetProductBySlugUseCase } from "./application/usecases/getProductBySlug.usecase.js";
import { makeGetProductByIdUseCase } from "./application/usecases/getProductById.usecase.js";
import { makeListProductsUseCase } from "./application/usecases/listProducts.usecase.js";

import { makeUpdateProductStatusUseCase } from "./application/usecases/updateProductStatus.usecase.js";

export function makeCatalogModule({ productRepository }) {

    return {
        usecases: {
            createProduct: makeCreateProductUseCase({ productRepository }),
            addVariant: makeAddVariantUseCase({ productRepository }),

            getProductBySlug: makeGetProductBySlugUseCase({ productRepository }),
            getProductById: makeGetProductByIdUseCase({ productRepository }),
            listProducts: makeListProductsUseCase({ productRepository }),

            updateProductStatus: makeUpdateProductStatusUseCase({ productRepository }),
        },
        repositories: { productRepository },
    };
}
