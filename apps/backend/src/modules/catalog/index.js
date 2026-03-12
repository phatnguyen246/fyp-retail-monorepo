import { createCatalogServices } from "./services/index.js";
import { createCatalogAdminController } from "./http/catalog-admin.controller.js";
import { createCatalogAdminRouter } from "./http/catalog-admin.routes.js";
import { createCatalogRouter } from "./http/catalog.routes.js";
import { createCatalogStorefrontController } from "./http/catalog-storefront.controller.js";
import {
    CATALOG_ADMIN_BASE_PATH,
    CATALOG_BASE_PATH,
} from "./constants/index.js";
import { createCatalogAdapters } from "./adapters/index.js";

export function registerCatalogModule({ app, db, storage }) {
    const adapters = createCatalogAdapters({ db, storage });
    const services = createCatalogServices({ adapters });
    const storefrontController = createCatalogStorefrontController({ services });
    const adminController = createCatalogAdminController({ services });
    const router = createCatalogRouter({ controller: storefrontController });
    const adminRouter = createCatalogAdminRouter({ controller: adminController });

    app.use(CATALOG_BASE_PATH, router);
    app.use(CATALOG_ADMIN_BASE_PATH, adminRouter);

    return {
        adapters,
        services,
        storefrontController,
        adminController,
        router,
        adminRouter,
    };
}
