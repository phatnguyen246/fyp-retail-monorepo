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
    const productRepository = catalogPersistence?.productRepository;

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

        async findCatalogDisplayByVariantIds({ variantIds = [] } = {}) {
            if (!Array.isArray(variantIds) || variantIds.length === 0) {
                return [];
            }

            const variants = await variantRepository.findVariantsByIds({
                variantIds,
                projection: {
                    _id: 1,
                    productId: 1,
                    sku: 1,
                    variantAttributes: 1,
                },
            });
            const productIds = [
                ...new Set(
                    variants
                        .map((variant) => toIdString(variant?.productId))
                        .filter(Boolean)
                ),
            ];
            const products =
                productIds.length > 0 &&
                productRepository &&
                typeof productRepository.findProductsByIds === "function"
                    ? await productRepository.findProductsByIds({
                          productIds,
                          projection: {
                              _id: 1,
                              title: 1,
                              productGroupCode: 1,
                          },
                      })
                    : [];
            const productMap = new Map(
                products.map((product) => [toIdString(product?._id), product])
            );

            return variants.map((variant) => {
                const variantId = toIdString(variant?._id);
                const product = productMap.get(toIdString(variant?.productId)) ?? null;

                return {
                    variantId,
                    productName:
                        typeof product?.title === "string" && product.title.length > 0
                            ? product.title
                            : null,
                    productGroupCode:
                        typeof product?.productGroupCode === "string" &&
                        product.productGroupCode.length > 0
                            ? product.productGroupCode
                            : null,
                    sku:
                        typeof variant?.sku === "string" && variant.sku.length > 0
                            ? variant.sku
                            : null,
                    variantLabel: composeVariantLabel(variant?.variantAttributes),
                };
            });
        },
    };
}

function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

function composeVariantLabel(variantAttributes) {
    if (
        typeof variantAttributes !== "object" ||
        variantAttributes === null ||
        Array.isArray(variantAttributes)
    ) {
        return null;
    }

    const fragments = [
        variantAttributes.ram,
        variantAttributes.rom,
        variantAttributes.colorFullName ?? variantAttributes.color,
    ]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);

    return fragments.length > 0 ? fragments.join(" / ") : null;
}
