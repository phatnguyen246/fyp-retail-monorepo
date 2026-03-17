import express from "express";

export function createPaymentRouter({ controller } = {}) {
    const router = express.Router();

    router.get("/health", controller.getHealth);
    router.post("/vnpay/create-url", controller.createVnpayUrl);

    return router;
}

export function createPaymentCallbackRouter({ controller } = {}) {
    const router = express.Router();

    router.get("/vnpay/ipn", controller.vnpayIpn);
    router.get("/vnpay/return", controller.vnpayReturn);

    return router;
}
