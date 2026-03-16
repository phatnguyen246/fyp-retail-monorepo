import { createInventoryAdapters } from "./adapters/index.js";
import {
    INVENTORY_ADMIN_BASE_PATH,
    INVENTORY_BASE_PATH,
} from "./constants/index.js";
import { createInventoryAdminController } from "./http/inventory-admin.controller.js";
import { createInventoryAdminRouter } from "./http/inventory-admin.routes.js";
import { createInventoryController } from "./http/inventory.controller.js";
import { createInventoryRouter } from "./http/inventory.routes.js";
import { createInventoryServices } from "./services/index.js";

function passThroughMiddleware(_req, _res, next) {
    next();
}

export function registerInventoryModule({
    app,
    db,
    adminMiddleware = passThroughMiddleware,
} = {}) {
    const adapters = createInventoryAdapters({ db });
    const services = createInventoryServices({ adapters });
    const controller = createInventoryController({ services });
    const adminController = createInventoryAdminController({ services });
    const router = createInventoryRouter({ controller });
    const adminRouter = createInventoryAdminRouter({
        controller: adminController,
    });

    app.use(INVENTORY_BASE_PATH, router);
    app.use(INVENTORY_ADMIN_BASE_PATH, adminMiddleware, adminRouter);

    return {
        adapters,
        services,
        controller,
        adminController,
        router,
        adminRouter,
    };
}
