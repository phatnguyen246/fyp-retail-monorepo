import { createInventoryRecord } from "../models/index.js";
import { createInventoryRecordView } from "../utils/index.js";
import { createInventoryValidation } from "../validation/index.js";
import {
    createInventoryConflictError,
    isDuplicateKeyError,
} from "./inventory-service.errors.js";
import {
    emitLowStockAlert,
    loadCatalogVariantForInventoryOrThrow,
    syncCatalogAvailabilityOrThrow,
} from "./inventory-service.helpers.js";

export function createCreateInventoryRecordService({
    catalogAdapter,
    inventoryRepository,
    validation = createInventoryValidation(),
    logger = console,
} = {}) {
    return async function createInventoryEntry({ input } = {}) {
        const parsedInput = validation.parseCreateInventoryRecordInput(input ?? {});
        const catalogVariant = await loadCatalogVariantForInventoryOrThrow({
            catalogAdapter,
            variantId: parsedInput.variantId,
        });
        const existingRecord = await inventoryRepository.findInventoryRecordByVariantId({
            variantId: parsedInput.variantId,
        });

        if (existingRecord) {
            throw createInventoryConflictError(
                `Inventory record already exists for variant: ${parsedInput.variantId}`,
                {
                    field: "variantId",
                    value: parsedInput.variantId,
                }
            );
        }

        const inventoryRecord = createInventoryRecord(parsedInput);

        try {
            await inventoryRepository.createInventoryRecord({
                document: inventoryRecord,
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw createInventoryConflictError(
                    `Inventory record already exists for variant: ${parsedInput.variantId}`,
                    {
                        field: "variantId",
                        value: parsedInput.variantId,
                    }
                );
            }

            throw error;
        }

        const storedRecord =
            (await inventoryRepository.findInventoryRecordByVariantId({
                variantId: parsedInput.variantId,
            })) ?? inventoryRecord;
        const view = createInventoryRecordView(storedRecord, {
            variantId: parsedInput.variantId,
        });

        await syncCatalogAvailabilityOrThrow({
            catalogAdapter,
            variantId: parsedInput.variantId,
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
