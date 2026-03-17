import {
    DEFAULT_PAYMENT_CURRENCY,
    PAYMENT_PROVIDERS,
} from "../../constants/index.js";
import { createPayment } from "../../models/index.js";
import { generatePaymentCode } from "../../utils/payment-code.util.js";
import { buildVnpayOrderInfo, toIdString } from "../../utils/index.js";
import { createPaymentPersistence } from "../persistence/index.js";

export function createPaymentCheckoutAdapter({
    db,
    env = process.env,
    persistence = createPaymentPersistence({ db }),
    paymentCodeGenerator = generatePaymentCode,
    maxAttempts = 5,
} = {}) {
    const paymentRepository = persistence?.paymentRepository;

    return {
        async createInitialPaymentForOrder({ order } = {}) {
            const existingPayment = await paymentRepository.findLatestPaymentByOrderId({
                orderId: order?._id,
            });

            if (existingPayment) {
                return existingPayment;
            }

            const timestamp = new Date();
            const isVnpayPayment = order?.paymentMethod === "vnpay";

            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                const paymentCode = paymentCodeGenerator({
                    timestamp,
                });
                const document = createPayment({
                    paymentCode,
                    orderId: order?._id,
                    orderCode: order?.orderCode,
                    paymentMethod: order?.paymentMethod,
                    provider: isVnpayPayment
                        ? PAYMENT_PROVIDERS[1]
                        : PAYMENT_PROVIDERS[0],
                    amount: order?.grandTotal ?? 0,
                    currency: env.VNP_CURRENCY ?? DEFAULT_PAYMENT_CURRENCY,
                    status: "pending",
                    providerTxnRef: isVnpayPayment ? paymentCode : null,
                    orderInfo: isVnpayPayment ? buildVnpayOrderInfo(order) : null,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                });

                try {
                    await paymentRepository.createPayment({
                        document,
                    });

                    return {
                        ...document,
                        id: toIdString(document._id),
                    };
                } catch (error) {
                    if (error?.code !== 11000 || attempt === maxAttempts - 1) {
                        throw error;
                    }
                }
            }

            throw new Error("Unable to create initial payment");
        },

        async markPendingPaymentCancelled({ orderId } = {}) {
            const payment = await paymentRepository.findLatestPaymentByOrderId({
                orderId,
            });

            if (!payment || payment.status === "paid") {
                return payment ?? null;
            }

            const updatedAt = new Date();

            await paymentRepository.updatePaymentById({
                paymentId: payment._id,
                set: {
                    status: "cancelled",
                    failedAt: updatedAt,
                    updatedAt,
                },
            });

            return paymentRepository.findPaymentById({
                paymentId: payment._id,
            });
        },
    };
}
