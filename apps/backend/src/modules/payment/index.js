import { createPaymentAdapters } from "./adapters/index.js";
import {
    PAYMENT_CALLBACK_BASE_PATH,
    PAYMENTS_BASE_PATH,
} from "./constants/index.js";
import { createPaymentController } from "./http/payment.controller.js";
import {
    createPaymentCallbackRouter,
    createPaymentRouter,
} from "./http/payment.routes.js";
import { createPaymentServices } from "./services/index.js";

export function registerPaymentModule({
    app,
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

    app.use(PAYMENTS_BASE_PATH, router);
    app.use(PAYMENT_CALLBACK_BASE_PATH, callbackRouter);

    return {
        adapters,
        services,
        controller,
        router,
        callbackRouter,
    };
}
