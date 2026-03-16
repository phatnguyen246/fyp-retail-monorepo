import {
    createOrder,
    createOrderItem,
    createOrderStatusLog,
    ORDER_DOCUMENT_SHAPE,
    ORDER_ITEM_DOCUMENT_SHAPE,
    ORDER_STATUS_LOG_DOCUMENT_SHAPE,
} from "./order.model.js";

export {
    createOrder,
    createOrderItem,
    createOrderStatusLog,
    ORDER_DOCUMENT_SHAPE,
    ORDER_ITEM_DOCUMENT_SHAPE,
    ORDER_STATUS_LOG_DOCUMENT_SHAPE,
} from "./order.model.js";

export function createOrderingModels() {
    return {
        Order: ORDER_DOCUMENT_SHAPE,
        OrderItem: ORDER_ITEM_DOCUMENT_SHAPE,
        OrderStatusLog: ORDER_STATUS_LOG_DOCUMENT_SHAPE,
        createOrder,
        createOrderItem,
        createOrderStatusLog,
    };
}
