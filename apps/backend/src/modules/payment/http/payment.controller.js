import { getClientIp } from "../utils/client-ip.util.js";
import { sendPaymentSuccess } from "./payment-response.js";

function createRequester(req) {
    return {
        isAuthenticated: req.isAuthenticated === true,
        accountId: req.accountId ?? null,
        role: req.role ?? "guest",
    };
}

export function createPaymentController({
    logger = console,
    services,
} = {}) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async createVnpayUrl(req, res, next) {
            try {
                const result = await services.createVnpayPaymentUrl({
                    input: req.body,
                    requester: createRequester(req),
                    ipAddr: getClientIp(req),
                });

                return sendPaymentSuccess(res, {
                    data: result,
                });
            } catch (error) {
                return next(error);
            }
        },

        async adminReconcileVnpayPayment(req, res, next) {
            try {
                const result = await services.adminReconcileVnpayPayment({
                    orderId: req.params.orderId,
                    ipAddr: getClientIp(req),
                });

                return sendPaymentSuccess(res, {
                    data: result,
                });
            } catch (error) {
                return next(error);
            }
        },

        async vnpayReturn(req, res, next) {
            try {
                const result = await services.handleVnpayReturn({
                    query: req.query,
                });

                return res.status(200).json(result);
            } catch (error) {
                return next(error);
            }
        },

        async vnpayIpn(req, res) {
            try {
                const result = await services.handleVnpayIpn({
                    query: req.query,
                });

                return res.status(200).json(result);
            } catch (error) {
                logger.error?.("VNPAY IPN handling failed", {
                    error: {
                        message: error?.message ?? "Unknown error",
                        code: error?.code ?? null,
                    },
                });

                return res.status(200).json({
                    RspCode: "99",
                    Message: "Internal error",
                });
            }
        },
    };
}
