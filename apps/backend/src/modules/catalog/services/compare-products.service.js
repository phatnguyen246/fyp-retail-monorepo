import { createCatalogValidation } from "../validation/index.js";
import {
    assertStorefrontProductVisible,
    buildStorefrontCompareItem,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";
import { hydrateCatalogProductsWithLiveInventory } from "./catalog-live-inventory.helpers.js";

export function createCompareProductsService({
    inventoryAdapter,
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    return async function compareProducts({ input } = {}) {
        const parsedInput = validation.parseCompareProductsInput(input ?? {});
        const products = await productRepository.findProductsByIds({
            productIds: parsedInput.productIds,
        });
        const productById = new Map(
            products.map((product) => [product._id.toHexString(), product])
        );

        for (const productId of parsedInput.productIds) {
            assertStorefrontProductVisible(productById.get(productId), {
                productId,
            });
        }

        const variants = await variantRepository.findVariantsByProductIds({
            productIds: parsedInput.productIds,
        });
        const orderedProducts = parsedInput.productIds.map((productId) =>
            productById.get(productId)
        );
        const [references, liveCatalogGraph] = await Promise.all([
            hydrateStorefrontReferences({
                referenceRepository,
                products: orderedProducts,
            }),
            hydrateCatalogProductsWithLiveInventory({
                inventoryAdapter,
                products: orderedProducts,
                variants,
                logger,
            }),
        ]);

        return {
            items: orderedProducts.map((product) =>
                buildStorefrontCompareItem({
                    product,
                    variants:
                        liveCatalogGraph.variantsByProductId.get(
                            product._id.toHexString()
                        ) ?? [],
                    references,
                    hasInStockVariants:
                        liveCatalogGraph.productAvailabilityById.get(
                            product._id.toHexString()
                        )?.hasInStockVariants ?? false,
                })
            ),
        };
    };
}
