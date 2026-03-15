import { createCatalogPersistence } from "../../../catalog/adapters/persistence/index.js";
import { toIdString } from "../../utils/index.js";

function createEntityMap(entities = []) {
    return new Map(
        entities
            .map((entity) => [toIdString(entity?._id), entity])
            .filter(([entityId]) => typeof entityId === "string")
    );
}

export function createCartCatalogAdapter({
    db,
    catalogPersistence = createCatalogPersistence({ db }),
} = {}) {
    const productRepository = catalogPersistence?.productRepository;
    const variantRepository = catalogPersistence?.variantRepository;
    const mediaRepository = catalogPersistence?.mediaRepository;

    return {
        async readVariantsForCart({ variantIds } = {}) {
            const normalizedVariantIds = [
                ...new Set((variantIds ?? []).map(toIdString).filter(Boolean)),
            ];

            if (normalizedVariantIds.length === 0) {
                return [];
            }

            const cartVariants = await variantRepository.findVariantsByIds({
                variantIds: normalizedVariantIds,
                projection: {
                    _id: 1,
                    productId: 1,
                    status: 1,
                    isDeleted: 1,
                    salePrice: 1,
                    currency: 1,
                    variantAttributes: 1,
                },
            });
            const variantsById = createEntityMap(cartVariants);
            const productIds = [
                ...new Set(
                    [...variantsById.values()]
                        .map((variant) => toIdString(variant?.productId))
                        .filter(Boolean)
                ),
            ];
            const [products, mediaList] = await Promise.all([
                productRepository.findProductsByIds({
                    productIds,
                    projection: {
                        _id: 1,
                        title: 1,
                        status: 1,
                        isDeleted: 1,
                    },
                }),
                mediaRepository.listMediaByVariantIds({
                    variantIds: normalizedVariantIds,
                    projection: {
                        _id: 1,
                        variantId: 1,
                        url: 1,
                        sortOrder: 1,
                        createdAt: 1,
                    },
                }),
            ]);
            const productsById = createEntityMap(products);
            const mediaByVariantId = new Map();

            for (const media of mediaList) {
                const variantId = toIdString(media?.variantId);

                if (!variantId) {
                    continue;
                }

                if (!mediaByVariantId.has(variantId)) {
                    mediaByVariantId.set(variantId, []);
                }

                mediaByVariantId.get(variantId).push(media);
            }

            return normalizedVariantIds.map((variantId) => {
                const variant = variantsById.get(variantId) ?? null;
                const productId = toIdString(variant?.productId);
                const product = productId ? productsById.get(productId) ?? null : null;

                return {
                    variantId,
                    variantExists: Boolean(variant),
                    productExists: Boolean(product),
                    productId,
                    productTitle: product?.title ?? null,
                    productStatus: product?.status ?? null,
                    productIsDeleted: product?.isDeleted === true,
                    variantStatus: variant?.status ?? null,
                    variantIsDeleted: variant?.isDeleted === true,
                    salePrice:
                        typeof variant?.salePrice === "number"
                            ? variant.salePrice
                            : null,
                    currency:
                        typeof variant?.currency === "string" ? variant.currency : null,
                    variantAttributes:
                        typeof variant?.variantAttributes === "object" &&
                        variant.variantAttributes !== null
                            ? variant.variantAttributes
                            : null,
                    thumbnailUrl: mediaByVariantId.get(variantId)?.[0]?.url ?? null,
                };
            });
        },
    };
}
