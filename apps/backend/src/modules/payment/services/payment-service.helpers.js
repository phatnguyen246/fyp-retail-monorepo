import {
    DEFAULT_PAYMENT_CURRENCY,
    PAYMENT_STATUSES,
} from "../constants/index.js";
import { createPaymentConfigurationError, createPaymentConflictError, createPaymentForbiddenError, createPaymentNotFoundError } from "./payment-service.errors.js";

export function assertCreateUrlRequesterAllowed(requester = {}) {
    if (requester?.role === "admin") {
        throw createPaymentForbiddenError(
            "Admin accounts must use dedicated payment operations"
        );
    }
}

export function assertOrderAccessibleForCreateUrl({ order, requester, reference } = {}) {
    if (!order) {
        throw createPaymentNotFoundError(`Order not found: ${reference}`, {
            reference,
        });
    }

    assertCreateUrlRequesterAllowed(requester);

    if (requester?.role === "customer" && requester?.accountId) {
        if (order.accountId !== requester.accountId) {
            throw createPaymentNotFoundError(`Order not found: ${reference}`, {
                reference,
            });
        }

        return order;
    }

    if (order.accountId !== null) {
        throw createPaymentNotFoundError(`Order not found: ${reference}`, {
            reference,
        });
    }

    return order;
}

export function assertOrderEligibleForVnpayUrl(order) {
    if (order?.paymentMethod !== "vnpay") {
        throw createPaymentConflictError("Order payment method is not vnpay", {
            orderId: order?._id?.toHexString?.() ?? null,
            paymentMethod: order?.paymentMethod ?? null,
        });
    }

    if (order?.paymentStatus && ["paid", "failed", "cancelled"].includes(order.paymentStatus)) {
        throw createPaymentConflictError(
            `Order payment is already terminal: ${order.paymentStatus}`,
            {
                orderId: order?._id?.toHexString?.() ?? null,
                paymentStatus: order?.paymentStatus ?? null,
            }
        );
    }

    if (order?.orderStatus === "cancelled" || order?.orderStatus === "completed") {
        throw createPaymentConflictError(
            `Order is no longer payable from status: ${order?.orderStatus ?? "unknown"}`,
            {
                orderId: order?._id?.toHexString?.() ?? null,
                orderStatus: order?.orderStatus ?? null,
            }
        );
    }

    if (typeof order?.grandTotal !== "number" || order.grandTotal <= 0) {
        throw createPaymentConflictError("Order amount must be greater than zero", {
            orderId: order?._id?.toHexString?.() ?? null,
            grandTotal: order?.grandTotal ?? null,
        });
    }

    return order;
}

export function buildPaymentProviderFields(payload = {}) {
    return {
        providerTransactionNo: payload.vnp_TransactionNo || null,
        providerResponseCode: payload.vnp_ResponseCode || null,
        providerTransactionStatus: payload.vnp_TransactionStatus || null,
        providerBankCode: payload.vnp_BankCode || null,
        providerBankTranNo: payload.vnp_BankTranNo || null,
        providerCardType: payload.vnp_CardType || null,
        payDate: payload.vnp_PayDate || null,
        lastPayload: payload,
    };
}

export function ensureVnpayConfig(config) {
    if (config?.isConfigured) {
        return config;
    }

    throw createPaymentConfigurationError(
        "Missing VNPAY configuration environment variables",
        {
            missingKeys: config?.missingKeys ?? [],
        }
    );
}

export async function rollbackDecrementedStock({
    inventoryAdapter,
    adjustedItems = [],
    logger = console,
} = {}) {
    for (const item of adjustedItems) {
        try {
            await inventoryAdapter.incrementStockQuantityByVariantId({
                variantId: item.variantId,
                quantity: item.quantity,
            });
        } catch (error) {
            logger.error?.("Failed to rollback payment stock commit", {
                variantId: item.variantId,
                quantity: item.quantity,
                error: {
                    message: error?.message ?? "Unknown error",
                    code: error?.code ?? null,
                },
            });
        }
    }
}

export function createPaymentSummaryView(payment) {
    return {
        id: payment?._id?.toHexString?.() ?? null,
        paymentCode: payment?.paymentCode ?? null,
        orderId: payment?.orderId?.toHexString?.() ?? null,
        orderCode: payment?.orderCode ?? null,
        paymentMethod: payment?.paymentMethod ?? null,
        provider: payment?.provider ?? null,
        amount: payment?.amount ?? 0,
        currency: payment?.currency ?? DEFAULT_PAYMENT_CURRENCY,
        status:
            typeof payment?.status === "string" && PAYMENT_STATUSES.includes(payment.status)
                ? payment.status
                : null,
        providerTxnRef: payment?.providerTxnRef ?? null,
        createdAt: payment?.createdAt ?? null,
        updatedAt: payment?.updatedAt ?? null,
    };
}
