import { createCatalogServices } from "./services/index.js";
import { createCatalogController } from "./http/catalog.controller.js";
import { createCatalogRouter } from "./http/catalog.routes.js";
import { CATALOG_BASE_PATH } from "./constants/index.js";
import { createCatalogAdapters } from "./adapters/index.js";

export function registerCatalogModule({ app, db, storage }) {
    const adapters = createCatalogAdapters({ db, storage });
    const services = createCatalogServices({ adapters });
    const controller = createCatalogController({ services });
    const router = createCatalogRouter({ controller });

    app.use(CATALOG_BASE_PATH, router);

    return { adapters, services, controller, router };
}
