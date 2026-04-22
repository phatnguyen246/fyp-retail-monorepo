import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createCreateInventoryRecordService } from "../services/create-inventory-record.service.js";
import { createGetInventoryRecordService } from "../services/get-inventory-record.service.js";
import { createListLowStockInventoryService } from "../services/list-low-stock-inventory.service.js";
import { createReadInventoryByVariantIdsService } from "../services/read-inventory.service.js";
import { createUpdateInventoryRecordService } from "../services/update-inventory-record.service.js";

describe("inventory services", () => {
    it("creates inventory for a valid catalog variant and syncs in-stock availability", async () => {
        const variantId = new ObjectId("65f000000000000000000111");
        const productId = new ObjectId("65f000000000000000000211");
        const logger = {
            warn: vi.fn(),
            error: vi.fn(),
        };
        const inventoryRepository = {
            findInventoryRecordByVariantId: vi
                .fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    _id: new ObjectId("65f000000000000000000112"),
                    variantId,
                    stockQuantity: 2,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                }),
            createInventoryRecord: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
        const catalogAdapter = {
            findVariantForInventory: vi.fn().mockResolvedValue({
                _id: variantId,
                productId,
                status: "active",
                isDeleted: false,
                isInStock: false,
            }),
            syncCatalogAvailability: vi.fn().mockResolvedValue({
                variantId,
                productId,
                isInStock: true,
            }),
        };
        const createInventoryRecord = createCreateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
            logger,
        });

        const result = await createInventoryRecord({
            input: {
                variantId: variantId.toHexString(),
                stockQuantity: 2,
            },
        });

        expect(result).toMatchObject({
            variantId: variantId.toHexString(),
            stockQuantity: 2,
            lowStockThreshold: 3,
            isInStock: true,
            isLowStock: true,
            recordExists: true,
        });
        expect(catalogAdapter.findVariantForInventory).toHaveBeenCalledWith({
            variantId: variantId.toHexString(),
        });
        expect(catalogAdapter.syncCatalogAvailability).toHaveBeenCalledWith({
            variantId: variantId.toHexString(),
            isInStock: true,
        });
        expect(inventoryRepository.createInventoryRecord).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            "Inventory low stock alert",
            expect.objectContaining({
                variantId: variantId.toHexString(),
                stockQuantity: 2,
                lowStockThreshold: 3,
            })
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("updates inventory to zero and syncs catalog.variant.isInStock to false", async () => {
        const variantId = new ObjectId("65f000000000000000000131");
        const productId = new ObjectId("65f000000000000000000231");
        const catalogAdapter = {
            findVariantForInventory: vi.fn().mockResolvedValue({
                _id: variantId,
                productId,
                status: "active",
                isDeleted: false,
                isInStock: true,
            }),
            syncCatalogAvailability: vi.fn().mockResolvedValue({
                variantId,
                productId,
                isInStock: false,
            }),
        };
        const inventoryRepository = {
            findInventoryRecordsByVariantIds: vi.fn().mockResolvedValue([
                {
                    _id: new ObjectId("65f000000000000000000133"),
                    variantId,
                    stockQuantity: 5,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ]),
            findInventoryRecordByVariantId: vi
                .fn()
                .mockResolvedValueOnce({
                    _id: new ObjectId("65f000000000000000000134"),
                    variantId,
                    stockQuantity: 5,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                })
                .mockResolvedValueOnce({
                    _id: new ObjectId("65f000000000000000000134"),
                    variantId,
                    stockQuantity: 0,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
                }),
            updateInventoryRecordByVariantId: vi
                .fn()
                .mockResolvedValue({ acknowledged: true }),
        };
        const readInventoryByVariantIds = createReadInventoryByVariantIdsService({
            inventoryRepository,
        });
        const updateInventoryRecord = createUpdateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
            logger: {
                warn: vi.fn(),
                error: vi.fn(),
            },
        });

        const batch = await readInventoryByVariantIds({
            variantIds: [variantId.toHexString(), "65f000000000000000000132"],
        });
        const updated = await updateInventoryRecord({
            variantId: variantId.toHexString(),
            input: {
                stockQuantity: 0,
            },
        });

        expect(batch).toEqual([
            {
                variantId: variantId.toHexString(),
                stockQuantity: 5,
                isInStock: true,
            },
            {
                variantId: "65f000000000000000000132",
                stockQuantity: 0,
                isInStock: false,
            },
        ]);
        expect(updated).toMatchObject({
            variantId: variantId.toHexString(),
            stockQuantity: 0,
            isInStock: false,
            isLowStock: true,
        });
        expect(catalogAdapter.syncCatalogAvailability).toHaveBeenCalledWith({
            variantId: variantId.toHexString(),
            isInStock: false,
        });
        expect(inventoryRepository.updateInventoryRecordByVariantId).toHaveBeenCalledWith({
            variantId: variantId.toHexString(),
            updates: {
                stockQuantity: 0,
            },
        });
    });

    it("returns safe fallback values when inventory data is missing", async () => {
        const variantId = "65f000000000000000000121";
        const inventoryRepository = {
            findInventoryRecordByVariantId: vi.fn().mockResolvedValue(null),
        };
        const getInventoryRecord = createGetInventoryRecordService({
            inventoryRepository,
        });

        const result = await getInventoryRecord({ variantId });

        expect(result).toEqual({
            id: null,
            variantId,
            stockQuantity: 0,
            lowStockThreshold: null,
            isInStock: false,
            isLowStock: false,
            recordExists: false,
            createdAt: null,
            updatedAt: null,
        });
    });

    it("hydrates low-stock list with catalog display fields and keeps fallbacks when missing", async () => {
        const firstVariantId = new ObjectId("65f000000000000000000171");
        const secondVariantId = new ObjectId("65f000000000000000000172");
        const inventoryRepository = {
            findInventoryRecordsByFilter: vi.fn().mockResolvedValue([
                {
                    _id: new ObjectId("65f000000000000000000173"),
                    variantId: firstVariantId,
                    stockQuantity: 1,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
                },
                {
                    _id: new ObjectId("65f000000000000000000174"),
                    variantId: secondVariantId,
                    stockQuantity: 0,
                    lowStockThreshold: 2,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
                },
            ]),
            countInventoryRecordsByFilter: vi.fn().mockResolvedValue(2),
        };
        const catalogAdapter = {
            findCatalogDisplayByVariantIds: vi.fn().mockResolvedValue([
                {
                    variantId: firstVariantId.toHexString(),
                    productName: "Hydrated Product",
                    productGroupCode: "HYDRATED_PHONE",
                    sku: "HYD-BLK-128",
                    variantLabel: "8GB / 128GB / Black",
                },
            ]),
        };
        const listLowStockInventory = createListLowStockInventoryService({
            inventoryRepository,
            catalogAdapter,
            logger: {
                warn: vi.fn(),
            },
        });

        const result = await listLowStockInventory();

        expect(inventoryRepository.findInventoryRecordsByFilter).toHaveBeenCalledWith(
            expect.objectContaining({
                limit: 20,
                skip: 0,
            })
        );
        expect(inventoryRepository.countInventoryRecordsByFilter).toHaveBeenCalledWith(
            expect.objectContaining({
                filter: expect.any(Object),
            })
        );
        expect(catalogAdapter.findCatalogDisplayByVariantIds).toHaveBeenCalledWith({
            variantIds: [firstVariantId.toHexString(), secondVariantId.toHexString()],
        });
        expect(result).toEqual({
            data: [
                expect.objectContaining({
                    variantId: firstVariantId.toHexString(),
                    stockQuantity: 1,
                    productName: "Hydrated Product",
                    productGroupCode: "HYDRATED_PHONE",
                    sku: "HYD-BLK-128",
                    variantLabel: "8GB / 128GB / Black",
                }),
                expect.objectContaining({
                    variantId: secondVariantId.toHexString(),
                    stockQuantity: 0,
                    productName: null,
                    productGroupCode: null,
                    sku: null,
                    variantLabel: null,
                }),
            ],
            meta: {
                page: 1,
                limit: 20,
                total: 2,
                totalPages: 1,
            },
        });
    });

    it("rejects create when the catalog variant does not exist", async () => {
        const variantId = "65f000000000000000000141";
        const inventoryRepository = {
            findInventoryRecordByVariantId: vi.fn(),
            createInventoryRecord: vi.fn(),
        };
        const catalogAdapter = {
            findVariantForInventory: vi.fn().mockResolvedValue(null),
            syncCatalogAvailability: vi.fn(),
        };
        const createInventoryRecord = createCreateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
        });

        await expect(
            createInventoryRecord({
                input: {
                    variantId,
                    stockQuantity: 1,
                },
            })
        ).rejects.toMatchObject({
            code: "INVENTORY_CATALOG_VARIANT_NOT_FOUND",
            httpStatus: 404,
        });
        expect(inventoryRepository.createInventoryRecord).not.toHaveBeenCalled();
        expect(catalogAdapter.syncCatalogAvailability).not.toHaveBeenCalled();
    });

    it("rejects update when the catalog variant is soft-deleted", async () => {
        const variantId = "65f000000000000000000151";
        const inventoryRepository = {
            findInventoryRecordByVariantId: vi.fn().mockResolvedValue({
                _id: new ObjectId("65f000000000000000000152"),
                variantId: new ObjectId(variantId),
                stockQuantity: 4,
                lowStockThreshold: 3,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            }),
            updateInventoryRecordByVariantId: vi.fn(),
        };
        const catalogAdapter = {
            findVariantForInventory: vi.fn().mockResolvedValue({
                _id: new ObjectId(variantId),
                productId: new ObjectId("65f000000000000000000251"),
                status: "inactive",
                isDeleted: true,
                isInStock: false,
            }),
            syncCatalogAvailability: vi.fn(),
        };
        const updateInventoryRecord = createUpdateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
        });

        await expect(
            updateInventoryRecord({
                variantId,
                input: {
                    stockQuantity: 0,
                },
            })
        ).rejects.toMatchObject({
            code: "INVENTORY_CATALOG_VARIANT_NOT_FOUND",
            httpStatus: 404,
        });
        expect(inventoryRepository.updateInventoryRecordByVariantId).not.toHaveBeenCalled();
        expect(catalogAdapter.syncCatalogAvailability).not.toHaveBeenCalled();
    });

    it("returns sync failure after persisting inventory and does not attempt rollback", async () => {
        const variantId = new ObjectId("65f000000000000000000161");
        const productId = new ObjectId("65f000000000000000000261");
        const logger = {
            warn: vi.fn(),
            error: vi.fn(),
        };
        const inventoryRepository = {
            findInventoryRecordByVariantId: vi
                .fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    _id: new ObjectId("65f000000000000000000162"),
                    variantId,
                    stockQuantity: 6,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                }),
            createInventoryRecord: vi.fn().mockResolvedValue({ acknowledged: true }),
            deleteInventoryRecord: vi.fn(),
        };
        const catalogAdapter = {
            findVariantForInventory: vi.fn().mockResolvedValue({
                _id: variantId,
                productId,
                status: "active",
                isDeleted: false,
                isInStock: false,
            }),
            syncCatalogAvailability: vi.fn().mockRejectedValue(new Error("boom")),
        };
        const createInventoryRecord = createCreateInventoryRecordService({
            catalogAdapter,
            inventoryRepository,
            logger,
        });

        await expect(
            createInventoryRecord({
                input: {
                    variantId: variantId.toHexString(),
                    stockQuantity: 6,
                },
            })
        ).rejects.toMatchObject({
            code: "INVENTORY_CATALOG_SYNC_FAILED",
            httpStatus: 500,
            meta: {
                variantId: variantId.toHexString(),
                productId: productId.toHexString(),
                stockQuantity: 6,
                isInStock: true,
            },
        });
        expect(inventoryRepository.createInventoryRecord).toHaveBeenCalled();
        expect(inventoryRepository.deleteInventoryRecord).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            "Inventory catalog availability sync failed",
            expect.objectContaining({
                variantId: variantId.toHexString(),
                productId: productId.toHexString(),
                stockQuantity: 6,
                derivedIsInStock: true,
            })
        );
    });
});
