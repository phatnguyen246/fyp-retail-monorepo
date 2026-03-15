import { createCatalogPersistence } from "../../../catalog/adapters/persistence/index.js";
import { createRebuildProductDerivedFieldsService } from "../../../catalog/services/rebuild-product-derived-fields.service.js";

export function createInventoryCatalogAdapter({
    db,
    catalogPersistence = createCatalogPersistence({ db }),
    rebuildProductDerivedFields = createRebuildProductDerivedFieldsService({
        productRepository: catalogPersistence?.productRepository,
        variantRepository: catalogPersistence?.variantRepository,
    }),
} = {}) {
    const variantRepository = catalogPersistence?.variantRepository;

    return {
        findVariantForInventory({ variantId } = {}) {
            return variantRepository.findVariantById({
                variantId,
                projection: {
                    _id: 1,
                    productId: 1,
                    isDeleted: 1,
                    status: 1,
                    isInStock: 1,
                },
            });
        },

        async syncCatalogAvailability({ variantId, isInStock } = {}) {
            const variant = await variantRepository.findVariantById({
                variantId,
                projection: {
                    _id: 1,
                    productId: 1,
                    isDeleted: 1,
                    status: 1,
                    isInStock: 1,
                },
            });

            if (!variant || variant.isDeleted === true) {
                throw new Error(
                    `Catalog variant unavailable for inventory sync: ${variantId}`
                );
            }

            await variantRepository.updateVariantDerivedFields({
                variantId,
                derivedFields: {
                    isInStock,
                },
            });
            const derivedFields = await rebuildProductDerivedFields({
                productId: variant.productId,
            });

            return {
                variantId: variant._id,
                productId: variant.productId,
                isInStock,
                derivedFields,
            };
        },
    };
}
