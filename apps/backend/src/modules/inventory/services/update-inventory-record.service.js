import { createInventoryRecordView } from "../utils/index.js";
import { createInventoryValidation } from "../validation/index.js";
import {
    emitLowStockAlert,
    hasOwn,
    loadCatalogVariantForInventoryOrThrow,
    loadInventoryRecordOrThrow,
    syncCatalogAvailabilityOrThrow,
} from "./inventory-service.helpers.js";

export function createUpdateInventoryRecordService({
    catalogAdapter,
    inventoryRepository,
    validation = createInventoryValidation(),
    logger = console,
} = {}) {
    return async function updateInventoryRecord({ variantId, input } = {}) {
        const parsedParams = validation.parseInventoryVariantIdParams({
            variantId,
        });
        const parsedInput = validation.parseUpdateInventoryRecordInput(input ?? {});

        await loadInventoryRecordOrThrow({
            inventoryRepository,
            variantId: parsedParams.variantId,
        });
        const catalogVariant = await loadCatalogVariantForInventoryOrThrow({
            catalogAdapter,
            variantId: parsedParams.variantId,
        });

        const updates = {};

        if (hasOwn(parsedInput, "stockQuantity")) {
            updates.stockQuantity = parsedInput.stockQuantity;
        }

        if (hasOwn(parsedInput, "lowStockThreshold")) {
            updates.lowStockThreshold = parsedInput.lowStockThreshold;
        }

        await inventoryRepository.updateInventoryRecordByVariantId({
            variantId: parsedParams.variantId,
            updates,
        });

        const updatedRecord = await inventoryRepository.findInventoryRecordByVariantId({
            variantId: parsedParams.variantId,
        });
        const view = createInventoryRecordView(updatedRecord, {
            variantId: parsedParams.variantId,
        });

        await syncCatalogAvailabilityOrThrow({
            catalogAdapter,
            variantId: parsedParams.variantId,
            productId: catalogVariant.productId,
            stockQuantity: view.stockQuantity,
            isInStock: view.isInStock,
            logger,
        });
        emitLowStockAlert({
            logger,
            inventoryRecord: view,
        });

        return view;
    };
}
