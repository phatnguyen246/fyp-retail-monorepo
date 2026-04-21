import { sendOrderingSuccess } from "./ordering-response.js";

function createRequester(req) {
    return {
        isAuthenticated: req.isAuthenticated === true,
        accountId: req.accountId ?? null,
        role: req.role ?? "guest",
    };
}

export function createOrderingAdminController({ services }) {
    return {
        async listOrders(req, res) {
            const result = await services.listAdminOrders({
                query: req.query,
            });

            return sendOrderingSuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },

        async getOrderDetail(req, res) {
            const order = await services.getAdminOrderDetail({
                orderId: req.params.orderId,
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },

        async updateOrderStatus(req, res) {
            const order = await services.updateAdminOrderStatus({
                orderId: req.params.orderId,
                requester: createRequester(req),
                input: req.body,
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },

        async cancelOrder(req, res) {
            const order = await services.cancelAdminOrder({
                orderId: req.params.orderId,
                requester: createRequester(req),
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },
    };
}
