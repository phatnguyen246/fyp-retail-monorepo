import { createInventoryCatalogAdapter } from "../../../inventory/adapters/catalog/index.js";
import { createInventoryPersistence } from "../../../inventory/adapters/persistence/index.js";
import { createReadInventoryByVariantIdsService } from "../../../inventory/services/read-inventory.service.js";
import { createInventoryNotFoundError } from "../../../inventory/services/inventory-service.errors.js";
import { createInventoryReadView } from "../../../inventory/utils/index.js";

export function createOrderingInventoryAdapter({
    db,
    inventoryPersistence = createInventoryPersistence({ db }),
    catalogAdapter = createInventoryCatalogAdapter({ db }),
    readInventoryByVariantIds = createReadInventoryByVariantIdsService({
        inventoryRepository: inventoryPersistence?.inventoryRepository,
    }),
} = {}) {
    const inventoryRepository = inventoryPersistence?.inventoryRepository;

    return {
        readInventoryByVariantIds,

        async decrementStockQuantityByVariantIdIfAvailable({
            variantId,
            quantity,
            updatedAt = new Date(),
        } = {}) {
            const updateResult =
                await inventoryRepository.decrementStockQuantityByVariantIdIfAvailable({
                    variantId,
                    quantity,
                    updatedAt,
                });

            if (updateResult?.modifiedCount !== 1) {
                return null;
            }

            const inventoryRecord = await inventoryRepository.findInventoryRecordByVariantId({
                variantId,
            });
            const readView = createInventoryReadView(inventoryRecord, {
                variantId,
            });

            try {
                await catalogAdapter.syncCatalogAvailability({
                    variantId,
                    isInStock: readView.isInStock,
                });
            } catch (error) {
                error.stockAdjusted = true;
                error.variantId = readView.variantId;
                error.quantity = quantity;
                throw error;
            }

            return readView;
        },

        async incrementStockQuantityByVariantId({
            variantId,
            quantity,
            updatedAt = new Date(),
        } = {}) {
            const updateResult = await inventoryRepository.incrementStockQuantityByVariantId({
                variantId,
                quantity,
                updatedAt,
            });

            if (updateResult?.matchedCount !== 1) {
                throw createInventoryNotFoundError(
                    `Inventory record not found for variant: ${variantId}`,
                    {
                        variantId,
                    }
                );
            }

            const inventoryRecord = await inventoryRepository.findInventoryRecordByVariantId({
                variantId,
            });
            const readView = createInventoryReadView(inventoryRecord, {
                variantId,
            });

            try {
                await catalogAdapter.syncCatalogAvailability({
                    variantId,
                    isInStock: readView.isInStock,
                });
            } catch (error) {
                error.stockAdjusted = true;
                error.variantId = readView.variantId;
                error.quantity = quantity;
                throw error;
            }

            return readView;
        },
    };
}
