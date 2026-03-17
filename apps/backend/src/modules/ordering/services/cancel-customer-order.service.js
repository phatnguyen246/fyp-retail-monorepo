import { createOrderDetailView } from "../utils/index.js";
import {
    assertCustomerRequester,
    assertOrderCancelable,
    assertOrderOwnedByCustomer,
    buildOrderStatusLog,
    createOrderRequester,
    rollbackIncrementedStock,
} from "./ordering-service.helpers.js";

export function createCancelCustomerOrderService({
    inventoryAdapter,
    orderRepository,
    paymentCheckoutAdapter,
    validation,
    logger = console,
} = {}) {
    return async function cancelCustomerOrder({ orderId, requester } = {}) {
        const parsedParams = validation.parseOrderIdParams({
            orderId,
        });
        const normalizedRequester = createOrderRequester(requester);

        assertCustomerRequester(normalizedRequester);

        const order = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        assertOrderCancelable(
            assertOrderOwnedByCustomer({
                order,
                requester: normalizedRequester,
                orderId: parsedParams.orderId,
            })
        );

        const restockedItems = [];
        const shouldRestock = order?.stockCommitStatus === "committed";

        try {
            if (shouldRestock) {
                for (const item of order.items ?? []) {
                    try {
                        await inventoryAdapter.incrementStockQuantityByVariantId({
                            variantId: item.variantId,
                            quantity: item.quantity,
                        });
                        restockedItems.push({
                            variantId: item.variantId.toHexString(),
                            quantity: item.quantity,
                        });
                    } catch (error) {
                        if (error?.stockAdjusted === true) {
                            restockedItems.push({
                                variantId: item.variantId.toHexString(),
                                quantity: item.quantity,
                            });
                        }

                        throw error;
                    }
                }
            }

            const timestamp = new Date();
            const nextPaymentStatus =
                order.paymentStatus === "paid" ? "paid" : "cancelled";
            const nextStockCommitStatus = shouldRestock
                ? "released"
                : order.stockCommitStatus ?? "not_committed";

            await orderRepository.updateOrderByIdWithOperators({
                orderId: parsedParams.orderId,
                update: {
                    $set: {
                        orderStatus: "cancelled",
                        paymentStatus: nextPaymentStatus,
                        stockCommitStatus: nextStockCommitStatus,
                        updatedAt: timestamp,
                    },
                    $push: {
                        statusLogs: buildOrderStatusLog({
                            fromStatus: order.orderStatus,
                            toStatus: "cancelled",
                            requester: normalizedRequester,
                            changedAt: timestamp,
                        }),
                    },
                },
            });
        } catch (error) {
            await rollbackIncrementedStock({
                inventoryAdapter,
                adjustedItems: restockedItems,
                logger,
            });
            throw error;
        }

        const updatedOrder = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        if (updatedOrder.paymentStatus === "cancelled") {
            try {
                await paymentCheckoutAdapter.markPendingPaymentCancelled({
                    orderId: updatedOrder._id,
                });
            } catch (error) {
                logger.error?.("Failed to cancel pending payment record after order cancellation", {
                    orderId: updatedOrder._id.toHexString(),
                    error: {
                        message: error?.message ?? "Unknown error",
                        code: error?.code ?? null,
                    },
                });
            }
        }

        return createOrderDetailView(updatedOrder);
    };
}
