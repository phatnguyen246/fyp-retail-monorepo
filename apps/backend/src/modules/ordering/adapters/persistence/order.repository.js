import { ORDER_COLLECTIONS } from "../../constants/index.js";
import { createOrderingBaseRepository } from "./ordering-base.repository.js";

export function createOrderRepository({
    db,
    baseRepository = createOrderingBaseRepository({ db }),
} = {}) {
    return {
        createOrder({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: ORDER_COLLECTIONS.orders,
                document,
                options,
            });
        },

        findOrderById({ orderId, projection } = {}) {
            return baseRepository.findOneById({
                collectionName: ORDER_COLLECTIONS.orders,
                id: orderId,
                projection,
            });
        },

        findOrderByCode({ orderCode, projection } = {}) {
            return baseRepository.findOneByField({
                collectionName: ORDER_COLLECTIONS.orders,
                fieldName: "orderCode",
                value: orderCode,
                projection,
            });
        },

        findOrdersByFilter({ filter = {}, projection, sort, limit } = {}) {
            return baseRepository.findManyByFilter({
                collectionName: ORDER_COLLECTIONS.orders,
                filter,
                projection,
                sort,
                limit,
            });
        },

        updateOrderById({ orderId, set, options } = {}) {
            return baseRepository.updateOneById({
                collectionName: ORDER_COLLECTIONS.orders,
                id: orderId,
                set,
                options,
            });
        },

        updateOrderByIdWithOperators({ orderId, update, options } = {}) {
            return baseRepository.updateOneByIdWithOperators({
                collectionName: ORDER_COLLECTIONS.orders,
                id: orderId,
                update,
                options,
            });
        },

        deleteOrderById({ orderId, options } = {}) {
            return baseRepository.deleteOneById({
                collectionName: ORDER_COLLECTIONS.orders,
                id: orderId,
                options,
            });
        },
    };
}
