import { createOrderDetailView } from "../utils/index.js";
import {
    assertAdminStatusTransition,
    assertOrderExists,
    buildOrderStatusLog,
    createOrderRequester,
} from "./ordering-service.helpers.js";

export function createUpdateAdminOrderStatusService({
    orderRepository,
    validation,
} = {}) {
    return async function updateAdminOrderStatus({
        orderId,
        requester,
        input,
    } = {}) {
        const parsedParams = validation.parseOrderIdParams({
            orderId,
        });
        const parsedInput = validation.parseUpdateOrderStatusInput(input ?? {});
        const normalizedRequester = createOrderRequester(requester);
        const order = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        assertAdminStatusTransition({
            order: assertOrderExists(order, parsedParams.orderId),
            toStatus: parsedInput.orderStatus,
        });

        const timestamp = new Date();

        await orderRepository.updateOrderByIdWithOperators({
            orderId: parsedParams.orderId,
            update: {
                $set: {
                    orderStatus: parsedInput.orderStatus,
                    updatedAt: timestamp,
                },
                $push: {
                    statusLogs: buildOrderStatusLog({
                        fromStatus: order.orderStatus,
                        toStatus: parsedInput.orderStatus,
                        requester: normalizedRequester,
                        changedAt: timestamp,
                    }),
                },
            },
        });

        const updatedOrder = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        return createOrderDetailView(updatedOrder);
    };
}
