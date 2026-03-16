import { createOrderDetailView } from "../utils/index.js";
import {
    assertOrderAccessibleForPublicDetail,
    createOrderRequester,
} from "./ordering-service.helpers.js";

export function createGetOrderDetailService({
    orderRepository,
    validation,
} = {}) {
    return async function getOrderDetail({ orderId, requester } = {}) {
        const parsedParams = validation.parseOrderIdParams({
            orderId,
        });
        const order = await orderRepository.findOrderById({
            orderId: parsedParams.orderId,
        });

        assertOrderAccessibleForPublicDetail({
            order,
            requester: createOrderRequester(requester),
            orderId: parsedParams.orderId,
        });

        return createOrderDetailView(order);
    };
}
