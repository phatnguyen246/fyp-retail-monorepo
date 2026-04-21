import { createOrderingAdapters } from "../adapters/index.js";
import { createOrderingHealthPayload } from "../utils/index.js";
import { createOrderingValidation } from "../validation/index.js";
import { createCancelAdminOrderService } from "./cancel-admin-order.service.js";
import { createCancelCustomerOrderService } from "./cancel-customer-order.service.js";
import { createCreateOrderService } from "./create-order.service.js";
import { createGetAdminOrderDetailService } from "./get-admin-order-detail.service.js";
import { createGetOrderDetailService } from "./get-order-detail.service.js";
import { createListAdminOrdersService } from "./list-admin-orders.service.js";
import { createListCustomerOrdersService } from "./list-customer-orders.service.js";
import { createLookupGuestOrderService } from "./lookup-guest-order.service.js";
import { createUpdateAdminOrderStatusService } from "./update-admin-order-status.service.js";

export { createCancelAdminOrderService } from "./cancel-admin-order.service.js";
export { createCancelCustomerOrderService } from "./cancel-customer-order.service.js";
export { createCreateOrderService } from "./create-order.service.js";
export { createGetAdminOrderDetailService } from "./get-admin-order-detail.service.js";
export { createGetOrderDetailService } from "./get-order-detail.service.js";
export { createListAdminOrdersService } from "./list-admin-orders.service.js";
export { createListCustomerOrdersService } from "./list-customer-orders.service.js";
export { createLookupGuestOrderService } from "./lookup-guest-order.service.js";
export { createUpdateAdminOrderStatusService } from "./update-admin-order-status.service.js";

export function createOrderingServices({
    adapters = createOrderingAdapters(),
    validation = createOrderingValidation(),
    sendEmail,
    logger = console,
} = {}) {
    const cartAdapter = adapters?.cart;
    const catalogAdapter = adapters?.catalog;
    const inventoryAdapter = adapters?.inventory;
    const paymentCheckoutAdapter = adapters?.payment ?? {
        async createInitialPaymentForOrder() {
            return null;
        },
        async markPendingPaymentCancelled() {
            return null;
        },
    };
    const orderRepository = adapters?.persistence?.orderRepository;

    return {
        getHealth() {
            return createOrderingHealthPayload();
        },
        createOrder: createCreateOrderService({
            cartAdapter,
            catalogAdapter,
            inventoryAdapter,
            orderRepository,
            paymentCheckoutAdapter,
            validation,
            sendEmail,
            logger,
        }),
        listCustomerOrders: createListCustomerOrdersService({
            orderRepository,
        }),
        getOrderDetail: createGetOrderDetailService({
            orderRepository,
            validation,
        }),
        lookupGuestOrder: createLookupGuestOrderService({
            orderRepository,
            validation,
        }),
        cancelCustomerOrder: createCancelCustomerOrderService({
            inventoryAdapter,
            orderRepository,
            paymentCheckoutAdapter,
            validation,
            logger,
        }),
        listAdminOrders: createListAdminOrdersService({
            orderRepository,
        }),
        getAdminOrderDetail: createGetAdminOrderDetailService({
            orderRepository,
            validation,
        }),
        updateAdminOrderStatus: createUpdateAdminOrderStatusService({
            orderRepository,
            validation,
        }),
        cancelAdminOrder: createCancelAdminOrderService({
            inventoryAdapter,
            orderRepository,
            paymentCheckoutAdapter,
            validation,
            logger,
        }),
    };
}
