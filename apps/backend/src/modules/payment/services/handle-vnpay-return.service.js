import { verifyVnpayCallback } from "../adapters/gateway/vnpay.client.js";
import { isSuccessfulVnpayPayload, resolveVnpayConfig } from "../utils/index.js";
import { ensureVnpayConfig } from "./payment-service.helpers.js";

export function createHandleVnpayReturnService({
    env = process.env,
    paymentRepository,
} = {}) {
    return async function handleVnpayReturn({ query } = {}) {
        const config = ensureVnpayConfig(
            resolveVnpayConfig({
                env,
            })
        );
        const verifyResult = verifyVnpayCallback(query, config.hashSecret);

        if (!verifyResult.isValid) {
            return {
                success: false,
                code: "97",
                message: "Invalid checksum",
                payload: null,
            };
        }

        const payload = verifyResult.payload;
        const txnRef = payload.vnp_TxnRef ?? null;
        const payment =
            txnRef && paymentRepository
                ? await paymentRepository.findPaymentByProviderTxnRef({
                      providerTxnRef: txnRef,
                      projection: {
                          orderId: 1,
                          orderCode: 1,
                          paymentCode: 1,
                      },
                  })
                : null;

        return {
            success: isSuccessfulVnpayPayload(payload),
            code: payload.vnp_ResponseCode ?? null,
            transactionStatus: payload.vnp_TransactionStatus ?? null,
            orderId: payment?.orderId?.toHexString?.() ?? null,
            orderCode: payment?.orderCode ?? null,
            paymentCode: payment?.paymentCode ?? txnRef,
            payload,
        };
    };
}
