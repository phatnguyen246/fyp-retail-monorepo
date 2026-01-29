import { makeCreateProductUseCase } from "./application/usecases/createProduct.usecase.js";
import { makeAddVariantUseCase } from "./application/usecases/addVariant.usecase.js";

import { makeGetProductBySlugUseCase } from "./application/usecases/getProductBySlug.usecase.js";
import { makeGetProductByIdUseCase } from "./application/usecases/getProductById.usecase.js";
import { makeListProductsUseCase } from "./application/usecases/listProducts.usecase.js";

import { makeUpdateProductUseCase } from "./application/usecases/updateProduct.usecase.js";
import { makeUpdateProductStatusUseCase } from "./application/usecases/updateProductStatus.usecase.js";
import { assertProductRepositoryPort } from "./application/ports/productRepository.port.js";
import { makeGetFilterDefUseCase } from "./application/usecases/getFilterDef.usecase.js";
import { makeGetProductFacetsUseCase } from "./application/usecases/getProductFacets.usecase.js";

export function makeCatalogModule({ productRepository }) {
    const repo = assertProductRepositoryPort(productRepository);

    return {
        usecases: {
            createProduct: makeCreateProductUseCase({ productRepository: repo }),
            addVariant: makeAddVariantUseCase({ productRepository: repo }),

            getProductBySlug: makeGetProductBySlugUseCase({ productRepository: repo }),
            getProductById: makeGetProductByIdUseCase({ productRepository: repo }),
            listProducts: makeListProductsUseCase({ productRepository: repo }),

            updateProduct: makeUpdateProductUseCase({ productRepository: repo }),
            updateProductStatus: makeUpdateProductStatusUseCase({ productRepository: repo }),
            getFilterDef: makeGetFilterDefUseCase(),
            getProductFacets: makeGetProductFacetsUseCase({ productRepository: repo }),
        },
        repositories: { productRepository: repo },
    };
}
