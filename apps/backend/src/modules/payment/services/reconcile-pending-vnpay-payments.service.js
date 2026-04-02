import crypto from "node:crypto";
import {
    createVnpayQueryDrPayload,
    executeVnpayQueryDr,
    verifyVnpayQueryDrResponse,
} from "../adapters/gateway/vnpay.client.js";
import { buildVnpayOrderInfo, resolveVnpayConfig } from "../utils/index.js";
import { formatDateYmdHis } from "../utils/vnpay-date.util.js";
import {
    ensureVnpayQueryConfig,
    reconcilePersistedVnpayResult,
} from "./payment-service.helpers.js";

const QUERY_PENDING_TRANSACTION_STATUSES = Object.freeze(["01", "05", "06"]);

function createRequestId() {
    return `RQ-${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;
}

function normalizePositiveInteger(value, fallbackValue) {
    const normalizedValue = Number.parseInt(value, 10);

    return Number.isInteger(normalizedValue) && normalizedValue > 0
        ? normalizedValue
        : fallbackValue;
}

function mapQueryOutcomeStatus(payload = {}) {
    const transactionStatus = payload?.vnp_TransactionStatus ?? null;

    if (payload?.vnp_ResponseCode !== "00") {
        return "api_error";
    }

    if (transactionStatus === "00") {
        return "paid";
    }

    if (QUERY_PENDING_TRANSACTION_STATUSES.includes(transactionStatus)) {
        return "pending";
    }

    return "failed";
}

function resolveProviderTransactionDate(payment) {
    if (
        typeof payment?.providerTransactionDate === "string" &&
        payment.providerTransactionDate.length > 0
    ) {
        return payment.providerTransactionDate;
    }

    const fallbackDate = payment?.updatedAt ?? payment?.createdAt ?? null;

    return fallbackDate ? formatDateYmdHis(new Date(fallbackDate)) : null;
}

export async function reconcileSinglePendingVnpayPayment({
    fetchFn = globalThis.fetch,
    inventoryAdapter,
    ipAddr = "127.0.0.1",
    logger = console,
    now = new Date(),
    order,
    orderAdapter,
    payment,
    paymentRepository,
    resolvedConfig,
} = {}) {
    const baseResult = {
        paymentCode: payment?.paymentCode ?? null,
        orderCode: payment?.orderCode ?? null,
        providerTxnRef: payment?.providerTxnRef ?? null,
    };
    const providerTransactionDate = resolveProviderTransactionDate(payment);

    if (!providerTransactionDate) {
        return {
            ...baseResult,
            status: "skipped",
            message: "Missing provider transaction date for VNPAY query",
        };
    }

    const queryPayload = createVnpayQueryDrPayload({
        requestId: createRequestId(),
        version: resolvedConfig.version,
        tmnCode: resolvedConfig.tmnCode,
        txnRef: payment.providerTxnRef ?? payment.paymentCode,
        transactionDate: providerTransactionDate,
        createDate: formatDateYmdHis(now),
        ipAddr,
        orderInfo: payment.orderInfo ?? buildVnpayOrderInfo(order),
        hashSecret: resolvedConfig.hashSecret,
    });
    const queryResponse = await executeVnpayQueryDr({
        apiUrl: resolvedConfig.apiUrl,
        payload: queryPayload,
        fetchFn,
    });
    const verificationResult = verifyVnpayQueryDrResponse(
        queryResponse,
        resolvedConfig.hashSecret
    );

    if (!verificationResult.isValid) {
        return {
            ...baseResult,
            status: "invalid_checksum",
            responseCode: queryResponse?.vnp_ResponseCode ?? null,
            transactionStatus: queryResponse?.vnp_TransactionStatus ?? null,
        };
    }

    const payload = verificationResult.payload;
    const resolvedStatus = mapQueryOutcomeStatus(payload);

    if (payload?.vnp_ResponseCode === "91") {
        return {
            ...baseResult,
            status: "not_found",
            responseCode: payload?.vnp_ResponseCode ?? null,
            transactionStatus: payload?.vnp_TransactionStatus ?? null,
            message: payload?.vnp_Message ?? null,
        };
    }

    if (resolvedStatus === "api_error") {
        return {
            ...baseResult,
            status: "api_error",
            responseCode: payload?.vnp_ResponseCode ?? null,
            transactionStatus: payload?.vnp_TransactionStatus ?? null,
            message: payload?.vnp_Message ?? null,
        };
    }

    if (resolvedStatus === "pending") {
        return {
            ...baseResult,
            status: "pending",
            responseCode: payload?.vnp_ResponseCode ?? null,
            transactionStatus: payload?.vnp_TransactionStatus ?? null,
        };
    }

    await reconcilePersistedVnpayResult({
        inventoryAdapter,
        logger,
        order,
        orderAdapter,
        payment,
        paymentRepository,
        payload: {
            ...payload,
            vnp_TxnRef:
                payload?.vnp_TxnRef ??
                payment.providerTxnRef ??
                payment.paymentCode,
        },
    });

    return {
        ...baseResult,
        status: resolvedStatus,
        responseCode: payload?.vnp_ResponseCode ?? null,
        transactionStatus: payload?.vnp_TransactionStatus ?? null,
    };
}

export function createReconcilePendingVnpayPaymentsService({
    env = process.env,
    fetchFn = globalThis.fetch,
    inventoryAdapter,
    logger = console,
    orderAdapter,
    paymentRepository,
} = {}) {
    return async function reconcilePendingVnpayPayments({
        ipAddr = "127.0.0.1",
        limit = 50,
        maxAgeHours = 48,
        minAgeMinutes = 2,
    } = {}) {
        const resolvedConfig = ensureVnpayQueryConfig(
            resolveVnpayConfig({
                env,
            })
        );
        const now = new Date();
        const normalizedLimit = normalizePositiveInteger(limit, 50);
        const normalizedMaxAgeHours = normalizePositiveInteger(maxAgeHours, 48);
        const normalizedMinAgeMinutes = normalizePositiveInteger(minAgeMinutes, 2);
        const createdAfter = new Date(
            now.getTime() - normalizedMaxAgeHours * 60 * 60 * 1000
        );
        const createdBefore = new Date(
            now.getTime() - normalizedMinAgeMinutes * 60 * 1000
        );
        const pendingPayments = await paymentRepository.findPayments({
            filter: {
                provider: "vnpay",
                status: "pending",
                createdAt: {
                    $gte: createdAfter,
                    $lte: createdBefore,
                },
            },
            sort: {
                createdAt: 1,
            },
            limit: normalizedLimit,
        });

        const results = [];
        const counts = {
            paid: 0,
            failed: 0,
            pending: 0,
            not_found: 0,
            api_error: 0,
            invalid_checksum: 0,
            skipped: 0,
            error: 0,
        };

        for (const payment of pendingPayments) {
            try {
                const order = await orderAdapter.findOrderById({
                    orderId: payment.orderId,
                });

                    if (!order) {
                        counts.not_found += 1;
                        results.push({
                        paymentCode: payment?.paymentCode ?? null,
                        orderCode: payment?.orderCode ?? null,
                        providerTxnRef: payment?.providerTxnRef ?? null,
                        status: "not_found",
                        message: "Order not found for payment reconciliation",
                    });
                    continue;
                }

                const result = await reconcileSinglePendingVnpayPayment({
                    fetchFn,
                    inventoryAdapter,
                    ipAddr,
                    logger,
                    now,
                    order,
                    orderAdapter,
                    payment,
                    paymentRepository,
                    resolvedConfig,
                });
                counts[result.status] += 1;
                results.push(result);
            } catch (error) {
                counts.error += 1;
                logger.error?.("Failed to reconcile pending VNPAY payment", {
                    paymentCode: payment?.paymentCode ?? null,
                    providerTxnRef: payment?.providerTxnRef ?? null,
                    error: {
                        message: error?.message ?? "Unknown error",
                        code: error?.code ?? null,
                    },
                });
                results.push({
                    paymentCode: payment?.paymentCode ?? null,
                    orderCode: payment?.orderCode ?? null,
                    providerTxnRef: payment?.providerTxnRef ?? null,
                    status: "error",
                    message: error?.message ?? "Unknown error",
                });
            }
        }

        return {
            scanned: pendingPayments.length,
            counts,
            results,
        };
    };
}
