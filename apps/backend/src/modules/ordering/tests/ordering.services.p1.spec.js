import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createCreateOrderService } from "../services/create-order.service.js";
import {
    assertAdminStatusTransition,
    assertOrderAccessibleForPublicDetail,
    createOrderWithRetry,
} from "../services/ordering-service.helpers.js";

describe("ordering services P1", () => {
    describe("createOrderWithRetry", () => {
        it("retries on duplicate key and succeeds in next attempt", async () => {
            const orderRepository = {
                createOrder: vi
                    .fn()
                    .mockRejectedValueOnce({
                        code: 11000,
                    })
                    .mockResolvedValueOnce(undefined),
            };

            const result = await createOrderWithRetry({
                orderRepository,
                baseDocument: {
                    recipientName: "User A",
                    email: "user@example.com",
                    phoneNumber: "0123456789",
                    shippingAddressLine: "123 Street",
                    paymentMethod: "cod",
                    paymentStatus: "pending",
                    orderStatus: "pending",
                    items: [],
                    subtotal: 0,
                    discountTotal: 0,
                    shippingFee: 0,
                    grandTotal: 0,
                    statusLogs: [],
                },
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
                random: () => 0.123456,
                maxAttempts: 3,
            });

            expect(orderRepository.createOrder).toHaveBeenCalledTimes(2);
            expect(result.orderCode).toContain("ORD-20260101");
        });
    });

    describe("assertAdminStatusTransition", () => {
        it("blocks unpaid VNPAY transitions", () => {
            expect(() =>
                assertAdminStatusTransition({
                    order: {
                        _id: new ObjectId(),
                        paymentMethod: "vnpay",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                    },
                    toStatus: "confirmed",
                })
            ).toThrow(/Cannot transition unpaid VNPAY order/);
        });

        it("allows pending->confirmed and confirmed->completed only", () => {
            expect(() =>
                assertAdminStatusTransition({
                    order: {
                        _id: new ObjectId(),
                        paymentMethod: "cod",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                    },
                    toStatus: "confirmed",
                })
            ).not.toThrow();

            expect(() =>
                assertAdminStatusTransition({
                    order: {
                        _id: new ObjectId(),
                        paymentMethod: "cod",
                        paymentStatus: "pending",
                        orderStatus: "confirmed",
                    },
                    toStatus: "completed",
                })
            ).not.toThrow();

            expect(() =>
                assertAdminStatusTransition({
                    order: {
                        _id: new ObjectId(),
                        paymentMethod: "cod",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                    },
                    toStatus: "completed",
                })
            ).toThrow(/Cannot transition order/);
        });
    });

    describe("assertOrderAccessibleForPublicDetail", () => {
        it("returns not found when customer accesses another customer's order", () => {
            expect(() =>
                assertOrderAccessibleForPublicDetail({
                    order: {
                        _id: new ObjectId(),
                        accountId: "acc-owner",
                    },
                    requester: {
                        role: "customer",
                        accountId: "acc-other",
                    },
                    orderId: "order-1",
                })
            ).toThrow(/Order not found/);
        });
    });

    describe("createCreateOrderService", () => {
        it("does not fail checkout when cart cleanup fails and sendEmail fails asynchronously", async () => {
            const variantId = "65f000000000000000002001";
            const productId = "65f000000000000000002002";
            const logger = {
                error: vi.fn(),
            };
            const orderRepository = {
                createOrder: vi.fn().mockResolvedValue(undefined),
                deleteOrderById: vi.fn().mockResolvedValue(undefined),
            };
            const service = createCreateOrderService({
                cartAdapter: {
                    readCheckoutItems: vi.fn().mockResolvedValue({
                        items: [
                            {
                                variantId,
                                quantity: 1,
                            },
                        ],
                        missingVariantIds: [],
                    }),
                    removeCheckedOutItems: vi.fn().mockRejectedValue(
                        new Error("Cart cleanup failed")
                    ),
                },
                catalogAdapter: {
                    readVariantsForOrder: vi.fn().mockResolvedValue([
                        {
                            variantId,
                            variantExists: true,
                            variantIsDeleted: false,
                            variantStatus: "active",
                            productExists: true,
                            productIsDeleted: false,
                            productStatus: "active",
                            productId,
                            productTitle: "Phone A",
                            variantAttributes: {
                                color: "Black",
                            },
                            salePrice: 100,
                            sku: "SKU-A",
                            thumbnailUrl: null,
                        },
                    ]),
                },
                inventoryAdapter: {
                    readInventoryByVariantIds: vi.fn().mockResolvedValue([
                        {
                            variantId,
                            stockQuantity: 10,
                            isInStock: true,
                        },
                    ]),
                    decrementStockQuantityByVariantIdIfAvailable: vi
                        .fn()
                        .mockResolvedValue({
                            ok: true,
                        }),
                    incrementStockQuantityByVariantId: vi.fn().mockResolvedValue(undefined),
                },
                orderRepository,
                paymentCheckoutAdapter: {
                    createInitialPaymentForOrder: vi.fn().mockResolvedValue({
                        id: "pay-1",
                    }),
                },
                validation: {
                    parseCreateOrderInput: vi.fn().mockReturnValue({
                        cartVariantIds: [variantId],
                        recipientName: "User A",
                        email: "user@example.com",
                        phoneNumber: "0123",
                        shippingAddressLine: "Street 1",
                        paymentMethod: "cod",
                    }),
                },
                sendEmail: vi.fn().mockResolvedValue({
                    success: false,
                    error: new Error("SMTP failure"),
                }),
                logger,
            });

            const result = await service({
                owner: {
                    ownerType: "guest",
                    ownerKey: "guest-order-1",
                },
                requester: {
                    role: "guest",
                },
                input: {
                    cartVariantIds: [variantId],
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(result).toMatchObject({
                paymentMethod: "cod",
                orderStatus: "pending",
                paymentStatus: "pending",
            });
            expect(orderRepository.createOrder).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalled();
        });

        it("rolls back order and stock when payment initialization fails", async () => {
            const variantId = "65f000000000000000002011";
            const productId = "65f000000000000000002012";
            const decrement = vi.fn().mockResolvedValue({
                ok: true,
            });
            const increment = vi.fn().mockResolvedValue(undefined);
            const orderRepository = {
                createOrder: vi.fn().mockResolvedValue(undefined),
                deleteOrderById: vi.fn().mockResolvedValue(undefined),
            };
            const service = createCreateOrderService({
                cartAdapter: {
                    readCheckoutItems: vi.fn().mockResolvedValue({
                        items: [
                            {
                                variantId,
                                quantity: 1,
                            },
                        ],
                        missingVariantIds: [],
                    }),
                    removeCheckedOutItems: vi.fn(),
                },
                catalogAdapter: {
                    readVariantsForOrder: vi.fn().mockResolvedValue([
                        {
                            variantId,
                            variantExists: true,
                            variantIsDeleted: false,
                            variantStatus: "active",
                            productExists: true,
                            productIsDeleted: false,
                            productStatus: "active",
                            productId,
                            productTitle: "Phone B",
                            variantAttributes: {
                                color: "Blue",
                            },
                            salePrice: 150,
                            sku: "SKU-B",
                            thumbnailUrl: null,
                        },
                    ]),
                },
                inventoryAdapter: {
                    readInventoryByVariantIds: vi.fn().mockResolvedValue([
                        {
                            variantId,
                            stockQuantity: 10,
                            isInStock: true,
                        },
                    ]),
                    decrementStockQuantityByVariantIdIfAvailable: decrement,
                    incrementStockQuantityByVariantId: increment,
                },
                orderRepository,
                paymentCheckoutAdapter: {
                    createInitialPaymentForOrder: vi
                        .fn()
                        .mockRejectedValue(new Error("Payment insert failed")),
                },
                validation: {
                    parseCreateOrderInput: vi.fn().mockReturnValue({
                        cartVariantIds: [variantId],
                        recipientName: "User B",
                        email: "userb@example.com",
                        phoneNumber: "0999",
                        shippingAddressLine: "Street 2",
                        paymentMethod: "cod",
                    }),
                },
                logger: {
                    error: vi.fn(),
                },
            });

            await expect(
                service({
                    owner: {
                        ownerType: "guest",
                        ownerKey: "guest-order-2",
                    },
                    requester: {
                        role: "guest",
                    },
                    input: {
                        cartVariantIds: [variantId],
                    },
                })
            ).rejects.toThrow("Payment insert failed");

            expect(decrement).toHaveBeenCalledTimes(1);
            expect(increment).toHaveBeenCalledTimes(1);
            expect(orderRepository.deleteOrderById).toHaveBeenCalledTimes(1);
        });
    });
});
