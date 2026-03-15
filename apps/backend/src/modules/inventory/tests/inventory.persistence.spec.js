import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    createInventoryBaseRepository,
    createInventoryRepository,
    ensureInventoryIndexes,
} from "../adapters/persistence/index.js";

function createCollectionMock() {
    const cursor = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
    };

    return {
        createIndex: vi.fn().mockResolvedValue("ok"),
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn().mockReturnValue(cursor),
        insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
}

function createDbMock(collectionMock) {
    return {
        collection: vi.fn().mockReturnValue(collectionMock),
    };
}

describe("inventory persistence", () => {
    it("creates inventory indexes through the base repository helpers", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);

        await ensureInventoryIndexes({ db });

        expect(collectionMock.createIndex).toHaveBeenNthCalledWith(
            1,
            { variantId: 1 },
            {
                unique: true,
                name: "inventory_records_variant_id_unique",
            }
        );
        expect(collectionMock.createIndex).toHaveBeenNthCalledWith(
            2,
            { stockQuantity: 1 },
            {
                unique: false,
                name: "inventory_records_stock_quantity",
            }
        );
    });

    it("normalizes variantId filters and low-stock queries in the repository", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createInventoryRepository({ db });
        const variantId = "65f000000000000000000101";

        await repository.findInventoryRecordByVariantId({ variantId });
        await repository.findInventoryRecordsByVariantIds({
            variantIds: [variantId],
        });
        await repository.updateInventoryRecordByVariantId({
            variantId,
            updates: {
                stockQuantity: 1,
            },
        });
        await repository.findLowStockInventoryRecords({ limit: 5 });

        expect(collectionMock.findOne).toHaveBeenCalledWith(
            { variantId: new ObjectId(variantId) },
            undefined
        );
        expect(collectionMock.find).toHaveBeenNthCalledWith(
            1,
            { variantId: { $in: [new ObjectId(variantId)] } },
            undefined
        );
        expect(collectionMock.updateOne).toHaveBeenCalledWith(
            { variantId: new ObjectId(variantId) },
            {
                $set: expect.objectContaining({
                    stockQuantity: 1,
                    updatedAt: expect.any(Date),
                }),
            },
            undefined
        );
        expect(collectionMock.find).toHaveBeenNthCalledWith(
            2,
            {
                $expr: {
                    $lte: ["$stockQuantity", "$lowStockThreshold"],
                },
            },
            undefined
        );
    });

    it("exposes shared repository helpers through createInventoryBaseRepository", async () => {
        const collectionMock = createCollectionMock();
        const db = createDbMock(collectionMock);
        const repository = createInventoryBaseRepository({ db });

        await repository.ensureUniqueIndex({
            collectionName: "inventoryRecords",
            key: { variantId: 1 },
            indexName: "inventory_records_variant_id_unique",
        });
        await repository.findManyByFieldValues({
            collectionName: "inventoryRecords",
            fieldName: "variantId",
            values: [new ObjectId("65f000000000000000000102")],
        });

        expect(collectionMock.createIndex).toHaveBeenCalledWith(
            { variantId: 1 },
            {
                unique: true,
                name: "inventory_records_variant_id_unique",
            }
        );
        expect(collectionMock.find).toHaveBeenCalledWith(
            {
                variantId: {
                    $in: [new ObjectId("65f000000000000000000102")],
                },
            },
            undefined
        );
    });
});
