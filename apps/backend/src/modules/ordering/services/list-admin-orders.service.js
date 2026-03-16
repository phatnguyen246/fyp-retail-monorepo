import { createOrderSummaryView } from "../utils/index.js";

export function createListAdminOrdersService({ orderRepository } = {}) {
    return async function listAdminOrders() {
        const orders = await orderRepository.findOrdersByFilter({
            sort: {
                createdAt: -1,
            },
        });

        return orders.map((order) => createOrderSummaryView(order));
    };
}
