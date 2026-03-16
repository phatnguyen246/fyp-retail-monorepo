import { createOrderDetailView } from "../utils/index.js";
import { assertOrderExists } from "./ordering-service.helpers.js";

export function createGetAdminOrderDetailService({
    orderRepository,
    validation,
} = {}) {
    return async function getAdminOrderDetail({ orderId } = {}) {
        const parsedParams = validation.parseOrderIdParams({
            orderId,
        });
        const order = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        assertOrderExists(order, parsedParams.orderId);

        return createOrderDetailView(order);
    };
}
