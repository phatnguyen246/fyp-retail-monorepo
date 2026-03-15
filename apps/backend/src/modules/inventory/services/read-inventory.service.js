import { createInventoryReadView, toIdString } from "../utils/index.js";
import { createInventoryValidation } from "../validation/index.js";

function createRecordMap(records = []) {
    const recordMap = new Map();

    for (const record of records) {
        const variantId = toIdString(record?.variantId);

        if (!variantId) {
            continue;
        }

        recordMap.set(variantId, record);
    }

    return recordMap;
}

export function createReadInventoryByVariantIdService({
    inventoryRepository,
    validation = createInventoryValidation(),
} = {}) {
    return async function readInventoryByVariantId({ variantId } = {}) {
        const parsedParams = validation.parseInventoryVariantIdParams({
            variantId,
        });
        const inventoryRecord = await inventoryRepository.findInventoryRecordByVariantId({
            variantId: parsedParams.variantId,
        });

        return createInventoryReadView(inventoryRecord, {
            variantId: parsedParams.variantId,
        });
    };
}

export function createReadInventoryByVariantIdsService({
    inventoryRepository,
    validation = createInventoryValidation(),
} = {}) {
    return async function readInventoryByVariantIds({ variantIds } = {}) {
        const parsedInput = validation.parseReadInventoryBatchInput({
            variantIds,
        });
        const inventoryRecords = await inventoryRepository.findInventoryRecordsByVariantIds({
            variantIds: parsedInput.variantIds,
        });
        const recordMap = createRecordMap(inventoryRecords);

        return parsedInput.variantIds.map((variantId) =>
            createInventoryReadView(recordMap.get(variantId), {
                variantId,
            })
        );
    };
}
