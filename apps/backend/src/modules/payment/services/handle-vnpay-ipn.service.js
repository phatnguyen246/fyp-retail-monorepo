import { verifyVnpayCallback } from "../adapters/gateway/vnpay.client.js";
import {
    resolveVnpayConfig,
} from "../utils/index.js";
import {
    ensureVnpayConfig,
    reconcilePersistedVnpayResult,
} from "./payment-service.helpers.js";

export function createHandleVnpayIpnService({
    env = process.env,
    inventoryAdapter,
    logger = console,
    orderAdapter,
    paymentRepository,
} = {}) {
    return async function handleVnpayIpn({ query } = {}) {
        const config = ensureVnpayConfig(
            resolveVnpayConfig({
                env,
            })
        );
        const verifyResult = verifyVnpayCallback(query, config.hashSecret);

        if (!verifyResult.isValid) {
            return {
                RspCode: "97",
                Message: "Fail checksum",
            };
        }

        const payload = verifyResult.payload;
        const payment = await paymentRepository.findPaymentByProviderTxnRef({
            providerTxnRef: payload.vnp_TxnRef,
        });

        if (!payment) {
            return {
                RspCode: "01",
                Message: "Order not found",
            };
        }

        const order = await orderAdapter.findOrderById({
            orderId: payment.orderId,
        });

        if (!order) {
            return {
                RspCode: "01",
                Message: "Order not found",
            };
        }

        await reconcilePersistedVnpayResult({
            inventoryAdapter,
            logger,
            order,
            orderAdapter,
            payment,
            paymentRepository,
            payload,
        });

        return {
            RspCode: "00",
            Message: "success",
        };
    };
}
