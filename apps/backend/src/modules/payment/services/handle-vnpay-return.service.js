import { verifyVnpayCallback } from "../adapters/gateway/vnpay.client.js";
import { isSuccessfulVnpayPayload, resolveVnpayConfig } from "../utils/index.js";
import { ensureVnpayConfig } from "./payment-service.helpers.js";

export function createHandleVnpayReturnService({
    env = process.env,
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

        return {
            success: isSuccessfulVnpayPayload(payload),
            code: payload.vnp_ResponseCode ?? null,
            transactionStatus: payload.vnp_TransactionStatus ?? null,
            payload,
        };
    };
}
