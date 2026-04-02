import { sendOrderingSuccess } from "./ordering-response.js";

function createRequester(req) {
    return {
        isAuthenticated: req.isAuthenticated === true,
        accountId: req.accountId ?? null,
        role: req.role ?? "guest",
    };
}

export function createOrderingController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async createOrder(req, res) {
            const order = await services.createOrder({
                owner: req.orderCartOwner ?? null,
                requester: createRequester(req),
                input: req.body,
            });

            return sendOrderingSuccess(res, {
                status: 201,
                data: order,
            });
        },

        async listOrders(req, res) {
            const orders = await services.listCustomerOrders({
                requester: createRequester(req),
            });

            return sendOrderingSuccess(res, {
                data: orders,
            });
        },

        async getOrderDetail(req, res) {
            const order = await services.getOrderDetail({
                orderId: req.params.orderId,
                requester: createRequester(req),
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },

        async lookupGuestOrder(req, res) {
            const order = await services.lookupGuestOrder({
                input: req.body,
                requester: createRequester(req),
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },

        async cancelOrder(req, res) {
            const order = await services.cancelCustomerOrder({
                orderId: req.params.orderId,
                requester: createRequester(req),
            });

            return sendOrderingSuccess(res, {
                data: order,
            });
        },
    };
}
