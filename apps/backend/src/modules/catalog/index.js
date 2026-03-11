import { createCatalogServices } from "./services/index.js";
import { createCatalogController } from "./http/catalog.controller.js";
import { createCatalogRouter } from "./http/catalog.routes.js";
import { CATALOG_BASE_PATH } from "./constants/index.js";

export function registerCatalogModule(app) {
    const services = createCatalogServices();
    const controller = createCatalogController({ services });
    const router = createCatalogRouter({ controller });

    app.use(CATALOG_BASE_PATH, router);

    return { services, controller, router };
}
