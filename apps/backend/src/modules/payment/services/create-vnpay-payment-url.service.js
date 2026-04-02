import { createVnpayPaymentUrl as buildVnpayPaymentUrl } from "../adapters/gateway/vnpay.client.js";
import { addMinutes, formatDateYmdHis } from "../utils/vnpay-date.util.js";
import {
    buildVnpayOrderInfo,
    isPaymentTerminalStatus,
    resolveVnpayConfig,
} from "../utils/index.js";
import {
    assertOrderAccessibleForCreateUrl,
    assertOrderEligibleForVnpayUrl,
    ensureVnpayConfig,
} from "./payment-service.helpers.js";
import { createPaymentConflictError } from "./payment-service.errors.js";

export function createCreateVnpayPaymentUrlService({
    checkoutAdapter,
    env = process.env,
    orderAdapter,
    paymentRepository,
    validation,
} = {}) {
    return async function createVnpayPaymentUrl({
        input,
        requester,
        ipAddr,
    } = {}) {
        const parsedInput = validation.parseCreateVnpayPaymentUrlInput(input ?? {});
        const order =
            parsedInput.orderId !== null
                ? await orderAdapter.findOrderById({
                      orderId: parsedInput.orderId,
                  })
                : await orderAdapter.findOrderByCode({
                      orderCode: parsedInput.orderCode,
                  });

        assertOrderEligibleForVnpayUrl(
            assertOrderAccessibleForCreateUrl({
                order,
                requester,
                reference: parsedInput.orderId ?? parsedInput.orderCode,
            })
        );

        let payment = await paymentRepository.findLatestPaymentByOrderId({
            orderId: order._id,
        });

        if (!payment) {
            payment = await checkoutAdapter.createInitialPaymentForOrder({
                order,
            });
        }

        if (!payment || payment.provider !== "vnpay") {
            throw createPaymentConflictError(
                "Expected a VNPAY payment record for the order",
                {
                    orderId: order._id.toHexString(),
                }
            );
        }

        if (isPaymentTerminalStatus(payment.status)) {
            throw createPaymentConflictError(
                `Payment is already terminal: ${payment.status}`,
                {
                    orderId: order._id.toHexString(),
                    paymentStatus: payment.status,
                }
            );
        }

        const config = ensureVnpayConfig(
            resolveVnpayConfig({
                env,
            })
        );
        const now = new Date();
        const createDate = formatDateYmdHis(now);
        const expireDate = formatDateYmdHis(addMinutes(now, config.expireMinutes));
        const orderInfo = payment.orderInfo ?? buildVnpayOrderInfo(order);
        const paymentUrl = buildVnpayPaymentUrl({
            paymentUrl: config.paymentUrl,
            tmnCode: config.tmnCode,
            hashSecret: config.hashSecret,
            version: config.version,
            returnUrl: config.returnUrl,
            txnRef: payment.providerTxnRef ?? payment.paymentCode,
            amount: order.grandTotal,
            orderInfo,
            orderType: config.orderType,
            ipAddr,
            locale: config.locale,
            currency: payment.currency ?? config.currency ?? "VND",
            createDate,
            expireDate,
            bankCode: parsedInput.bankCode,
        });

        if (
            payment.orderInfo !== orderInfo ||
            payment.providerTxnRef !== payment.paymentCode ||
            payment.providerTransactionDate !== createDate
        ) {
            await paymentRepository.updatePaymentById({
                paymentId: payment._id,
                set: {
                    orderInfo,
                    providerTxnRef: payment.paymentCode,
                    providerTransactionDate: createDate,
                    updatedAt: now,
                },
            });
        }

        return {
            orderId: order._id.toHexString(),
            orderCode: order.orderCode,
            paymentCode: payment.paymentCode,
            paymentUrl,
        };
    };
}
