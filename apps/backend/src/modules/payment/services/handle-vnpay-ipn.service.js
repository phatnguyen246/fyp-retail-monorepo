import { verifyVnpayCallback } from "../adapters/gateway/vnpay.client.js";
import {
    isSuccessfulVnpayPayload,
    mapVnpayFailureStatus,
    resolveVnpayConfig,
} from "../utils/index.js";
import {
    buildPaymentProviderFields,
    ensureVnpayConfig,
    rollbackDecrementedStock,
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

        const now = new Date();

        if (isSuccessfulVnpayPayload(payload)) {
            await paymentRepository.updatePaymentByIdWithOperators({
                paymentId: payment._id,
                update: {
                    $set: {
                        status: "paid",
                        ...buildPaymentProviderFields(payload),
                        failedAt: null,
                        paidAt: now,
                        updatedAt: now,
                    },
                },
            });

            if (order.orderStatus === "cancelled") {
                return {
                    RspCode: "00",
                    Message: "success",
                };
            }

            if (
                order.paymentStatus === "paid" &&
                order.stockCommitStatus === "committed"
            ) {
                return {
                    RspCode: "00",
                    Message: "success",
                };
            }

            const adjustedItems = [];

            try {
                if (order.stockCommitStatus !== "committed") {
                    for (const item of order.items ?? []) {
                        const updatedInventory =
                            await inventoryAdapter.decrementStockQuantityByVariantIdIfAvailable(
                                {
                                    variantId: item.variantId,
                                    quantity: item.quantity,
                                }
                            );

                        if (!updatedInventory) {
                            throw new Error(
                                `Inventory changed after payment success for variant: ${item.variantId.toHexString()}`
                            );
                        }

                        adjustedItems.push({
                            variantId: item.variantId.toHexString(),
                            quantity: item.quantity,
                        });
                    }
                }

                await orderAdapter.updateOrderByIdWithOperators({
                    orderId: order._id,
                    update: {
                        $set: {
                            paymentStatus: "paid",
                            stockCommitStatus: "committed",
                            updatedAt: now,
                        },
                    },
                });
            } catch (error) {
                await rollbackDecrementedStock({
                    inventoryAdapter,
                    adjustedItems,
                    logger,
                });
                throw error;
            }

            return {
                RspCode: "00",
                Message: "success",
            };
        }

        const mappedStatus = mapVnpayFailureStatus(payload);

        if (payment.status === "paid") {
            return {
                RspCode: "00",
                Message: "success",
            };
        }

        await paymentRepository.updatePaymentByIdWithOperators({
            paymentId: payment._id,
            update: {
                $set: {
                    status: mappedStatus,
                    ...buildPaymentProviderFields(payload),
                    failedAt: now,
                    updatedAt: now,
                },
            },
        });

        if (order.orderStatus !== "cancelled" && order.paymentStatus !== "paid") {
            await orderAdapter.updateOrderByIdWithOperators({
                orderId: order._id,
                update: {
                    $set: {
                        paymentStatus: mappedStatus,
                        updatedAt: now,
                    },
                },
            });
        }

        return {
            RspCode: "00",
            Message: "success",
        };
    };
}
