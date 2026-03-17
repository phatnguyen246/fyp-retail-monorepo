import { createOrderingPersistence } from "../../../ordering/adapters/persistence/index.js";

export function createPaymentOrderAdapter({
    db,
    orderingPersistence = createOrderingPersistence({ db }),
} = {}) {
    const orderRepository = orderingPersistence?.orderRepository;

    return {
        findOrderById({ orderId, projection } = {}) {
            return orderRepository.findOrderById({
                orderId,
                projection,
            });
        },

        findOrderByCode({ orderCode, projection } = {}) {
            return orderRepository.findOrderByCode({
                orderCode,
                projection,
            });
        },

        updateOrderByIdWithOperators({ orderId, update, options } = {}) {
            return orderRepository.updateOrderByIdWithOperators({
                orderId,
                update,
                options,
            });
        },
    };
}
