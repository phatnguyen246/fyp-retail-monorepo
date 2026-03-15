import { createInventoryRecordView } from "../utils/index.js";
import { createInventoryValidation } from "../validation/index.js";

export function createGetInventoryRecordService({
    inventoryRepository,
    validation = createInventoryValidation(),
} = {}) {
    return async function getInventoryRecord({ variantId } = {}) {
        const parsedParams = validation.parseInventoryVariantIdParams({
            variantId,
        });
        const inventoryRecord = await inventoryRepository.findInventoryRecordByVariantId({
            variantId: parsedParams.variantId,
        });

        return createInventoryRecordView(inventoryRecord, {
            variantId: parsedParams.variantId,
        });
    };
}
