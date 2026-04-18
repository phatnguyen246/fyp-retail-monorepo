import { createInventoryAdapters } from "../adapters/index.js";
import { createInventoryHealthPayload } from "../utils/index.js";
import { createInventoryValidation } from "../validation/index.js";
import { createCreateInventoryRecordService } from "./create-inventory-record.service.js";
import { createGetInventoryRecordService } from "./get-inventory-record.service.js";
import { createListLowStockInventoryService } from "./list-low-stock-inventory.service.js";
import {
    createReadInventoryByVariantIdService,
    createReadInventoryByVariantIdsService,
} from "./read-inventory.service.js";
import { createUpdateInventoryRecordService } from "./update-inventory-record.service.js";

export { createCreateInventoryRecordService } from "./create-inventory-record.service.js";
export { createGetInventoryRecordService } from "./get-inventory-record.service.js";
export { createListLowStockInventoryService } from "./list-low-stock-inventory.service.js";
export {
    createReadInventoryByVariantIdService,
    createReadInventoryByVariantIdsService,
} from "./read-inventory.service.js";
export { createUpdateInventoryRecordService } from "./update-inventory-record.service.js";

export function createInventoryServices({
    adapters = createInventoryAdapters(),
    validation = createInventoryValidation(),
    logger = console,
} = {}) {
    const catalogAdapter = adapters?.catalog;
    const inventoryRepository = adapters?.persistence?.inventoryRepository;

    return {
        getHealth() {
            return createInventoryHealthPayload();
        },
        createInventoryRecord: createCreateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
            validation,
            logger,
        }),
        updateInventoryRecord: createUpdateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
            validation,
            logger,
        }),
        getInventoryRecord: createGetInventoryRecordService({
            inventoryRepository,
            validation,
        }),
        readInventoryByVariantId: createReadInventoryByVariantIdService({
            inventoryRepository,
            validation,
        }),
        readInventoryByVariantIds: createReadInventoryByVariantIdsService({
            inventoryRepository,
            validation,
        }),
        listLowStockInventory: createListLowStockInventoryService({
            inventoryRepository,
            catalogAdapter,
            logger,
        }),
    };
}
