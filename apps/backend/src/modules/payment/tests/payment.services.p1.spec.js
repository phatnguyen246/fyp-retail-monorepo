import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createAdminReconcileVnpayPaymentService } from "../services/admin-reconcile-vnpay-payment.service.js";
import { createCreateVnpayPaymentUrlService } from "../services/create-vnpay-payment-url.service.js";
import { reconcilePersistedVnpayResult } from "../services/payment-service.helpers.js";

function createVnpayEnv() {
    return {
        VNP_TMNCODE: "TSTCODE",
        VNP_HASH_SECRET: "SECRETKEY123",
        VNP_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        VNP_API_URL: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
        VNP_RETURN_URL: "https://retail.local/payment/return",
        VNP_VERSION: "2.1.0",
        VNP_LOCALE: "vn",
    };
}

describe("payment services P1", () => {
    describe("createCreateVnpayPaymentUrlService", () => {
        it("throws PAYMENT_CONFLICT when latest payment is terminal", async () => {
            const service = createCreateVnpayPaymentUrlService({
                checkoutAdapter: {
                    createInitialPaymentForOrder: vi.fn(),
                },
                env: createVnpayEnv(),
                orderAdapter: {
                    findOrderById: vi.fn().mockResolvedValue({
                        _id: new ObjectId("65f000000000000000003001"),
                        orderCode: "ORD-1",
                        accountId: "acc-1",
                        paymentMethod: "vnpay",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                        grandTotal: 100000,
                    }),
                },
                paymentRepository: {
                    findLatestPaymentByOrderId: vi.fn().mockResolvedValue({
                        _id: new ObjectId("65f000000000000000003002"),
                        paymentCode: "PAY-1",
                        provider: "vnpay",
                        status: "paid",
                        orderInfo: "Order payment ORD-1",
                        providerTxnRef: "PAY-1",
                        providerTransactionDate: "20260423010101",
                    }),
                    updatePaymentById: vi.fn(),
                },
                validation: {
                    parseCreateVnpayPaymentUrlInput: vi.fn().mockReturnValue({
                        orderId: "65f000000000000000003001",
                        orderCode: null,
                        bankCode: null,
                    }),
                },
            });

            await expect(
                service({
                    input: {
                        orderId: "65f000000000000000003001",
                    },
                    requester: {
                        role: "customer",
                        accountId: "acc-1",
                    },
                    ipAddr: "127.0.0.1",
                })
            ).rejects.toMatchObject({
                httpStatus: 409,
                code: "PAYMENT_CONFLICT",
            });
        });

        it("creates url for pending payment and updates provider transaction metadata", async () => {
            const orderId = new ObjectId("65f000000000000000003011");
            const paymentId = new ObjectId("65f000000000000000003012");
            const updatePaymentById = vi.fn().mockResolvedValue(undefined);
            const service = createCreateVnpayPaymentUrlService({
                checkoutAdapter: {
                    createInitialPaymentForOrder: vi.fn().mockResolvedValue({
                        _id: paymentId,
                        paymentCode: "PAY-11",
                        provider: "vnpay",
                        status: "pending",
                        orderInfo: null,
                        providerTxnRef: null,
                        providerTransactionDate: null,
                        currency: "VND",
                    }),
                },
                env: createVnpayEnv(),
                orderAdapter: {
                    findOrderById: vi.fn().mockResolvedValue({
                        _id: orderId,
                        orderCode: "ORD-11",
                        accountId: null,
                        paymentMethod: "vnpay",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                        grandTotal: 200000,
                    }),
                },
                paymentRepository: {
                    findLatestPaymentByOrderId: vi.fn().mockResolvedValue(null),
                    updatePaymentById,
                },
                validation: {
                    parseCreateVnpayPaymentUrlInput: vi.fn().mockReturnValue({
                        orderId: orderId.toHexString(),
                        orderCode: null,
                        bankCode: null,
                    }),
                },
            });

            const result = await service({
                input: {
                    orderId: orderId.toHexString(),
                },
                requester: {
                    role: "guest",
                },
                ipAddr: "127.0.0.1",
            });

            expect(result).toMatchObject({
                orderId: orderId.toHexString(),
                orderCode: "ORD-11",
                paymentCode: "PAY-11",
            });
            expect(result.paymentUrl).toContain("sandbox.vnpayment.vn");
            expect(updatePaymentById).toHaveBeenCalledTimes(1);
        });
    });

    describe("createAdminReconcileVnpayPaymentService", () => {
        it("returns noop when latest payment is not pending", async () => {
            const orderId = new ObjectId("65f000000000000000003021");
            const service = createAdminReconcileVnpayPaymentService({
                env: createVnpayEnv(),
                orderAdapter: {
                    findOrderById: vi.fn().mockResolvedValue({
                        _id: orderId,
                        orderCode: "ORD-21",
                        paymentMethod: "vnpay",
                    }),
                },
                paymentRepository: {
                    findLatestPaymentByOrderId: vi.fn().mockResolvedValue({
                        _id: new ObjectId("65f000000000000000003022"),
                        paymentCode: "PAY-21",
                        orderId,
                        orderCode: "ORD-21",
                        paymentMethod: "vnpay",
                        provider: "vnpay",
                        amount: 200000,
                        currency: "VND",
                        status: "paid",
                        providerTxnRef: "PAY-21",
                        providerTransactionDate: "20260423010101",
                        createdAt: new Date("2026-04-23T00:00:00.000Z"),
                        updatedAt: new Date("2026-04-23T00:00:00.000Z"),
                    }),
                    findPaymentById: vi.fn(),
                },
            });

            const result = await service({
                orderId: orderId.toHexString(),
                ipAddr: "127.0.0.1",
            });

            expect(result.status).toBe("noop");
            expect(result.payment.status).toBe("paid");
        });
    });

    describe("reconcilePersistedVnpayResult", () => {
        it("marks payment/order paid and commits stock when callback is successful", async () => {
            const paymentRepository = {
                updatePaymentByIdWithOperators: vi.fn().mockResolvedValue(undefined),
            };
            const orderAdapter = {
                updateOrderByIdWithOperators: vi.fn().mockResolvedValue(undefined),
            };
            const inventoryAdapter = {
                decrementStockQuantityByVariantIdIfAvailable: vi
                    .fn()
                    .mockResolvedValue({
                        ok: true,
                    }),
                incrementStockQuantityByVariantId: vi.fn(),
            };

            const result = await reconcilePersistedVnpayResult({
                inventoryAdapter,
                logger: {
                    error: vi.fn(),
                },
                order: {
                    _id: new ObjectId("65f000000000000000003031"),
                    orderStatus: "pending",
                    paymentStatus: "pending",
                    stockCommitStatus: "not_committed",
                    items: [
                        {
                            variantId: new ObjectId("65f000000000000000003032"),
                            quantity: 1,
                        },
                    ],
                },
                orderAdapter,
                payment: {
                    _id: new ObjectId("65f000000000000000003033"),
                    status: "pending",
                },
                paymentRepository,
                payload: {
                    vnp_ResponseCode: "00",
                    vnp_TransactionStatus: "00",
                    vnp_TransactionNo: "123",
                },
            });

            expect(paymentRepository.updatePaymentByIdWithOperators).toHaveBeenCalledTimes(1);
            expect(orderAdapter.updateOrderByIdWithOperators).toHaveBeenCalledTimes(1);
            expect(inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable).toHaveBeenCalled();
            expect(result).toEqual({
                paymentStatus: "paid",
                orderPaymentStatus: "paid",
            });
        });

        it("keeps paid state unchanged when a failure callback arrives after payment already paid", async () => {
            const paymentRepository = {
                updatePaymentByIdWithOperators: vi.fn(),
            };
            const orderAdapter = {
                updateOrderByIdWithOperators: vi.fn(),
            };

            const result = await reconcilePersistedVnpayResult({
                inventoryAdapter: {
                    decrementStockQuantityByVariantIdIfAvailable: vi.fn(),
                    incrementStockQuantityByVariantId: vi.fn(),
                },
                order: {
                    _id: new ObjectId("65f000000000000000003041"),
                    orderStatus: "pending",
                    paymentStatus: "paid",
                },
                orderAdapter,
                payment: {
                    _id: new ObjectId("65f000000000000000003042"),
                    status: "paid",
                },
                paymentRepository,
                payload: {
                    vnp_ResponseCode: "24",
                    vnp_TransactionStatus: "02",
                },
            });

            expect(paymentRepository.updatePaymentByIdWithOperators).not.toHaveBeenCalled();
            expect(orderAdapter.updateOrderByIdWithOperators).not.toHaveBeenCalled();
            expect(result).toEqual({
                paymentStatus: "paid",
                orderPaymentStatus: "paid",
            });
        });
    });
});
