import { createInventoryRecordView } from "../utils/index.js";

export function createListLowStockInventoryService({
    inventoryRepository,
    catalogAdapter,
    logger = console,
} = {}) {
    return async function listLowStockInventory() {
        const inventoryRecords =
            await inventoryRepository.findLowStockInventoryRecords();
        const inventoryViews = inventoryRecords.map((inventoryRecord) =>
            createInventoryRecordView(inventoryRecord)
        );

        if (
            !catalogAdapter ||
            typeof catalogAdapter.findCatalogDisplayByVariantIds !== "function"
        ) {
            return inventoryViews;
        }

        const variantIds = inventoryViews
            .map((view) => view.variantId)
            .filter((variantId) => typeof variantId === "string" && variantId.length > 0);

        if (variantIds.length === 0) {
            return inventoryViews.map((view) => ({
                ...view,
                productName: null,
                productGroupCode: null,
                sku: null,
                variantLabel: null,
            }));
        }

        try {
            const catalogDisplays =
                await catalogAdapter.findCatalogDisplayByVariantIds({
                    variantIds,
                });
            const catalogDisplayMap = new Map(
                catalogDisplays.map((display) => [display.variantId, display])
            );

            return inventoryViews.map((view) => {
                const display = catalogDisplayMap.get(view.variantId);

                return {
                    ...view,
                    productName: display?.productName ?? null,
                    productGroupCode: display?.productGroupCode ?? null,
                    sku: display?.sku ?? null,
                    variantLabel: display?.variantLabel ?? null,
                };
            });
        } catch (error) {
            logger.warn("Inventory low-stock catalog hydration failed", {
                error:
                    error instanceof Error ? error.message : String(error),
            });

            return inventoryViews.map((view) => ({
                ...view,
                productName: null,
                productGroupCode: null,
                sku: null,
                variantLabel: null,
            }));
        }
    };
}
