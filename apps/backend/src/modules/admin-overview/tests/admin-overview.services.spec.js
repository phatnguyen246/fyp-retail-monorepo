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
        });
        expect(orderRepository.findOrdersByFilter).toHaveBeenCalledWith({
            sort: {
                createdAt: -1,
            },
            limit: 5,
        });
        expect(inventoryRepository.findLowStockInventoryRecords).toHaveBeenCalledWith({
            limit: 6,
        });
    });
});
