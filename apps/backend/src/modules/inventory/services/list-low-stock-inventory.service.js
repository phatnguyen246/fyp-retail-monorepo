import { createInventoryRecordView } from "../utils/index.js";

export function createListLowStockInventoryService({
    inventoryRepository,
} = {}) {
    return async function listLowStockInventory() {
        const inventoryRecords =
            await inventoryRepository.findLowStockInventoryRecords();

        return inventoryRecords.map((inventoryRecord) =>
            createInventoryRecordView(inventoryRecord)
        );
    };
}
