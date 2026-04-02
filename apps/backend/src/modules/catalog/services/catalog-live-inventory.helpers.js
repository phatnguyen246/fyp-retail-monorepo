import { filterActiveCatalogVariants } from "../utils/filter-active-catalog-variants.js";

function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

function createSafeInventoryRead(variantId) {
    return {
        variantId,
        stockQuantity: 0,
        isInStock: false,
    };
}

function createVariantInventoryMap(inventoryReads = []) {
    const inventoryMap = new Map();

    for (const inventoryRead of inventoryReads) {
        const variantId = toIdString(inventoryRead?.variantId);

        if (!variantId) {
            continue;
        }

        inventoryMap.set(variantId, {
            variantId,
            stockQuantity:
                typeof inventoryRead?.stockQuantity === "number"
                    ? inventoryRead.stockQuantity
                    : 0,
            isInStock: inventoryRead?.isInStock === true,
        });
    }

    return inventoryMap;
}

function createVariantsByProductId(variants = []) {
    const variantsByProductId = new Map();

    for (const variant of variants) {
        const productId = toIdString(variant?.productId);

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

export async function readLiveInventorySnapshot({
    inventoryAdapter,
    variantIds = [],
    logger = console,
} = {}) {
    const normalizedVariantIds = [...new Set(variantIds.map(toIdString).filter(Boolean))];

    if (normalizedVariantIds.length === 0) {
        return {
            inventoryReads: [],
            inventoryByVariantId: new Map(),
            usedSafeFallback: false,
        };
    }

    try {
        const inventoryReads = await inventoryAdapter.readInventoryByVariantIds({
            variantIds: normalizedVariantIds,
        });

        return {
            inventoryReads,
            inventoryByVariantId: createVariantInventoryMap(inventoryReads),
            usedSafeFallback: false,
        };
    } catch (error) {
        logger.warn?.("Catalog inventory read failed; using safe fallback", {
            variantIds: normalizedVariantIds,
            error: {
                message: error?.message ?? "Unknown error",
                code: error?.code ?? null,
            },
        });

        const inventoryReads = normalizedVariantIds.map(createSafeInventoryRead);

        return {
            inventoryReads,
            inventoryByVariantId: createVariantInventoryMap(inventoryReads),
            usedSafeFallback: true,
        };
    }
}

export async function hydrateCatalogProductsWithLiveInventory({
    inventoryAdapter,
    products = [],
    variants = [],
    logger = console,
} = {}) {
    const activeVariants = filterActiveCatalogVariants(variants);
    const { inventoryByVariantId } = await readLiveInventorySnapshot({
        inventoryAdapter,
        variantIds: activeVariants.map((variant) => variant?._id),
        logger,
    });
    const liveVariants = variants.map((variant) => {
        if (
            variant?.status !== "active" ||
            variant?.isDeleted === true
        ) {
            return variant;
        }

        const variantId = toIdString(variant?._id);
        const inventoryRead =
            inventoryByVariantId.get(variantId) ?? createSafeInventoryRead(variantId);

        return {
            ...variant,
            availableQuantity: inventoryRead.stockQuantity,
            isInStock: inventoryRead.isInStock,
        };
    });
    const variantsByProductId = createVariantsByProductId(liveVariants);
    const productAvailabilityById = new Map();

    for (const product of products) {
        const productId = toIdString(product?._id);
        const productVariants =
            variantsByProductId.get(productId) ?? [];
        const activeProductVariants = filterActiveCatalogVariants(productVariants);

        productAvailabilityById.set(productId, {
            hasInStockVariants: activeProductVariants.some(
                (variant) => variant?.isInStock === true
            ),
        });
    }

    return {
        liveVariants,
        variantsByProductId,
        productAvailabilityById,
    };
}
