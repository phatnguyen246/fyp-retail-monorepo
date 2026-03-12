import { createSmartphoneSpecs } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import {
    buildMergedSmartphoneSpecs,
    buildProductSearchTitle,
    hasOwn,
    loadProductOrThrow,
    normalizeActorId,
    resolveProductReferencePatch,
    assertProductNotDeleted,
} from "./catalog-admin.service-helpers.js";

export function createUpdateProductService({
    productRepository,
    referenceRepository,
    validation = createCatalogValidation(),
    rebuildProductDerivedFields,
} = {}) {
    return async function updateCatalogProduct({
        productId,
        input,
        actorId,
    } = {}) {
        const parsedParams = validation.parseProductIdParams({ productId });
        const parsedInput = validation.parseUpdateProductInput(input ?? {});
        const currentProduct = await loadProductOrThrow({
            productRepository,
            productId: parsedParams.productId,
        });

        assertProductNotDeleted(currentProduct);

        const referencePatch = await resolveProductReferencePatch({
            referenceRepository,
            input: parsedInput,
        });
        const coreFields = {
            ...referencePatch,
            updatedBy: normalizeActorId(actorId),
        };
        const titleChanged =
            hasOwn(parsedInput, "title") && parsedInput.title !== currentProduct.title;

        if (hasOwn(parsedInput, "title")) {
            coreFields.title = parsedInput.title;
            coreFields.searchTitle = buildProductSearchTitle(parsedInput.title);
        }

        if (hasOwn(parsedInput, "productType")) {
            coreFields.productType = parsedInput.productType;
        }

        if (hasOwn(parsedInput, "shortDescription")) {
            coreFields.shortDescription = parsedInput.shortDescription;
        }

        if (hasOwn(parsedInput, "longDescription")) {
            coreFields.longDescription = parsedInput.longDescription;
        }

        if (hasOwn(parsedInput, "badges")) {
            coreFields.badges = parsedInput.badges;
        }

        if (hasOwn(parsedInput, "status")) {
            coreFields.status = parsedInput.status;
        }

        if (hasOwn(parsedInput, "contactWhenOutOfStock")) {
            coreFields.contactWhenOutOfStock =
                parsedInput.contactWhenOutOfStock;
        }

        if (hasOwn(parsedInput, "specs")) {
            coreFields.specs = buildMergedSmartphoneSpecs({
                currentSpecs: createSmartphoneSpecs(currentProduct.specs),
                patchSpecs: parsedInput.specs,
            });
        }

        await productRepository.updateProductCoreFields({
            productId: parsedParams.productId,
            coreFields,
        });

        if (titleChanged) {
            await rebuildProductDerivedFields({
                productId: parsedParams.productId,
            });
        }

        return productRepository.findProductById({
            productId: parsedParams.productId,
        });
    };
}
