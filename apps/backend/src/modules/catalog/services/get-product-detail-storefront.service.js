import { createCatalogValidation } from "../validation/index.js";
import {
    assertStorefrontProductVisible,
    buildStorefrontProductDetail,
    groupMediaByVariantId,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";

export function createGetProductDetailStorefrontService({
    productRepository,
    referenceRepository,
    variantRepository,
    mediaRepository,
    validation = createCatalogValidation(),
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
        const mediaByVariantId = groupMediaByVariantId(
            await mediaRepository.listMediaByVariantIds({
                variantIds: variants.map((variant) => variant._id),
            })
        );

        return {
            data: buildStorefrontProductDetail({
                product,
                variants,
                references,
                mediaByVariantId,
            }),
            meta: {
                canonicalSlug: product.slug,
            },
        };
    };
}
