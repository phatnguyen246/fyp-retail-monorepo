import { toIdString } from "../utils/index.js";
import {
    createInventoryCatalogSyncFailedError,
    createInventoryCatalogVariantNotFoundError,
    createInventoryNotFoundError,
} from "./inventory-service.errors.js";

export function hasOwn(target, propertyName) {
    return Object.prototype.hasOwnProperty.call(target, propertyName);
}

export async function loadInventoryRecordOrThrow({
    inventoryRepository,
    variantId,
    message = `Inventory record not found for variant: ${variantId}`,
} = {}) {
    const inventoryRecord = await inventoryRepository.findInventoryRecordByVariantId({
        variantId,
    });

    if (!inventoryRecord) {
        throw createInventoryNotFoundError(message, {
            variantId,
        });
    }

    return inventoryRecord;
}

export async function loadCatalogVariantForInventoryOrThrow({
    catalogAdapter,
    variantId,
} = {}) {
    const catalogVariant = await catalogAdapter.findVariantForInventory({
        variantId,
    });

    if (!catalogVariant || catalogVariant.isDeleted === true) {
        throw createInventoryCatalogVariantNotFoundError(
            `Catalog variant unavailable for inventory: ${variantId}`,
            {
                variantId,
            }
        );
    }

    return catalogVariant;
}

export async function syncCatalogAvailabilityOrThrow({
    catalogAdapter,
    variantId,
    productId,
    stockQuantity,
    isInStock,
    logger = console,
} = {}) {
    try {
        return await catalogAdapter.syncCatalogAvailability({
            variantId,
            isInStock,
        });
    } catch (error) {
        logger.error?.("Inventory catalog availability sync failed", {
            variantId: toIdString(variantId),
            productId: toIdString(productId),
            stockQuantity,
            derivedIsInStock: isInStock,
            error: {
                message: error?.message ?? "Unknown error",
                code: error?.code ?? null,
            },
        });

        throw createInventoryCatalogSyncFailedError(
            `Inventory catalog sync failed for variant: ${variantId}`,
            {
                variantId: toIdString(variantId),
                productId: toIdString(productId),
                stockQuantity,
                isInStock,
            }
        );
    }
}

export function emitLowStockAlert({ logger = console, inventoryRecord } = {}) {
    if (inventoryRecord?.recordExists !== true || inventoryRecord?.isLowStock !== true) {
        return;
    }

    logger.warn?.("Inventory low stock alert", {
        variantId: inventoryRecord.variantId,
        stockQuantity: inventoryRecord.stockQuantity,
        lowStockThreshold: inventoryRecord.lowStockThreshold,
        timestamp: new Date().toISOString(),
    });
}
