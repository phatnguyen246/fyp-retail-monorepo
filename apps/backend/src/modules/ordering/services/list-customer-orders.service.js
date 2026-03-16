import { createOrderSummaryView } from "../utils/index.js";
import {
    assertCustomerRequester,
    createOrderRequester,
} from "./ordering-service.helpers.js";

export function createListCustomerOrdersService({ orderRepository } = {}) {
    return async function listCustomerOrders({ requester } = {}) {
        const normalizedRequester = createOrderRequester(requester);

        assertCustomerRequester(normalizedRequester);

        const orders = await orderRepository.findOrdersByFilter({
            filter: {
                accountId: normalizedRequester.accountId,
            },
            sort: {
                createdAt: -1,
            },
        });

        return orders.map((order) => createOrderSummaryView(order));
    };
}
