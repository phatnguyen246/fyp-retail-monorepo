import {
    createVariantAttributes,
    createVariantVideo,
} from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    assertVariantPricingPatchInvariant,
} from "../validation/index.js";
import {
    assertProductAllowsVariantMutation,
    assertVariantNotDeleted,
    assertVariantParentProductExists,
    hasOwn,
    loadVariantOrThrow,
} from "./catalog-admin.service-helpers.js";
import { createCatalogUnprocessableEntityError } from "./catalog-service.errors.js";

export function createUpdateVariantService({
    productRepository,
    variantRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function updateCatalogVariant({ variantId, input } = {}) {
        const parsedParams = validation.parseVariantIdParams({ variantId });
        const parsedInput = validation.parseUpdateVariantInput(input ?? {});
        const currentVariant = await loadVariantOrThrow({
            variantRepository,
            variantId: parsedParams.variantId,
        });

        assertVariantNotDeleted(currentVariant);

        const product = await productRepository.findProductById({
            productId: currentVariant.productId,
        });

        assertVariantParentProductExists(product, currentVariant);
        assertProductAllowsVariantMutation(product);

        try {
            assertVariantPricingPatchInvariant({
                currentValues: currentVariant,
                patchValues: parsedInput,
            });
        } catch (error) {
            throw createCatalogUnprocessableEntityError(error.message, {
                field: "salePrice",
            });
        }

        const coreFields = {};

        if (hasOwn(parsedInput, "variantAttributes")) {
            coreFields.variantAttributes = createVariantAttributes({
                ...currentVariant.variantAttributes,
                ...parsedInput.variantAttributes,
            });
        }

        if (hasOwn(parsedInput, "ramSort")) {
            coreFields.ramSort = parsedInput.ramSort;
        }

        if (hasOwn(parsedInput, "romSort")) {
            coreFields.romSort = parsedInput.romSort;
        }

        if (hasOwn(parsedInput, "colorPriority")) {
            coreFields.colorPriority = parsedInput.colorPriority;
        }

        if (hasOwn(parsedInput, "variantSortOrder")) {
            coreFields.variantSortOrder = parsedInput.variantSortOrder;
        }

        if (hasOwn(parsedInput, "isPrimaryColor")) {
            coreFields.isPrimaryColor = parsedInput.isPrimaryColor;
        }

        if (hasOwn(parsedInput, "originalPrice")) {
            coreFields.originalPrice = parsedInput.originalPrice;
        }

        if (hasOwn(parsedInput, "salePrice")) {
            coreFields.salePrice = parsedInput.salePrice;
        }

        if (hasOwn(parsedInput, "currency")) {
            coreFields.currency = parsedInput.currency;
        }

        if (hasOwn(parsedInput, "video")) {
            coreFields.video = createVariantVideo(parsedInput.video);
        }

        if (hasOwn(parsedInput, "status")) {
            coreFields.status = parsedInput.status;
        }

        await variantRepository.updateVariantCoreFields({
            variantId: parsedParams.variantId,
            coreFields,
        });
        await rebuildProductDerivedFields({
            productId: product._id,
        });

        return variantRepository.findVariantById({
            variantId: parsedParams.variantId,
        });
    };
}
