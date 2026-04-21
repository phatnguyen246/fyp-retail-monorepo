import { INVENTORY_COLLECTIONS } from "../../constants/index.js";
import { toObjectId, toObjectIdArray } from "../../utils/object-id.js";
import { createInventoryBaseRepository } from "./inventory-base.repository.js";

function assertPositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(
            `Inventory persistence requires ${fieldName} to be a positive integer`
        );
    }

    return value;
}

export function createInventoryRepository({
    db,
    baseRepository = createInventoryBaseRepository({ db }),
} = {}) {
    return {
        findInventoryRecordByVariantId({ variantId, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                fieldName: "variantId",
                value: toObjectId(variantId, "variantId"),
                projection,
            });
        },

        findInventoryRecordsByVariantIds({ variantIds, projection } = {}) {
            return baseRepository.findManyByFieldValues({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                fieldName: "variantId",
                values: toObjectIdArray(variantIds, "variantIds"),
                projection,
            });
        },

        createInventoryRecord({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                document,
                options,
            });
        },

        updateInventoryRecordByVariantId({
            variantId,
            updates,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneByField({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                fieldName: "variantId",
                value: toObjectId(variantId, "variantId"),
                set: {
                    ...updates,
                    updatedAt,
                },
            });
        },

        decrementStockQuantityByVariantIdIfAvailable({
            variantId,
            quantity,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneByFilterWithOperators({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                filter: {
                    variantId: toObjectId(variantId, "variantId"),
                    stockQuantity: {
                        $gte: assertPositiveInteger(quantity, "quantity"),
                    },
                },
                update: {
                    $inc: {
                        stockQuantity: -quantity,
                    },
                    $set: {
                        updatedAt,
                    },
                },
            });
        },

        incrementStockQuantityByVariantId({
            variantId,
            quantity,
            updatedAt = new Date(),
        } = {}) {
            return baseRepository.updateOneByFilterWithOperators({
                collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
                filter: {
                    variantId: toObjectId(variantId, "variantId"),
                },
                update: {
                    $inc: {
                        stockQuantity: assertPositiveInteger(quantity, "quantity"),
                    },
                    $set: {
                        updatedAt,
                    },
                },
            });
        },

        findLowStockInventoryRecords({
            projection,
            limit,
        } = {}) {
            const cursor = baseRepository
                .getCollection(INVENTORY_COLLECTIONS.inventoryRecords)
                .find(
                    {
                        $expr: {
                            $lte: ["$stockQuantity", "$lowStockThreshold"],
                        },
                    },
                    projection ? { projection } : undefined
                )
                .sort({
                    stockQuantity: 1,
                    updatedAt: 1,
                });

            if (Number.isInteger(limit) && limit > 0) {
                cursor.limit(limit);
            }

            return cursor.toArray();
        },

        countLowStockInventoryRecords() {
            return baseRepository
                .getCollection(INVENTORY_COLLECTIONS.inventoryRecords)
                .countDocuments({
                    $expr: {
                        $lte: ["$stockQuantity", "$lowStockThreshold"],
                    },
                });
        },

        countInventoryRecordsByFilter({ filter = {} } = {}) {
            return baseRepository
                .getCollection(INVENTORY_COLLECTIONS.inventoryRecords)
                .countDocuments(filter);
        },

        findInventoryRecordsByFilter({
            filter = {},
            projection,
            sort,
            skip = 0,
            limit,
        } = {}) {
            const cursor = baseRepository
                .getCollection(INVENTORY_COLLECTIONS.inventoryRecords)
                .find(filter, projection ? { projection } : undefined);

            if (sort && Object.keys(sort).length > 0) {
                cursor.sort(sort);
            }

            if (Number.isInteger(skip) && skip > 0) {
                cursor.skip(skip);
            }

            if (Number.isInteger(limit) && limit > 0) {
                cursor.limit(limit);
            }

            return cursor.toArray();
        },

        countOutOfStockInventoryRecords() {
            return baseRepository
                .getCollection(INVENTORY_COLLECTIONS.inventoryRecords)
                .countDocuments({
                    stockQuantity: 0,
                });
        },
    };
}
