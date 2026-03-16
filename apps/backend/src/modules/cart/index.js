import { createCartAdapters } from "./adapters/index.js";
import { CART_BASE_PATH } from "./constants/index.js";
import { createCartController } from "./http/cart.controller.js";
import { createCartRouter } from "./http/cart.routes.js";
import { createCartServices } from "./services/index.js";

export function registerCartModule({
    app,
    db,
    adapters = createCartAdapters({ db }),
    services = createCartServices({ adapters }),
} = {}) {
    const controller = createCartController({ services });
    const router = createCartRouter({ controller });

    app.use(CART_BASE_PATH, router);

    return {
        adapters,
        services,
        controller,
        router,
    };
}
