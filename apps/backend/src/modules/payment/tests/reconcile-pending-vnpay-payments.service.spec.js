import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createReconcilePendingVnpayPaymentsService } from "../services/reconcile-pending-vnpay-payments.service.js";

const PAYMENT_ENV = {
    VNP_VERSION: "2.1.0",
    VNP_TMNCODE: "TESTTMN",
    VNP_HASH_SECRET: "secret-key",
    VNP_PAYMENT_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    VNP_API_URL: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
    VNP_RETURN_URL: "http://localhost:3000/payment/vnpay/return",
    VNP_IPN_URL: "http://localhost:3000/payment/vnpay/ipn",
    VNP_LOCALE: "vn",
    VNP_CURRENCY: "VND",
};

function signQueryDrResponse(response, secret) {
    const signData = [
        response.vnp_ResponseId,
        response.vnp_Command,
        response.vnp_ResponseCode,
        response.vnp_Message,
        response.vnp_TmnCode,
        response.vnp_TxnRef,
        response.vnp_Amount,
        response.vnp_BankCode ?? "",
        response.vnp_PayDate ?? "",
        response.vnp_TransactionNo ?? "",
        response.vnp_TransactionType ?? "",
        response.vnp_TransactionStatus ?? "",
        response.vnp_OrderInfo ?? "",
        response.vnp_PromotionCode ?? "",
        response.vnp_PromotionAmount ?? "",
    ].join("|");

    return crypto
        .createHmac("sha512", secret)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
}

function createPaymentFixture(overrides = {}) {
    return {
        _id: new ObjectId("65f000000000000000000905"),
        paymentCode: "PAY-20260316-010101",
        orderId: new ObjectId("65f000000000000000000904"),
        orderCode: "ORD-20260316-010101",
        orderInfo: "Order payment ORD 20260316 010101",
        provider: "vnpay",
        providerTxnRef: "PAY-20260316-010101",
        providerTransactionDate: "20260316070000",
        status: "pending",
        amount: 19990000,
        currency: "VND",
        createdAt: new Date("2026-03-16T00:00:00.000Z"),
        updatedAt: new Date("2026-03-16T00:00:00.000Z"),
        ...overrides,
    };
}

function createOrderFixture(overrides = {}) {
    return {
        _id: new ObjectId("65f000000000000000000904"),
        orderCode: "ORD-20260316-010101",
        orderStatus: "pending",
        paymentStatus: "pending",
        stockCommitStatus: "not_committed",
        items: [
            {
                variantId: new ObjectId("65f000000000000000000902"),
                quantity: 1,
            },
        ],
        ...overrides,
    };
}

function createSignedQueryResponse(overrides = {}) {
    const response = {
        vnp_ResponseId: "RESP0001",
        vnp_Command: "querydr",
        vnp_ResponseCode: "00",
        vnp_Message: "Success",
        vnp_TmnCode: PAYMENT_ENV.VNP_TMNCODE,
        vnp_TxnRef: "PAY-20260316-010101",
        vnp_Amount: "1999000000",
        vnp_BankCode: "NCB",
        vnp_PayDate: "20260316070100",
        vnp_TransactionNo: "123456789",
        vnp_TransactionType: "01",
        vnp_TransactionStatus: "00",
        vnp_OrderInfo: "Order payment ORD 20260316 010101",
        vnp_PromotionCode: "",
        vnp_PromotionAmount: "",
        ...overrides,
    };

    return {
        ...response,
        vnp_SecureHash: signQueryDrResponse(response, PAYMENT_ENV.VNP_HASH_SECRET),
    };
}

describe("reconcile pending VNPAY payments service", () => {
    it("marks a pending VNPAY payment as paid when querydr confirms success", async () => {
        const payment = createPaymentFixture();
        const order = createOrderFixture();
        const paymentRepository = {
            findPayments: vi.fn().mockResolvedValue([payment]),
            updatePaymentByIdWithOperators: vi.fn().mockResolvedValue({
                acknowledged: true,
            }),
        };
        const orderAdapter = {
            findOrderById: vi.fn().mockResolvedValue(order),
            updateOrderByIdWithOperators: vi.fn().mockResolvedValue({
                acknowledged: true,
            }),
        };
        const inventoryAdapter = {
            decrementStockQuantityByVariantIdIfAvailable: vi
                .fn()
                .mockResolvedValue({
                    acknowledged: true,
                }),
        };
        const fetchFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => createSignedQueryResponse(),
        });
        const reconcilePendingVnpayPayments =
            createReconcilePendingVnpayPaymentsService({
                env: PAYMENT_ENV,
                fetchFn,
                inventoryAdapter,
                logger: console,
                orderAdapter,
                paymentRepository,
            });

        const result = await reconcilePendingVnpayPayments();

        expect(result.counts.paid).toBe(1);
        expect(result.results[0]).toMatchObject({
            paymentCode: payment.paymentCode,
            status: "paid",
            transactionStatus: "00",
        });
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(paymentRepository.updatePaymentByIdWithOperators).toHaveBeenCalledOnce();
        expect(orderAdapter.updateOrderByIdWithOperators).toHaveBeenCalledOnce();
        expect(inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable).toHaveBeenCalledOnce();
    });

    it("leaves the payment pending when querydr reports an unfinished transaction", async () => {
        const payment = createPaymentFixture();
        const order = createOrderFixture();
        const paymentRepository = {
            findPayments: vi.fn().mockResolvedValue([payment]),
            updatePaymentByIdWithOperators: vi.fn(),
        };
        const orderAdapter = {
            findOrderById: vi.fn().mockResolvedValue(order),
            updateOrderByIdWithOperators: vi.fn(),
        };
        const inventoryAdapter = {
            decrementStockQuantityByVariantIdIfAvailable: vi.fn(),
        };
        const fetchFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () =>
                createSignedQueryResponse({
                    vnp_TransactionStatus: "01",
                }),
        });
        const reconcilePendingVnpayPayments =
            createReconcilePendingVnpayPaymentsService({
                env: PAYMENT_ENV,
                fetchFn,
                inventoryAdapter,
                logger: console,
                orderAdapter,
                paymentRepository,
            });

        const result = await reconcilePendingVnpayPayments();

        expect(result.counts.pending).toBe(1);
        expect(result.results[0]).toMatchObject({
            paymentCode: payment.paymentCode,
            status: "pending",
            transactionStatus: "01",
        });
        expect(paymentRepository.updatePaymentByIdWithOperators).not.toHaveBeenCalled();
        expect(orderAdapter.updateOrderByIdWithOperators).not.toHaveBeenCalled();
        expect(inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable).not.toHaveBeenCalled();
    });
});
