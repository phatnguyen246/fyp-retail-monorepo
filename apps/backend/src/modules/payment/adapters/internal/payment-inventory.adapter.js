import { createOrderingInventoryAdapter } from "../../../ordering/adapters/inventory/ordering-inventory.adapter.js";

export function createPaymentInventoryAdapter({
    db,
    inventoryAdapter = createOrderingInventoryAdapter({ db }),
} = {}) {
    return {
        decrementStockQuantityByVariantIdIfAvailable(args) {
            return inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable(args);
        },

        incrementStockQuantityByVariantId(args) {
            return inventoryAdapter.incrementStockQuantityByVariantId(args);
        },
    };
}
