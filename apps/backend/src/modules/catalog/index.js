import { createCatalogServices } from "./services/index.js";
import { createCatalogController } from "./http/catalog.controller.js";
import { createCatalogAdminRouter } from "./http/catalog-admin.routes.js";
import { createCatalogRouter } from "./http/catalog.routes.js";
import {
    CATALOG_ADMIN_BASE_PATH,
    CATALOG_BASE_PATH,
} from "./constants/index.js";
import { createCatalogAdapters } from "./adapters/index.js";

export function registerCatalogModule({ app, db, storage }) {
    const adapters = createCatalogAdapters({ db, storage });
    const services = createCatalogServices({ adapters });
    const controller = createCatalogController({ services });
    const router = createCatalogRouter({ controller });
    const adminRouter = createCatalogAdminRouter({ controller });

    app.use(CATALOG_BASE_PATH, router);
    app.use(CATALOG_ADMIN_BASE_PATH, adminRouter);

    return { adapters, services, controller, router, adminRouter };
}
