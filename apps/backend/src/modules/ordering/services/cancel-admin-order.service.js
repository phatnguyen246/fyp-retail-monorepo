import { createOrderDetailView } from "../utils/index.js";
import {
    assertOrderCancelable,
    assertOrderExists,
    buildOrderStatusLog,
    createOrderRequester,
    rollbackIncrementedStock,
} from "./ordering-service.helpers.js";

export function createCancelAdminOrderService({
    inventoryAdapter,
    orderRepository,
    validation,
    logger = console,
} = {}) {
    return async function cancelAdminOrder({ orderId, requester } = {}) {
        const parsedParams = validation.parseOrderIdParams({
            orderId,
        });
        const normalizedRequester = createOrderRequester(requester);
        const order = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        assertOrderCancelable(assertOrderExists(order, parsedParams.orderId));

        const restockedItems = [];

        try {
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

            const timestamp = new Date();

            await orderRepository.updateOrderByIdWithOperators({
                orderId: parsedParams.orderId,
                update: {
                    $set: {
                        orderStatus: "cancelled",
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

        return createOrderDetailView(updatedOrder);
    };
}
