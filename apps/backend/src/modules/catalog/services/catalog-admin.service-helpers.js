import { createSmartphoneSpecs } from "../models/index.js";
import { normalizeSearchTitle } from "../utils/catalog-field-normalizers.js";
import {
    createCatalogConflictError,
    createCatalogNotFoundError,
    createCatalogUnprocessableEntityError,
} from "./catalog-service.errors.js";

function hasOwnProperty(target, propertyName) {
    return Object.prototype.hasOwnProperty.call(target, propertyName);
}

export function hasOwn(target, propertyName) {
    return hasOwnProperty(target, propertyName);
}

export function normalizeActorId(actorId) {
    if (typeof actorId !== "string") {
        return null;
    }

    const normalizedActorId = actorId.trim();

    return normalizedActorId.length > 0 ? normalizedActorId : null;
}

export async function resolveProductReferences({
    referenceRepository,
    brandCode,
    categoryCode,
    tagCodes = [],
} = {}) {
    const [brand, category, tags] = await Promise.all([
        referenceRepository.findBrandByCode({ code: brandCode }),
        referenceRepository.findCategoryByCode({ code: categoryCode }),
        referenceRepository.findTagsByCodes({ codes: tagCodes }),
    ]);

    if (!brand) {
        throw createCatalogUnprocessableEntityError(
            `Catalog brand not found for code: ${brandCode}`,
            {
                field: "brandCode",
                value: brandCode,
            }
        );
    }

    if (!category) {
        throw createCatalogUnprocessableEntityError(
            `Catalog category not found for code: ${categoryCode}`,
            {
                field: "categoryCode",
                value: categoryCode,
            }
        );
    }

    const resolvedTagCodes = new Set(tags.map((tag) => tag.code));
    const missingTagCodes = tagCodes.filter((tagCode) => !resolvedTagCodes.has(tagCode));

    if (missingTagCodes.length > 0) {
        throw createCatalogUnprocessableEntityError(
            `Catalog tags not found for codes: ${missingTagCodes.join(", ")}`,
            {
                field: "tagCodes",
                values: missingTagCodes,
            }
        );
    }

    return {
        brandId: brand._id,
        categoryId: category._id,
        tagIds: tags.map((tag) => tag._id),
    };
}

export async function resolveProductReferencePatch({
    referenceRepository,
    input,
} = {}) {
    const patch = {};

    if (hasOwnProperty(input, "brandCode")) {
        const brand = await referenceRepository.findBrandByCode({
            code: input.brandCode,
        });

        if (!brand) {
            throw createCatalogUnprocessableEntityError(
                `Catalog brand not found for code: ${input.brandCode}`,
                {
                    field: "brandCode",
                    value: input.brandCode,
                }
            );
        }

        patch.brandId = brand._id;
    }

    if (hasOwnProperty(input, "categoryCode")) {
        const category = await referenceRepository.findCategoryByCode({
            code: input.categoryCode,
        });

        if (!category) {
            throw createCatalogUnprocessableEntityError(
                `Catalog category not found for code: ${input.categoryCode}`,
                {
                    field: "categoryCode",
                    value: input.categoryCode,
                }
            );
        }

        patch.categoryId = category._id;
    }

    if (hasOwnProperty(input, "tagCodes")) {
        const tags = await referenceRepository.findTagsByCodes({
            codes: input.tagCodes,
        });
        const resolvedTagCodes = new Set(tags.map((tag) => tag.code));
        const missingTagCodes = input.tagCodes.filter(
            (tagCode) => !resolvedTagCodes.has(tagCode)
        );

        if (missingTagCodes.length > 0) {
            throw createCatalogUnprocessableEntityError(
                `Catalog tags not found for codes: ${missingTagCodes.join(", ")}`,
                {
                    field: "tagCodes",
                    values: missingTagCodes,
                }
            );
        }

        patch.tagIds = tags.map((tag) => tag._id);
    }

    return patch;
}

export async function loadProductOrThrow({
    productRepository,
    productId,
    message = `Catalog product not found: ${productId}`,
} = {}) {
    const product = await productRepository.findProductById({ productId });

    if (!product) {
        throw createCatalogNotFoundError(message, {
            productId,
        });
    }

    return product;
}

export async function loadVariantOrThrow({
    variantRepository,
    variantId,
    message = `Catalog variant not found: ${variantId}`,
} = {}) {
    const variant = await variantRepository.findVariantById({ variantId });

    if (!variant) {
        throw createCatalogNotFoundError(message, {
            variantId,
        });
    }

    return variant;
}

export async function buildProductAdminDetail({
    productRepository,
    variantRepository,
    productId,
} = {}) {
    const product = await loadProductOrThrow({
        productRepository,
        productId,
    });
    const variants = await variantRepository.findVariantsByProductId({
        productId,
    });

    return {
        product,
        variants,
    };
}

export function assertProductNotDeleted(product, message) {
    if (product?.isDeleted === true) {
        throw createCatalogConflictError(
            message ?? `Catalog product is soft deleted: ${product?._id}`,
            {
                productId: product?._id,
            }
        );
    }
}

export function assertVariantNotDeleted(variant, message) {
    if (variant?.isDeleted === true) {
        throw createCatalogConflictError(
            message ?? `Catalog variant is soft deleted: ${variant?._id}`,
            {
                variantId: variant?._id,
            }
        );
    }
}

export function assertProductAllowsVariantMutation(product) {
    assertProductNotDeleted(product);

    if (product?.status === "discontinued") {
        throw createCatalogConflictError(
            `Catalog cannot mutate variants for discontinued product: ${product?._id}`,
            {
                productId: product?._id,
                status: product?.status,
            }
        );
    }
}

export function assertVariantParentProductExists(product, variant) {
    if (!product) {
        throw createCatalogNotFoundError(
            `Catalog parent product not found for variant: ${variant?._id}`,
            {
                variantId: variant?._id,
                productId: variant?.productId,
            }
        );
    }
}

export function buildMergedSmartphoneSpecs({
    currentSpecs = {},
    patchSpecs = {},
} = {}) {
    return createSmartphoneSpecs({
        ...currentSpecs,
        ...patchSpecs,
        screen: {
            ...(currentSpecs?.screen ?? {}),
            ...(patchSpecs?.screen ?? {}),
        },
    });
}

export function buildProductSearchTitle(title) {
    return normalizeSearchTitle(title);
}
