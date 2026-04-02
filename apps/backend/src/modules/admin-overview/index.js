import { ADMIN_OVERVIEW_BASE_PATH } from "./constants/index.js";
import { createAdminOverviewController } from "./http/admin-overview.controller.js";
import { createAdminOverviewRouter } from "./http/admin-overview.routes.js";
import { createAdminOverviewServices } from "./services/index.js";

function passThroughMiddleware(_req, _res, next) {
    next();
}

export function registerAdminOverviewModule({
    app,
    db,
    adminMiddleware = passThroughMiddleware,
} = {}) {
    const services = createAdminOverviewServices({ db });
    const controller = createAdminOverviewController({ services });
    const router = createAdminOverviewRouter({ controller });

    app.use(ADMIN_OVERVIEW_BASE_PATH, adminMiddleware, router);

    return {
        services,
        controller,
        router,
    };
}
