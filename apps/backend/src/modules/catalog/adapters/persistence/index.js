import { createCatalogBaseRepository } from "./catalog-base.repository.js";
import { createCatalogProductRepository } from "./catalog-product.repository.js";
import { createCatalogReferenceRepository } from "./catalog-reference.repository.js";
import { createCatalogVariantRepository } from "./catalog-variant.repository.js";

export {
    createCatalogBaseRepository,
} from "./catalog-base.repository.js";
export { createCatalogProductRepository } from "./catalog-product.repository.js";
export { createCatalogReferenceRepository } from "./catalog-reference.repository.js";
export { createCatalogVariantRepository } from "./catalog-variant.repository.js";

export function createCatalogPersistence({ db } = {}) {
    const baseRepository = createCatalogBaseRepository({ db });

    return {
        baseRepository,
        productRepository: createCatalogProductRepository({
            db,
            baseRepository,
        }),
        referenceRepository: createCatalogReferenceRepository({
            db,
            baseRepository,
        }),
        variantRepository: createCatalogVariantRepository({
            db,
            baseRepository,
        }),
    };
}
