import { resolveVnpayConfig } from "../utils/index.js";
import {
    createPaymentSummaryView,
    ensureVnpayQueryConfig,
} from "./payment-service.helpers.js";
import {
    createPaymentConflictError,
    createPaymentNotFoundError,
} from "./payment-service.errors.js";
import { reconcileSinglePendingVnpayPayment } from "./reconcile-pending-vnpay-payments.service.js";

export function createAdminReconcileVnpayPaymentService({
    env = process.env,
    fetchFn = globalThis.fetch,
    inventoryAdapter,
    logger = console,
    orderAdapter,
    paymentRepository,
} = {}) {
    return async function adminReconcileVnpayPayment({
        ipAddr = "127.0.0.1",
        orderId,
    } = {}) {
        const resolvedConfig = ensureVnpayQueryConfig(
            resolveVnpayConfig({
                env,
            })
        );
        const order = await orderAdapter.findOrderById({
            orderId,
        });

        if (!order) {
            throw createPaymentNotFoundError(`Order not found: ${orderId}`, {
                orderId,
            });
        }

        if (order.paymentMethod !== "vnpay") {
            throw createPaymentConflictError(
                "Order payment method is not vnpay",
                {
                    orderId: order?._id?.toHexString?.() ?? null,
                    paymentMethod: order.paymentMethod ?? null,
                }
            );
        }

        const payment = await paymentRepository.findLatestPaymentByOrderId({
            orderId: order._id,
        });

        if (!payment) {
            throw createPaymentNotFoundError(
                `Payment not found for order: ${order.orderCode}`,
                {
                    orderId: order?._id?.toHexString?.() ?? null,
                    orderCode: order.orderCode ?? null,
                }
            );
        }

        if (payment.provider !== "vnpay") {
            throw createPaymentConflictError(
                "Latest payment record is not a VNPAY payment",
                {
                    orderId: order?._id?.toHexString?.() ?? null,
                    paymentId: payment?._id?.toHexString?.() ?? null,
                    provider: payment.provider ?? null,
                }
            );
        }

        if (payment.status !== "pending") {
            return {
                status: "noop",
                orderId: order._id.toHexString(),
                orderCode: order.orderCode,
                payment: createPaymentSummaryView(payment),
            };
        }

        const result = await reconcileSinglePendingVnpayPayment({
            fetchFn,
            inventoryAdapter,
            ipAddr,
            logger,
            now: new Date(),
            order,
            orderAdapter,
            payment,
            paymentRepository,
            resolvedConfig,
        });
        const updatedPayment = await paymentRepository.findPaymentById({
            paymentId: payment._id,
        });

        return {
            ...result,
            orderId: order._id.toHexString(),
            orderCode: order.orderCode,
            payment: createPaymentSummaryView(updatedPayment ?? payment),
        };
    };
}
