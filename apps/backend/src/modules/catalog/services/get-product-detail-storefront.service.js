import { createCatalogValidation } from "../validation/index.js";
import {
    assertStorefrontProductVisible,
    buildStorefrontProductDetail,
    groupMediaByVariantId,
    hydrateStorefrontReferences,
    SEARCH_STOREFRONT_VISIBLE_PRODUCT_STATUSES,
} from "./catalog-storefront.service-helpers.js";
import { hydrateCatalogProductsWithLiveInventory } from "./catalog-live-inventory.helpers.js";

export function createGetProductDetailStorefrontService({
    inventoryAdapter,
    productRepository,
    referenceRepository,
    variantRepository,
    mediaRepository,
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    return async function getProductDetailStorefront({ params } = {}) {
        const parsedParams = validation.parseStorefrontProductDetailParams(
            params ?? {}
        );
        const product = await productRepository.findProductById({
            productId: parsedParams.productId,
        });

        assertStorefrontProductVisible(product, {
            productId: parsedParams.productId,
            allowedStatuses: SEARCH_STOREFRONT_VISIBLE_PRODUCT_STATUSES,
        });

        const [variants, references] = await Promise.all([
            variantRepository.findVariantsByProductId({
                productId: parsedParams.productId,
            }),
            hydrateStorefrontReferences({
                referenceRepository,
                products: [product],
            }),
        ]);
        const [mediaList, liveCatalogGraph] = await Promise.all([
            mediaRepository.listMediaByVariantIds({
                variantIds: variants.map((variant) => variant._id),
            }),
            hydrateCatalogProductsWithLiveInventory({
                inventoryAdapter,
                products: [product],
                variants,
                logger,
            }),
        ]);
        const mediaByVariantId = groupMediaByVariantId(mediaList);
        const liveVariants =
            liveCatalogGraph.variantsByProductId.get(parsedParams.productId) ?? [];
        const hasInStockVariants =
            liveCatalogGraph.productAvailabilityById.get(parsedParams.productId)
                ?.hasInStockVariants ?? false;

        return {
            data: buildStorefrontProductDetail({
                product,
                variants: liveVariants,
                references,
                mediaByVariantId,
                hasInStockVariants,
            }),
            meta: {
                canonicalSlug: product.slug,
            },
        };
    };
}
