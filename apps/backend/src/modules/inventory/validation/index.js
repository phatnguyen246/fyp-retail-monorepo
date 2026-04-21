import {
    ADMIN_LIST_LOW_STOCK_QUERY_SCHEMA,
    parseAdminListLowStockQuery,
} from "./admin-list-low-stock.schema.js";
import {
    CREATE_INVENTORY_RECORD_INPUT_SCHEMA,
    parseCreateInventoryRecordInput,
} from "./create-inventory-record.schema.js";
import {
    INVENTORY_VARIANT_ID_PARAMS_SCHEMA,
    parseInventoryVariantIdParams,
} from "./inventory-resource-params.schema.js";
import {
    parseReadInventoryBatchInput,
    READ_INVENTORY_BATCH_INPUT_SCHEMA,
} from "./read-inventory.schema.js";
import {
    parseUpdateInventoryRecordInput,
    UPDATE_INVENTORY_RECORD_INPUT_SCHEMA,
} from "./update-inventory-record.schema.js";
import { coerceIntegerInput, trimTextInput } from "./inventory.normalizers.js";

export {
    ADMIN_LIST_LOW_STOCK_QUERY_SCHEMA,
    parseAdminListLowStockQuery,
} from "./admin-list-low-stock.schema.js";
export {
    CREATE_INVENTORY_RECORD_INPUT_SCHEMA,
    parseCreateInventoryRecordInput,
} from "./create-inventory-record.schema.js";
export {
    INVENTORY_VARIANT_ID_PARAMS_SCHEMA,
    parseInventoryVariantIdParams,
} from "./inventory-resource-params.schema.js";
export {
    parseReadInventoryBatchInput,
    READ_INVENTORY_BATCH_INPUT_SCHEMA,
} from "./read-inventory.schema.js";
export {
    parseUpdateInventoryRecordInput,
    UPDATE_INVENTORY_RECORD_INPUT_SCHEMA,
} from "./update-inventory-record.schema.js";

export function createInventoryValidation() {
    return {
        validateHealthRequest() {
            return { ok: true };
        },
        createInventoryRecordSchema: CREATE_INVENTORY_RECORD_INPUT_SCHEMA,
        updateInventoryRecordSchema: UPDATE_INVENTORY_RECORD_INPUT_SCHEMA,
        inventoryVariantIdParamsSchema: INVENTORY_VARIANT_ID_PARAMS_SCHEMA,
        readInventoryBatchSchema: READ_INVENTORY_BATCH_INPUT_SCHEMA,
        parseAdminListLowStockQuery,
        parseCreateInventoryRecordInput,
        parseUpdateInventoryRecordInput,
        parseInventoryVariantIdParams,
        parseReadInventoryBatchInput,
        normalizers: {
            coerceIntegerInput,
            trimTextInput,
        },
    };
}
