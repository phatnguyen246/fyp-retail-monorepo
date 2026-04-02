import { createPaymentAdapters } from "./adapters/index.js";
import {
    PAYMENT_CALLBACK_BASE_PATH,
    PAYMENTS_BASE_PATH,
} from "./constants/index.js";
import { createPaymentController } from "./http/payment.controller.js";
import {
    createPaymentAdminRouter,
    createPaymentCallbackRouter,
    createPaymentRouter,
} from "./http/payment.routes.js";
import { createPaymentServices } from "./services/index.js";

export function registerPaymentModule({
    app,
    adminMiddleware,
    db,
    env = process.env,
    logger = console,
} = {}) {
    const adapters = createPaymentAdapters({
        db,
        env,
    });
    const services = createPaymentServices({
        adapters,
        env,
        logger,
    });
    const controller = createPaymentController({
        logger,
        services,
    });
    const router = createPaymentRouter({
        controller,
    });
    const callbackRouter = createPaymentCallbackRouter({
        controller,
    });
    const adminRouter = createPaymentAdminRouter({
        controller,
    });

    app.use(PAYMENTS_BASE_PATH, router);
    app.use(PAYMENT_CALLBACK_BASE_PATH, callbackRouter);
    if (adminMiddleware) {
        app.use(`/admin${PAYMENTS_BASE_PATH}`, adminMiddleware, adminRouter);
    }

    return {
        adapters,
        services,
        controller,
        router,
        adminRouter,
        callbackRouter,
    };
}
