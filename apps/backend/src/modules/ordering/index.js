import { createOrderingAdapters } from "./adapters/index.js";
import {
    ORDERS_ADMIN_BASE_PATH,
    ORDERS_BASE_PATH,
} from "./constants/index.js";
import { createOrderingAdminController } from "./http/ordering-admin.controller.js";
import { createOrderingAdminRouter } from "./http/ordering-admin.routes.js";
import { createOrderingController } from "./http/ordering.controller.js";
import { createOrderingRouter } from "./http/ordering.routes.js";
import { createOrderingServices } from "./services/index.js";

function passThroughMiddleware(_req, _res, next) {
    next();
}

export function registerOrderingModule({
    app,
    db,
    cartOrderReader,
    paymentCheckoutAdapter,
    requireAuthMiddleware = passThroughMiddleware,
    adminMiddleware = passThroughMiddleware,
    logger = console,
} = {}) {
    const adapters = createOrderingAdapters({
        db,
        cartOrderReader,
        paymentCheckoutAdapter,
    });
    const services = createOrderingServices({
        adapters,
        logger,
    });
    const controller = createOrderingController({
        services,
    });
    const adminController = createOrderingAdminController({
        services,
    });
    const router = createOrderingRouter({
        controller,
        requireAuthMiddleware,
    });
    const adminRouter = createOrderingAdminRouter({
        controller: adminController,
    });

    app.get("/order/health", controller.getHealth);
    app.use(ORDERS_BASE_PATH, router);
    app.use(ORDERS_ADMIN_BASE_PATH, adminMiddleware, adminRouter);

    return {
        adapters,
        services,
        controller,
        adminController,
        router,
        adminRouter,
    };
}
