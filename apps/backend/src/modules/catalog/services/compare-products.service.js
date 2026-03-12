import { createCatalogValidation } from "../validation/index.js";
import {
    assertStorefrontProductVisible,
    buildStorefrontCompareItem,
    hydrateStorefrontReferences,
} from "./catalog-storefront.service-helpers.js";

export function createCompareProductsService({
    productRepository,
    referenceRepository,
    variantRepository,
    validation = createCatalogValidation(),
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
        const variantsByProductId = groupVariantsByProductId(variants);
        const orderedProducts = parsedInput.productIds.map((productId) =>
            productById.get(productId)
        );
        const references = await hydrateStorefrontReferences({
            referenceRepository,
            products: orderedProducts,
        });

        return {
            items: orderedProducts.map((product) =>
                buildStorefrontCompareItem({
                    product,
                    variants: variantsByProductId.get(product._id.toHexString()) ?? [],
                    references,
                })
            ),
        };
    };
}

function groupVariantsByProductId(variants = []) {
    const variantsByProductId = new Map();

    for (const variant of variants) {
        const productId = variant?.productId?.toHexString?.();

        if (!productId) {
            continue;
        }

        if (!variantsByProductId.has(productId)) {
            variantsByProductId.set(productId, []);
        }

        variantsByProductId.get(productId).push(variant);
    }

    return variantsByProductId;
}
