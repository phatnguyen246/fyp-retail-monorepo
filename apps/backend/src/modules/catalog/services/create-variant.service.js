import { createVariant } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    createCatalogConflictError,
    isDuplicateKeyError,
} from "./catalog-service.errors.js";
import {
    assertProductAllowsVariantMutation,
    loadProductOrThrow,
} from "./catalog-admin.service-helpers.js";

export function createCreateVariantService({
    productRepository,
    variantRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function createCatalogVariant({ productId, input } = {}) {
        const parsedParams = validation.parseProductIdParams({ productId });
        const parsedInput = validation.parseAdminCreateVariantInput(input ?? {});
        const product = await loadProductOrThrow({
            productRepository,
            productId: parsedParams.productId,
        });

        assertProductAllowsVariantMutation(product);

        const existingVariant = await variantRepository.findVariantBySku({
            sku: parsedInput.sku,
        });

        if (existingVariant) {
            throw createCatalogConflictError(
                `Catalog sku already exists: ${parsedInput.sku}`,
                {
                    field: "sku",
                    value: parsedInput.sku,
                }
            );
        }

        const variant = createVariant({
            productId: parsedParams.productId,
            sku: parsedInput.sku,
            variantAttributes: parsedInput.variantAttributes,
            ramSort: parsedInput.ramSort,
            romSort: parsedInput.romSort,
            colorPriority: parsedInput.colorPriority,
            variantSortOrder: parsedInput.variantSortOrder,
            isPrimaryColor: parsedInput.isPrimaryColor,
            originalPrice: parsedInput.originalPrice,
            salePrice: parsedInput.salePrice,
            currency: parsedInput.currency,
            video: parsedInput.video,
            status: parsedInput.status,
        });

        try {
            await variantRepository.createVariant({
                document: variant,
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw createCatalogConflictError(
                    `Catalog sku already exists: ${parsedInput.sku}`,
                    {
                        field: "sku",
                        value: parsedInput.sku,
                    }
                );
            }

            throw error;
        }

        await rebuildProductDerivedFields({
            productId: product._id,
        });

        return (
            (await variantRepository.findVariantById({
                variantId: variant._id,
            })) ?? variant
        );
    };
}
