import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createGetAdminOverviewService } from "../services/get-admin-overview.service.js";

describe("admin overview services", () => {
    it("aggregates product, order, and enriched low-stock preview data", async () => {
        const lowStockVariantId = new ObjectId("65f000000000000000000801");
        const productId = new ObjectId("65f000000000000000000811");
        const productRepository = {
            countProductsByFilter: vi
                .fn()
                .mockResolvedValueOnce(12)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(7)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(4),
            findProductsByIds: vi.fn().mockResolvedValue([
                {
                    _id: productId,
                    productGroupCode: "APPLE_IPHONE_16",
                    title: "iPhone 16",
                },
            ]),
        };
        const variantRepository = {
            findVariantsByIds: vi.fn().mockResolvedValue([
                {
                    _id: lowStockVariantId,
                    productId,
                    sku: "IP16-BLK-128",
                    variantAttributes: {
                        ram: "8GB",
                        rom: "128GB",
                        color: "Black",
                    },
                },
            ]),
        };
        const orderRepository = {
            countOrdersByFilter: vi
                .fn()
                .mockResolvedValueOnce(20)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(9)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(6)
                .mockResolvedValueOnce(11)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3),
            findOrdersByFilter: vi.fn().mockResolvedValue([
                {
                    _id: new ObjectId("65f000000000000000000821"),
                    orderCode: "ORD-20260402-000001",
                    recipientName: "Nguyen Van A",
                    paymentMethod: "vnpay",
                    paymentStatus: "pending",
                    orderStatus: "pending",
                    grandTotal: 22990000,
                    createdAt: new Date("2026-04-02T08:00:00.000Z"),
                    updatedAt: new Date("2026-04-02T08:00:00.000Z"),
                    items: [],
                },
            ]),
        };
        const inventoryRepository = {
            countInventoryRecords: vi.fn().mockResolvedValue(18),
            countLowStockInventoryRecords: vi.fn().mockResolvedValue(6),
            countOutOfStockInventoryRecords: vi.fn().mockResolvedValue(2),
            findLowStockInventoryRecords: vi.fn().mockResolvedValue([
                {
                    _id: new ObjectId("65f000000000000000000831"),
                    variantId: lowStockVariantId,
                    stockQuantity: 1,
                    lowStockThreshold: 3,
                    createdAt: new Date("2026-04-01T08:00:00.000Z"),
                    updatedAt: new Date("2026-04-02T07:00:00.000Z"),
                },
            ]),
        };
        const getAdminOverview = createGetAdminOverviewService({
            productRepository,
            variantRepository,
            orderRepository,
            inventoryRepository,
        });

        const result = await getAdminOverview();

        expect(result).toEqual({
            productMeta: {
                total: 12,
                draft: 2,
                active: 7,
                inactive: 1,
                discontinued: 2,
                deleted: 3,
                outOfStock: 4,
            },
            orderMeta: {
                total: 20,
                pending: 5,
                confirmed: 4,
                completed: 9,
                cancelled: 2,
                vnpayPending: 3,
            },
            paymentMeta: {
                total: 20,
                pending: 6,
                paid: 11,
                failed: 1,
                cancelled: 2,
                vnpayPending: 3,
            },
            lowStockMeta: {
                total: 6,
                outOfStock: 2,
            },
            recentOrders: [
                expect.objectContaining({
                    orderCode: "ORD-20260402-000001",
                    recipientName: "Nguyen Van A",
                    orderStatus: "pending",
                    paymentStatus: "pending",
                    grandTotal: 22990000,
                }),
            ],
            lowStockRecords: [
                expect.objectContaining({
                    variantId: lowStockVariantId.toHexString(),
                    productId: productId.toHexString(),
                    productName: "iPhone 16",
                    productGroupCode: "APPLE_IPHONE_16",
                    sku: "IP16-BLK-128",
                    variantLabel: "8GB / 128GB / Black",
                    stockQuantity: 1,
                    lowStockThreshold: 3,
                    isLowStock: true,
                }),
            ],
            charts: {
                productStatus: {
                    total: 12,
                    labels: ["draft", "active", "inactive", "discontinued"],
                    datasets: [
                        {
                            key: "productStatus",
                            label: "productCount",
                            data: [2, 7, 1, 2],
                        },
                    ],
                    breakdown: [
                        { key: "draft", value: 2 },
                        { key: "active", value: 7 },
                        { key: "inactive", value: 1 },
                        { key: "discontinued", value: 2 },
                    ],
                },
                orderStatus: {
                    total: 20,
                    labels: ["pending", "confirmed", "completed", "cancelled"],
                    datasets: [
                        {
                            key: "orderStatus",
                            label: "orderCount",
                            data: [5, 4, 9, 2],
                        },
                    ],
                    breakdown: [
                        { key: "pending", value: 5 },
                        { key: "confirmed", value: 4 },
                        { key: "completed", value: 9 },
                        { key: "cancelled", value: 2 },
                    ],
                },
                paymentStatus: {
                    total: 20,
                    highlighted: {
                        vnpayPending: 3,
                    },
                    labels: ["pending", "paid", "failed", "cancelled"],
                    datasets: [
                        {
                            key: "paymentStatus",
                            label: "orderCount",
                            data: [6, 11, 1, 2],
                        },
                    ],
                    breakdown: [
                        { key: "pending", value: 6 },
                        { key: "paid", value: 11 },
                        { key: "failed", value: 1 },
                        { key: "cancelled", value: 2 },
                    ],
                },
                inventoryRisk: {
                    total: 18,
                    labels: ["healthy", "lowStock", "outOfStock"],
                    datasets: [
                        {
                            key: "inventoryRisk",
                            label: "inventoryRecordCount",
                            data: [12, 4, 2],
                        },
                    ],
                    breakdown: [
                        { key: "healthy", value: 12 },
                        { key: "lowStock", value: 4 },
                        { key: "outOfStock", value: 2 },
                    ],
                },
                lowStockTop: {
                    labels: ["iPhone 16 (8GB / 128GB / Black)"],
                    datasets: [
                        {
                            key: "stockQuantity",
                            label: "stockQuantity",
                            data: [1],
                        },
                        {
                            key: "lowStockThreshold",
                            label: "lowStockThreshold",
                            data: [3],
                        },
                        {
                            key: "shortageQuantity",
                            label: "shortageQuantity",
                            data: [2],
                        },
                    ],
                    records: [
                        expect.objectContaining({
                            variantId: lowStockVariantId.toHexString(),
                            chartLabel: "iPhone 16 (8GB / 128GB / Black)",
                            shortageQuantity: 2,
                            stockQuantity: 1,
                            lowStockThreshold: 3,
                        }),
                    ],
                },
            },
        });
        expect(orderRepository.findOrdersByFilter).toHaveBeenCalledWith({
            sort: {
                createdAt: -1,
            },
            limit: 5,
        });
        expect(inventoryRepository.countInventoryRecords).toHaveBeenCalledWith();
        expect(inventoryRepository.findLowStockInventoryRecords).toHaveBeenCalledWith({
            limit: 6,
        });
    });
});
